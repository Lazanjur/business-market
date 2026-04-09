// apps/api/src/modules/auth/auth.service.ts
import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const VALID_COUNTRIES = ['AT','BE','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','PT','SK','SI','ES','NL','GB'];
const ENTITY_TYPES = ['limited_company','public_limited_company','partnership','llp','cooperative','sole_trader','public_authority','ngo'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  // ── REGISTER ─────────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    // B2B/B2G gate — no consumer accounts
    if (!ENTITY_TYPES.includes(dto.entity_type)) {
      throw new BadRequestException(`Invalid entity type: ${dto.entity_type}`);
    }

    // Country gate — 20 countries only
    if (!VALID_COUNTRIES.includes(dto.country_code)) {
      throw new BadRequestException(
        `Country ${dto.country_code} is not currently supported. ` +
        `Platform operates in: ${VALID_COUNTRIES.join(', ')}`
      );
    }

    // Duplicate email check
    const existing = await this.db.queryOne(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [dto.email.toLowerCase()]
    );
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create entity
    const user = await this.db.queryOne(`
      INSERT INTO users (
        email, password_hash, company_name, trading_name, entity_type,
        registration_number, vat_number, country_code,
        preferred_currency, preferred_language
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id, email, company_name, entity_type, country_code,
                regulatory_regime, verification_tier, kyb_status, created_at
    `, [
      dto.email.toLowerCase(), passwordHash, dto.company_name,
      dto.trading_name || null, dto.entity_type, dto.registration_number,
      dto.vat_number || null, dto.country_code,
      dto.country_code === 'GB' ? 'GBP' : 'EUR',
      dto.preferred_language || 'en',
    ]);

    // Trigger KYB verification in background
    this.events.emit('kyb.verification_requested', {
      entityId: user.id,
      registrationNumber: dto.registration_number,
      countryCode: dto.country_code,
    });

    // Trigger sanctions screening
    this.events.emit('sanctions.check_requested', {
      entityId: user.id,
      companyName: dto.company_name,
    });

    this.logger.log(`New entity registered: ${user.id} (${dto.country_code} · ${dto.entity_type})`);

    const tokens = await this.generateTokenPair(user);
    return {
      user: this.sanitiseUser(user),
      ...tokens,
      message: 'Registration successful. KYB verification has been initiated.',
    };
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.db.queryOne(`
      SELECT id, email, password_hash, company_name, entity_type,
             country_code, regulatory_regime, verification_tier,
             kyb_status, trust_score, is_active, is_suspended,
             suspension_reason, role
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
    `, [dto.email.toLowerCase()]);

    if (!user) throw new UnauthorizedException('Invalid email or password');

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) throw new UnauthorizedException('Invalid email or password');

    if (!user.is_active) throw new UnauthorizedException('Account is not active');
    if (user.is_suspended) {
      throw new UnauthorizedException(`Account suspended: ${user.suspension_reason || 'Contact support'}`);
    }

    // Update last login
    await this.db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    const tokens = await this.generateTokenPair(user);
    return {
      user: this.sanitiseUser(user),
      ...tokens,
    };
  }

  // ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.db.queryOne(
        'SELECT id, email, role, verification_tier, kyb_status, is_active, is_suspended FROM users WHERE id = $1',
        [payload.sub]
      );

      if (!user || !user.is_active || user.is_suspended) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokenPair(user);
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ── VALIDATE JWT PAYLOAD (Passport strategy) ──────────────────────────────────
  async validateJwtPayload(payload: any) {
    const user = await this.db.queryOne(`
      SELECT id, email, company_name, entity_type, country_code, regulatory_regime,
             verification_tier, kyb_status, trust_score, role, is_active, is_suspended
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `, [payload.sub]);

    if (!user || !user.is_active || user.is_suspended) return null;
    return user;
  }

  // ── PRIVATE HELPERS ───────────────────────────────────────────────────────────
  private async generateTokenPair(user: any) {
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tier: user.verification_tier,
      regime: user.regulatory_regime,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(jwtPayload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwt.signAsync(jwtPayload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      }),
    ]);

    return { access_token, refresh_token, expires_in: 900 };
  }

  private sanitiseUser(user: any) {
    const { password_hash, ...safe } = user;
    return safe;
  }
}
