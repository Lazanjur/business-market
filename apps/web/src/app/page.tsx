// apps/web/src/app/page.tsx
'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield, MapPin, Globe2, FileText, Building2,
  ArrowRight, Check, Star, TrendingUp, Zap,
  ChevronRight, Award, Lock, Search
} from 'lucide-react';

const COUNTRY_FLAGS = [
  { code: 'AT', flag: '🇦🇹', name: 'Austria' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgium' },
  { code: 'CY', flag: '🇨🇾', name: 'Cyprus' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'GB', flag: '🇬🇧', name: 'UK' },
  { code: 'IE', flag: '🇮🇪', name: 'Ireland' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands' },
];

const FEATURES = [
  {
    icon: Shield,
    title: 'Verified entities only',
    desc: 'Every company KYB-verified against national registries. No consumers. No fake accounts.',
    color: 'var(--success)',
  },
  {
    icon: MapPin,
    title: 'Location-aware search',
    desc: 'Find suppliers within 50km. See warehouses, delivery radii, and branches on an interactive map.',
    color: 'var(--gold-500)',
  },
  {
    icon: Globe2,
    title: '20 European markets',
    desc: '19 EU member states plus the UK. Full EU GDPR + UK GDPR compliance throughout.',
    color: 'var(--info)',
  },
  {
    icon: FileText,
    title: 'RFQ system',
    desc: 'Broadcast to suppliers by category, geography, and delivery capability. Compare quotes side by side.',
    color: 'var(--gold-500)',
  },
  {
    icon: Building2,
    title: 'Public procurement (B2G)',
    desc: 'Native support for EU Directive 2014/24 and UK Procurement Act 2023. TED + FTS integration.',
    color: 'var(--success)',
  },
  {
    icon: Lock,
    title: 'Escrow payments',
    desc: 'Dual-currency EUR/GBP escrow via Mangopay + Stripe. Automatic VAT reverse-charge.',
    color: 'var(--info)',
  },
];

const STATS = [
  { label: 'Verified suppliers', value: '12,400+' },
  { label: 'EU countries', value: '19 + UK' },
  { label: 'Categories', value: '240+' },
  { label: 'Annual tender value', value: '€4.2B+' },
];

const TRUST_TIERS = [
  {
    tier: 'Basic',
    description: 'Registration & company check',
    features: ['Company name search', 'Browse listings', 'Message suppliers'],
    color: 'var(--ink-300)',
  },
  {
    tier: 'Standard',
    description: 'Full KYB verification',
    features: ['All Basic features', 'Place orders', 'RFQ access', 'Location search'],
    color: 'var(--info)',
    popular: true,
  },
  {
    tier: 'Premium',
    description: 'Enhanced due diligence',
    features: ['All Standard features', 'Featured listings', 'Priority support', 'Analytics'],
    color: 'var(--gold-500)',
  },
  {
    tier: 'Public Authority',
    description: 'Government procurement',
    features: ['All Premium features', 'Tender creation', 'Geo-eligibility zones', 'TED/FTS publish'],
    color: 'var(--success)',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }),
};

export default function HomePage() {
  return (
    <div style={{ background: 'var(--surface-0)' }}>
      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,12,26,0.96)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="container-ib" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 64,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32,
              background: 'var(--gold-500)',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink-900)' }}>
                IB
              </span>
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 600,
              fontSize: '1.1rem', color: 'white', letterSpacing: '-0.02em'
            }}>
              Marketplace
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {['Marketplace', 'RFQ', 'Procurement', 'About'].map(item => (
              <a key={item} href={`/${item.toLowerCase()}`} style={{
                color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem',
                fontWeight: 500, padding: '8px 14px', borderRadius: 6,
                textDecoration: 'none', transition: 'color 0.15s',
              }} className="nav-link-dark">
                {item}
              </a>
            ))}
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)', margin: '0 8px' }} />
            <Link href="/auth/login" className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
              Sign in
            </Link>
            <Link href="/auth/register" className="btn btn-gold btn-sm">
              Register Business
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, var(--ink-900) 0%, var(--ink-700) 60%, #1E3A5F 100%)',
        minHeight: '88vh',
        display: 'flex', alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        {/* Glowing orbs */}
        <div style={{
          position: 'absolute', top: '15%', right: '8%',
          width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '5%',
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(26,95,180,0.15) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div className="container-ib" style={{ position: 'relative', zIndex: 1, paddingTop: 80, paddingBottom: 80 }}>
          <div style={{ maxWidth: 800 }}>
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div className="badge badge-gold" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold-300)', border: '1px solid rgba(201,168,76,0.3)' }}>
                <Shield size={12} />
                B2B & B2G ONLY · VERIFIED ENTITIES
              </div>
              <div style={{ height: 1, width: 60, background: 'rgba(201,168,76,0.3)' }} />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                v4.0 · LOCATION
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="display-xl"
              initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{ color: 'white', marginBottom: 28 }}
            >
              European B2B commerce,
              <br />
              <span style={{ color: 'var(--gold-400)', fontStyle: 'italic' }}>
                built on trust.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                color: 'rgba(255,255,255,0.65)', fontSize: '1.2rem',
                maxWidth: 580, lineHeight: 1.7, marginBottom: 48,
              }}
            >
              KYB-verified marketplace across 20 European markets. Find suppliers
              near you, issue RFQs, and participate in public procurement tenders —
              all in one platform.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}
            >
              <Link href="/auth/register" className="btn btn-gold btn-xl" style={{ fontSize: '1rem' }}>
                Register Your Business
                <ArrowRight size={18} />
              </Link>
              <Link href="/marketplace" className="btn btn-lg" style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                border: '1.5px solid rgba(255,255,255,0.2)',
              }}>
                <Search size={18} />
                Browse Marketplace
              </Link>
            </motion.div>

            {/* Countries */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ marginTop: 64, display: 'flex', flexWrap: 'wrap', gap: 8 }}
            >
              {COUNTRY_FLAGS.map((c) => (
                <div key={c.code} title={c.name} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                }}>
                  <span style={{ fontSize: '1rem' }}>{c.flag}</span>
                  <span>{c.code}</span>
                </div>
              ))}
              <div style={{
                padding: '6px 12px',
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: 20,
                color: 'var(--gold-300)',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
              }}>
                +10 more
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--ink-800)', borderTop: '1px solid var(--ink-700)' }}>
        <div className="container-ib" style={{ padding: '48px var(--space-8)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i} variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true }}
                style={{ textAlign: 'center', padding: '32px 24px' }}
              >
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: '2.5rem', color: 'var(--gold-400)', marginBottom: 8,
                }}>
                  {stat.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                  {stat.label.toUpperCase()}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '120px 0', background: 'var(--surface-1)' }}>
        <div className="container-ib">
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <div className="badge badge-ink" style={{ marginBottom: 16 }}>
              PLATFORM CAPABILITIES
            </div>
            <h2 style={{ marginBottom: 16 }}>
              Everything a European business needs
            </h2>
            <p style={{ color: 'var(--ink-500)', fontSize: '1.1rem', maxWidth: 540, margin: '0 auto' }}>
              From KYB verification to geo-aware supplier discovery, RFQ management, and public procurement.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
          }}>
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                custom={i} variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true }}
                className="card"
                style={{ padding: 32 }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${feat.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <feat.icon size={22} style={{ color: feat.color }} />
                </div>
                <h4 style={{ marginBottom: 10, fontFamily: 'var(--font-display)' }}>
                  {feat.title}
                </h4>
                <p style={{ color: 'var(--ink-500)', fontSize: '0.925rem', lineHeight: 1.65 }}>
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOCATION FEATURE SPOTLIGHT ────────────────────────────────────────── */}
      <section style={{
        padding: '120px 0',
        background: 'linear-gradient(135deg, var(--ink-900) 0%, #0F2040 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle at 80% 50%, rgba(201,168,76,0.08) 0%, transparent 60%)`,
        }} />
        <div className="container-ib" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div className="badge" style={{
                background: 'rgba(201,168,76,0.12)', color: 'var(--gold-300)',
                border: '1px solid rgba(201,168,76,0.25)', marginBottom: 24,
              }}>
                <Zap size={12} />
                NEW IN V4 — LOCATION FEATURE
              </div>
              <h2 style={{ color: 'white', marginBottom: 24, fontSize: 'clamp(1.8rem, 3vw, 2.8rem)' }}>
                Find the{' '}
                <span style={{ color: 'var(--gold-400)', fontStyle: 'italic' }}>nearest</span>{' '}
                verified supplier
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: 40 }}>
                Set your location and radius. The map instantly shows verified warehouses,
                HQs, and delivery coverage areas across all 20 countries. Address-verified
                with physical postcard confirmation.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  'Opt-in precise location disclosure',
                  'Delivery radius visualisation per warehouse',
                  'Proximity-filtered RFQ broadcasts',
                  'Geo-eligibility zones for public tenders',
                  'Full GDPR/UK GDPR compliance',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Check size={16} style={{ color: 'var(--gold-400)', flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.925rem' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock map UI */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: 32,
              position: 'relative',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #0D1B33 0%, #152545 100%)',
                borderRadius: 12,
                height: 360,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Mock map dots */}
                {[
                  { top: '30%', left: '35%', size: 12 },
                  { top: '45%', left: '55%', size: 16 },
                  { top: '55%', left: '30%', size: 10 },
                  { top: '25%', left: '65%', size: 14 },
                  { top: '65%', left: '60%', size: 10 },
                ].map((dot, i) => (
                  <div key={i} style={{
                    position: 'absolute', top: dot.top, left: dot.left,
                    width: dot.size, height: dot.size,
                    borderRadius: '50%',
                    background: 'var(--gold-500)',
                    animation: `pulse-gold ${1.5 + i * 0.3}s ease-in-out infinite`,
                  }} />
                ))}
                {/* Radius circle */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 180, height: 180,
                  borderRadius: '50%',
                  border: '1.5px dashed rgba(201,168,76,0.4)',
                  background: 'rgba(201,168,76,0.04)',
                }} />
                <div style={{
                  background: 'var(--ink-800)',
                  border: '1px solid var(--ink-600)',
                  borderRadius: 8, padding: '8px 14px',
                  position: 'absolute', top: 16, right: 16,
                  fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                  color: 'var(--gold-300)',
                }}>
                  radius: 150km
                </div>
                <MapPin size={28} style={{ color: 'var(--gold-500)', position: 'relative', zIndex: 1 }} />
              </div>

              {/* Search bar mockup */}
              <div style={{
                marginTop: 20,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <Search size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
                  Find suppliers within 150km of Frankfurt…
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST TIERS ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '120px 0', background: 'var(--surface-0)' }}>
        <div className="container-ib">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="badge badge-gold" style={{ marginBottom: 16 }}>
              VERIFICATION TIERS
            </div>
            <h2>Trust is earned, not assumed</h2>
            <p style={{ color: 'var(--ink-500)', maxWidth: 500, margin: '16px auto 0' }}>
              Four tiers of KYB verification. Every entity starts at Basic and progresses
              through documented verification.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {TRUST_TIERS.map((tier, i) => (
              <motion.div
                key={tier.tier}
                custom={i} variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true }}
                style={{
                  background: tier.popular ? 'var(--ink-800)' : 'var(--surface-0)',
                  border: tier.popular ? '2px solid var(--gold-500)' : '1px solid var(--border)',
                  borderRadius: 16, padding: '32px 24px',
                  position: 'relative',
                }}
              >
                {tier.popular && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--gold-500)', color: 'var(--ink-900)',
                    padding: '4px 14px', borderRadius: 20,
                    fontSize: '0.7rem', fontWeight: 700,
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                  }}>
                    MOST COMMON
                  </div>
                )}
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${tier.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Award size={20} style={{ color: tier.color }} />
                </div>
                <h4 style={{ color: tier.popular ? 'white' : 'var(--ink-900)', marginBottom: 6 }}>
                  {tier.tier}
                </h4>
                <p style={{ color: tier.popular ? 'rgba(255,255,255,0.55)' : 'var(--ink-500)', fontSize: '0.85rem', marginBottom: 20 }}>
                  {tier.description}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tier.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Check size={14} style={{ color: tier.color, flexShrink: 0 }} />
                      <span style={{
                        color: tier.popular ? 'rgba(255,255,255,0.75)' : 'var(--ink-600)',
                        fontSize: '0.85rem',
                      }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section style={{
        padding: '100px 0',
        background: 'linear-gradient(135deg, var(--gold-50) 0%, var(--ink-50) 100%)',
        borderTop: '1px solid var(--border)',
      }}>
        <div className="container-ib" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 16, fontSize: 'clamp(1.8rem, 3vw, 2.8rem)' }}>
            Ready to trade across Europe?
          </h2>
          <p style={{ color: 'var(--ink-500)', fontSize: '1.1rem', marginBottom: 40, maxWidth: 460, margin: '0 auto 40px' }}>
            Register your company today. KYB verification typically completes within 24 hours.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register" className="btn btn-primary btn-xl">
              Register Your Business
              <ArrowRight size={18} />
            </Link>
            <Link href="/marketplace" className="btn btn-outline btn-xl">
              Explore Marketplace
            </Link>
          </div>
          <p style={{ color: 'var(--ink-400)', fontSize: '0.825rem', marginTop: 24, fontFamily: 'var(--font-mono)' }}>
            B2B & B2G ONLY · EU GDPR + UK GDPR COMPLIANT · 20 COUNTRIES
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer style={{
        background: 'var(--ink-900)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '64px 0 32px',
      }}>
        <div className="container-ib">
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 48, marginBottom: 48,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{
                  width: 28, height: 28, background: 'var(--gold-500)',
                  borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink-900)' }}>IB</span>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'white', fontSize: '1rem' }}>
                  IB Marketplace
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', lineHeight: 1.7, maxWidth: 320 }}>
                European B2B & B2G commerce platform. Verified suppliers, location-aware search,
                and public procurement across 20 European markets.
              </p>
            </div>
            {[
              { title: 'Platform', links: ['Marketplace', 'RFQ System', 'Procurement', 'Messaging', 'Payments'] },
              { title: 'Compliance', links: ['EU GDPR', 'UK GDPR', 'PSD2', 'Procurement Law', 'KYB Process'] },
              { title: 'Company', links: ['About', 'Contact', 'Privacy Policy', 'Terms of Use', 'API Docs'] },
            ].map(section => (
              <div key={section.title}>
                <h6 style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                  letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)',
                  marginBottom: 16, textTransform: 'uppercase',
                }}>
                  {section.title}
                </h6>
                {section.links.map(link => (
                  <a key={link} href="#" style={{
                    display: 'block', color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.875rem', marginBottom: 10,
                    textDecoration: 'none', transition: 'color 0.15s',
                  }}>
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 24,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
              © 2026 IB MARKETPLACE · B2B/B2G ONLY · 20 COUNTRIES · EU + UK COMPLIANT
            </p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>🇪🇺 EU GDPR</span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>🇬🇧 UK GDPR</span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>KYB VERIFIED</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
