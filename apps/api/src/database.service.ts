// apps/api/src/database/database.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.pool = new Pool({
      connectionString: this.config.get<string>('DATABASE_URL'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: this.config.get('NODE_ENV') === 'production'
        ? { rejectUnauthorized: false }
        : false,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle client', err);
    });

    this.pool.on('connect', () => {
      this.logger.debug('New DB connection acquired');
    });

    this.logger.log('PostgreSQL connection pool initialised');
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('PostgreSQL connection pool closed');
  }

  // ── QUERY ─────────────────────────────────────────────────────────────────────
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (duration > 1000) {
        this.logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
      }
      return result;
    } catch (err: any) {
      this.logger.error(`Query error: ${err.message}`, { text: text.substring(0, 200), params });
      throw err;
    }
  }

  // ── QUERY ONE ─────────────────────────────────────────────────────────────────
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  // ── TRANSACTION ───────────────────────────────────────────────────────────────
  async transaction<T>(
    callback: (client: { query: (text: string, params?: any[]) => Promise<QueryResult> }) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback({
        query: (text, params) => client.query(text, params),
      });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── HEALTH CHECK ──────────────────────────────────────────────────────────────
  async healthCheck(): Promise<{ status: string; latency_ms: number }> {
    const start = Date.now();
    await this.pool.query('SELECT 1');
    return { status: 'ok', latency_ms: Date.now() - start };
  }

  // ── PAGINATION HELPER ─────────────────────────────────────────────────────────
  async paginate<T>(
    baseQuery: string,
    params: any[],
    page = 1,
    perPage = 20,
    countQuery?: string,
  ): Promise<{ data: T[]; total: number; page: number; per_page: number; total_pages: number }> {
    const offset = (page - 1) * perPage;
    const dataResult = await this.query<T>(
      `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, perPage, offset]
    );

    let total = 0;
    if (countQuery) {
      const countResult = await this.queryOne<{ count: string }>(countQuery, params);
      total = parseInt(countResult?.count || '0', 10);
    } else {
      total = dataResult.rowCount || 0;
    }

    return {
      data: dataResult.rows,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };
  }

  // ── UPSERT HELPER ─────────────────────────────────────────────────────────────
  async upsert(
    table: string,
    data: Record<string, any>,
    conflictColumns: string[],
    updateColumns?: string[],
  ): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const conflictClause = conflictColumns.join(', ');
    const updateCols = updateColumns || columns.filter(c => !conflictColumns.includes(c));
    const updateClause = updateCols
      .map((col) => `${col} = EXCLUDED.${col}`)
      .join(', ');

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (${conflictClause})
      DO UPDATE SET ${updateClause}, updated_at = NOW()
      RETURNING *
    `;

    return this.queryOne(query, values);
  }

  get client(): Pool {
    return this.pool;
  }
}
