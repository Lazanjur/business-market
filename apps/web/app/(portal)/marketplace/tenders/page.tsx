// apps/web/src/app/marketplace/tenders/page.tsx
'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, MapPin, Euro, Calendar, FileText, Shield,
  ChevronRight, Search, Filter, Globe2, Clock, Award,
  CheckCircle2, AlertCircle, ExternalLink, Tag, Gavel,
} from 'lucide-react';

const MOCK_TENDERS = [
  {
    id: '1',
    tender_number: 'TEN-DE-2026-04-0012',
    title: 'Supply of Industrial Cleaning Equipment — Public Infrastructure 2026-2028',
    authority: 'Bundesagentur für Arbeit',
    authority_country: 'DE', authority_flag: '🇩🇪',
    authority_city: 'Nuremberg',
    regime: 'EU',
    procurement_type: 'Open',
    is_above_threshold: true,
    estimated_value: 2800000,
    currency: 'EUR',
    cpv_codes: ['33700000', '39831000'],
    category: 'Industrial & Manufacturing',
    submission_deadline: '2026-05-15',
    contract_start: '2026-07-01',
    contract_duration_months: 24,
    status: 'published',
    has_geo_restriction: false,
    ted_ref: 'TED/2026/0123456',
    bids_count: 0,
    description: 'Open procedure for the supply of industrial cleaning machines, equipment, and consumables for federal employment offices across Germany.',
  },
  {
    id: '2',
    tender_number: 'TEN-NL-2026-04-0034',
    title: 'IT Hardware Procurement — Laptops and Peripherals for Municipal Services',
    authority: 'Gemeente Amsterdam',
    authority_country: 'NL', authority_flag: '🇳🇱',
    authority_city: 'Amsterdam',
    regime: 'EU',
    procurement_type: 'Open',
    is_above_threshold: false,
    estimated_value: 450000,
    currency: 'EUR',
    cpv_codes: ['30213100', '30237000'],
    category: 'IT & Software',
    submission_deadline: '2026-04-25',
    contract_start: '2026-06-01',
    contract_duration_months: 36,
    status: 'published',
    has_geo_restriction: true,
    geo_restriction: 'Supplier must have warehouse within 100km of Amsterdam',
    bids_count: 3,
    description: 'Supply and maintenance of laptops and computer peripherals. Geo-eligibility: supplier must have a verified warehouse within 100km.',
  },
  {
    id: '3',
    tender_number: 'TEN-GB-2026-04-0008',
    title: 'Professional Consulting Services — Digital Transformation Strategy',
    authority: 'NHS England',
    authority_country: 'GB', authority_flag: '🇬🇧',
    authority_city: 'Leeds',
    regime: 'UK',
    procurement_type: 'Restricted',
    is_above_threshold: true,
    estimated_value: 1200000,
    currency: 'GBP',
    cpv_codes: ['72220000', '72600000'],
    category: 'Professional Services',
    submission_deadline: '2026-05-02',
    contract_start: '2026-07-01',
    contract_duration_months: 18,
    status: 'published',
    has_geo_restriction: false,
    fts_ref: 'FTS-2026-GBP-00789',
    bids_count: 0,
    description: 'Restricted procedure for digital transformation consulting. UK Procurement Act 2023. Expressions of interest required by deadline.',
  },
  {
    id: '4',
    tender_number: 'TEN-FR-2026-03-0067',
    title: 'Construction Materials — Municipal Renovation Programme 2026',
    authority: 'Mairie de Lyon',
    authority_country: 'FR', authority_flag: '🇫🇷',
    authority_city: 'Lyon',
    regime: 'EU',
    procurement_type: 'Open',
    is_above_threshold: false,
    estimated_value: 320000,
    currency: 'EUR',
    cpv_codes: ['44000000', '44100000'],
    category: 'Construction & Building',
    submission_deadline: '2026-04-18',
    contract_start: '2026-05-15',
    contract_duration_months: 12,
    status: 'published',
    has_geo_restriction: true,
    geo_restriction: 'Auvergne-Rhône-Alpes region only',
    bids_count: 7,
    description: 'Building materials, timber, and aggregates for municipality renovation works. Geo-restricted to regional suppliers to support local economy.',
  },
];

const REGIME_CONFIG = {
  EU: { color: 'var(--info)', bg: 'var(--info-light)', icon: '🇪🇺' },
  UK: { color: 'var(--success)', bg: 'var(--success-light)', icon: '🇬🇧' },
};

function TenderCard({ tender }: { tender: typeof MOCK_TENDERS[0] }) {
  const regime = REGIME_CONFIG[tender.regime as keyof typeof REGIME_CONFIG];
  const daysLeft = Math.ceil((new Date(tender.submission_deadline).getTime() - Date.now()) / 86400000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="tender-card"
      style={{ cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Authority icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--ink-50), var(--surface-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border)', fontSize: '1.3rem',
        }}>
          {tender.authority_flag}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{
                fontFamily: 'var(--font-body)', fontWeight: 600,
                fontSize: '0.975rem', color: 'var(--ink-900)', marginBottom: 4, lineHeight: 1.4,
              }}>
                {tender.title}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--ink-500)', fontWeight: 500 }}>
                  {tender.authority}
                </span>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-200)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--ink-400)' }}>
                  <MapPin size={11} />
                  {tender.authority_city}, {tender.authority_country}
                </div>
              </div>
            </div>

            {/* Value */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink-900)' }}>
                {tender.currency === 'GBP' ? '£' : '€'}
                {(tender.estimated_value / 1000000).toFixed(1)}M
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>
                estimated value
              </div>
            </div>
          </div>

          {/* Tags row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{
              padding: '3px 10px', borderRadius: 20,
              background: regime.bg, color: regime.color,
              fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
              border: `1px solid ${regime.color}30`,
            }}>
              {regime.icon} {tender.regime} {tender.is_above_threshold ? '· ABOVE THRESHOLD' : '· BELOW THRESHOLD'}
            </div>
            <div className="badge badge-ink" style={{ fontSize: '0.7rem' }}>
              {tender.procurement_type.toUpperCase()}
            </div>
            <div className="badge badge-ink" style={{ fontSize: '0.7rem' }}>
              <Tag size={9} />
              {tender.category}
            </div>
            {tender.has_geo_restriction && (
              <div className="badge" style={{
                background: 'var(--gold-50)', color: 'var(--gold-700)',
                border: '1px solid var(--gold-200)', fontSize: '0.7rem',
              }}>
                <MapPin size={9} />
                GEO-RESTRICTED
              </div>
            )}
            {tender.bids_count > 0 && (
              <div className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                {tender.bids_count} BIDS
              </div>
            )}
          </div>

          {/* Description */}
          <p style={{
            fontSize: '0.85rem', color: 'var(--ink-500)',
            lineHeight: 1.55, marginBottom: 12,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {tender.description}
          </p>

          {/* Geo restriction notice */}
          {tender.has_geo_restriction && tender.geo_restriction && (
            <div style={{
              padding: '8px 12px', borderRadius: 8, marginBottom: 12,
              background: 'var(--gold-50)', border: '1px solid var(--gold-200)',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <MapPin size={13} style={{ color: 'var(--gold-600)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--gold-700)', lineHeight: 1.5 }}>
                <strong>Geo-eligibility:</strong> {tender.geo_restriction}
              </span>
            </div>
          )}

          {/* Footer row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: daysLeft <= 7 ? 'var(--error)' : 'var(--ink-500)' }}>
                <Clock size={13} />
                <strong>{daysLeft} days left</strong> · {tender.submission_deadline}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>
                <FileText size={12} />
                {tender.ted_ref || tender.fts_ref || tender.tender_number}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" style={{ fontSize: '0.8rem' }}>
                <ExternalLink size={12} />
                {tender.ted_ref ? 'TED' : 'FTS'}
              </button>
              <button className="btn btn-primary btn-sm" style={{ fontSize: '0.8rem' }}>
                View Tender
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TendersPage() {
  const [regime, setRegime] = useState<'all' | 'EU' | 'UK'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = MOCK_TENDERS.filter(t =>
    (regime === 'all' || t.regime === regime) &&
    (!searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-1)' }}>

      {/* Header */}
      <div style={{ background: 'var(--ink-800)', padding: '40px 0 32px', borderBottom: '1px solid var(--ink-700)' }}>
        <div className="container-ib">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Gavel size={20} style={{ color: 'var(--gold-400)' }} />
                </div>
                <h2 style={{ color: 'white', margin: 0 }}>Public Procurement</h2>
                <div className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  B2G MODULE
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.925rem' }}>
                EU Directive 2014/24 · UK Procurement Act 2023 · TED + FTS integration
              </p>
            </div>
            <button className="btn btn-gold">
              <Building2 size={16} />
              Create Tender
            </button>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              <Search size={15} style={{ color: 'rgba(255,255,255,0.4)', margin: '0 14px' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tenders by title, CPV code, authority…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '0.9rem', padding: '12px 0' }}
              />
            </div>

            {/* Regime toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4 }}>
              {(['all', 'EU', 'UK'] as const).map(r => (
                <button key={r} onClick={() => setRegime(r)} style={{
                  padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: regime === r ? 'var(--gold-500)' : 'transparent',
                  color: regime === r ? 'var(--ink-900)' : 'rgba(255,255,255,0.55)',
                  fontWeight: regime === r ? 700 : 500, fontSize: '0.85rem',
                  transition: 'all 0.15s',
                }}>
                  {r === 'all' ? 'All' : r === 'EU' ? '🇪🇺 EU' : '🇬🇧 UK'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tenders list */}
      <div className="container-ib" style={{ padding: '28px var(--space-8)' }}>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Open Tenders', value: filtered.length, icon: FileText, color: 'var(--info)' },
            { label: 'Total Value', value: '€4.8M', icon: Euro, color: 'var(--gold-500)' },
            { label: 'Avg. Days Left', value: '23', icon: Clock, color: 'var(--warning)' },
            { label: 'Geo-restricted', value: filtered.filter(t => t.has_geo_restriction).length, icon: MapPin, color: 'var(--success)' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} style={{
                background: 'var(--surface-0)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} style={{ color: stat.color }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink-900)' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-400)' }}>{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((tender, i) => (
            <motion.div key={tender.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <TenderCard tender={tender} />
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink-400)' }}>
            <Gavel size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
            <h4 style={{ color: 'var(--ink-400)' }}>No tenders found</h4>
          </div>
        )}
      </div>
    </div>
  );
}
