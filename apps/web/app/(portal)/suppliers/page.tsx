// apps/web/src/app/suppliers/page.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Search, Sliders, Navigation, Shield,
  Star, Award, Truck, CheckCircle2, ExternalLink,
  Globe2, ChevronRight, Package, Map as MapIcon, List,
} from 'lucide-react';

const MOCK_SUPPLIERS = [
  {
    id: '1', name: 'Müller Maschinenbau GmbH',
    country: 'DE', flag: '🇩🇪', city: 'Stuttgart',
    tier: 'premium', trustScore: 920,
    categories: ['Machinery & Equipment', 'Industrial'],
    activeListings: 34,
    distance: 42,
    verified: true,
    locationTypes: ['operational_hq', 'warehouse'],
    deliveryCountries: ['DE', 'AT', 'CH', 'NL'],
    description: 'Leading manufacturer of precision CNC machinery. ISO 9001:2015 certified. 45 years of experience.',
    employeeRange: '201-500',
  },
  {
    id: '2', name: 'ChemDistrib Nederland BV',
    country: 'NL', flag: '🇳🇱', city: 'Rotterdam',
    tier: 'premium', trustScore: 905,
    categories: ['Chemicals & Materials'],
    activeListings: 127,
    distance: 87,
    verified: true,
    locationTypes: ['operational_hq', 'warehouse', 'delivery_hub'],
    deliveryCountries: ['NL', 'BE', 'DE', 'FR', 'GB'],
    description: 'Pan-European chemical distribution. ADR-certified. Same-day dispatch within Benelux.',
    employeeRange: '51-200',
  },
  {
    id: '3', name: 'SolarTech Ibérica SL',
    country: 'ES', flag: '🇪🇸', city: 'Valencia',
    tier: 'standard', trustScore: 760,
    categories: ['Energy & Utilities', 'Construction'],
    activeListings: 45,
    distance: 156,
    verified: true,
    locationTypes: ['operational_hq'],
    deliveryCountries: ['ES', 'PT', 'FR'],
    description: 'Spanish solar energy components manufacturer. 15 years in renewable energy sector.',
    employeeRange: '51-200',
  },
  {
    id: '4', name: 'Acier Professionnel SAS',
    country: 'FR', flag: '🇫🇷', city: 'Lyon',
    tier: 'standard', trustScore: 810,
    categories: ['Chemicals & Materials', 'Construction'],
    activeListings: 89,
    distance: 203,
    verified: true,
    locationTypes: ['operational_hq', 'warehouse'],
    deliveryCountries: ['FR', 'BE', 'LU', 'CH'],
    description: 'French steel and metal distributor. Custom cutting and surface treatment services.',
    employeeRange: '11-50',
  },
  {
    id: '5', name: 'StorageSystems UK Ltd',
    country: 'GB', flag: '🇬🇧', city: 'Birmingham',
    tier: 'standard', trustScore: 795,
    categories: ['Industrial & Manufacturing', 'Logistics'],
    activeListings: 58,
    distance: 520,
    verified: true,
    locationTypes: ['operational_hq', 'showroom'],
    deliveryCountries: ['GB', 'IE'],
    description: 'UK warehouse and storage solutions. Nationwide delivery. Installation service available.',
    employeeRange: '51-200',
  },
  {
    id: '6', name: 'TechMed Instruments GmbH',
    country: 'DE', flag: '🇩🇪', city: 'Berlin',
    tier: 'premium', trustScore: 880,
    categories: ['Healthcare & Pharma', 'Electronics'],
    activeListings: 72,
    distance: 680,
    verified: true,
    locationTypes: ['operational_hq', 'showroom'],
    deliveryCountries: ['DE', 'AT', 'NL', 'BE', 'FR', 'PL'],
    description: 'Medical instruments and diagnostics equipment. CE certified. ISO 13485.',
    employeeRange: '201-500',
  },
];

const TIER_CONFIG = {
  premium: { label: 'Premium', color: 'var(--gold-500)', bg: 'var(--gold-50)' },
  standard: { label: 'Standard', color: 'var(--info)', bg: 'var(--info-light)' },
  basic: { label: 'Basic', color: 'var(--ink-400)', bg: 'var(--surface-2)' },
};

const LOCATION_TYPE_ICONS: Record<string, string> = {
  operational_hq: '🏢',
  warehouse: '🏭',
  delivery_hub: '🚛',
  branch_office: '📌',
  showroom: '🏪',
  registered: '⚖️',
};

function SupplierCard({ supplier, compact = false }: { supplier: typeof MOCK_SUPPLIERS[0]; compact?: boolean }) {
  const tier = TIER_CONFIG[supplier.tier as keyof typeof TIER_CONFIG];

  return (
    <div className="card" style={{ padding: compact ? '16px' : '22px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: compact ? 40 : 52, height: compact ? 40 : 52, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--ink-100), var(--surface-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border)',
          fontSize: compact ? '1rem' : '1.3rem',
        }}>
          {supplier.flag}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
            <h4 style={{
              fontFamily: 'var(--font-body)', fontSize: compact ? '0.9rem' : '1rem',
              fontWeight: 700, color: 'var(--ink-900)', margin: 0,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {supplier.name}
            </h4>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', borderRadius: 20,
              background: tier.bg, color: tier.color,
              fontSize: '0.68rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em', flexShrink: 0,
            }}>
              <Award size={10} />
              {tier.label.toUpperCase()}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: compact ? 0 : 10 }}>
            <MapPin size={11} style={{ color: 'var(--gold-500)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
              {supplier.city} · {supplier.distance}km
            </span>
            {supplier.verified && (
              <div className="verified-badge" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                <CheckCircle2 size={8} /> KYB
              </div>
            )}
          </div>

          {!compact && (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-500)', lineHeight: 1.5, marginBottom: 12 }}>
                {supplier.description}
              </p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {supplier.locationTypes.map(lt => (
                  <div key={lt} style={{
                    fontSize: '0.72rem', color: 'var(--ink-500)',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    padding: '2px 8px', borderRadius: 6,
                  }}>
                    {LOCATION_TYPE_ICONS[lt]} {lt.replace('_', ' ')}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Package size={13} style={{ color: 'var(--ink-400)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                      {supplier.activeListings} listings
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Truck size={13} style={{ color: 'var(--ink-400)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                      {supplier.deliveryCountries.slice(0, 3).join(', ')}
                      {supplier.deliveryCountries.length > 3 && ` +${supplier.deliveryCountries.length - 3}`}
                    </span>
                  </div>
                </div>

                {/* Trust score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 48, height: 4, borderRadius: 2, background: 'var(--ink-100)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(supplier.trustScore / 1000) * 100}%`,
                      height: '100%', borderRadius: 2,
                      background: `linear-gradient(90deg, var(--gold-300), var(--gold-500))`,
                    }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-500)' }}>
                    {supplier.trustScore}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn btn-primary btn-sm" style={{ fontSize: '0.82rem' }}>
                  View Profile
                </button>
                <button className="btn btn-outline btn-sm" style={{ fontSize: '0.82rem' }}>
                  Send RFQ
                </button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.82rem', marginLeft: 'auto' }}>
                  <Package size={13} />
                  Listings
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState(300);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-1)' }}>

      {/* Header */}
      <div style={{
        background: 'var(--ink-800)',
        padding: '32px 0',
        borderBottom: '1px solid var(--ink-700)',
      }}>
        <div className="container-ib">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <h2 style={{ color: 'white', margin: 0 }}>Find Suppliers</h2>
            <div className="badge" style={{
              background: 'rgba(201,168,76,0.12)', color: 'var(--gold-300)',
              border: '1px solid rgba(201,168,76,0.25)',
            }}>
              <MapPin size={11} />
              LOCATION-AWARE
            </div>
          </div>

          {/* Search + Location */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <Search size={16} style={{ color: 'rgba(255,255,255,0.4)', margin: '0 14px' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Company name, category, product…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '0.9rem', padding: '14px 0' }}
              />
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: '12px 16px',
            }}>
              <Navigation size={15} style={{ color: 'var(--gold-400)' }} />
              <span style={{ color: 'white', fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>Frankfurt</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>·</span>
              <input
                type="range" min={50} max={1000} step={25} value={radiusKm}
                onChange={e => setRadiusKm(Number(e.target.value))}
                style={{ width: 80 }}
              />
              <span style={{ color: 'var(--gold-300)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', minWidth: 52 }}>
                {radiusKm}km
              </span>
            </div>

            <button className="btn btn-gold">
              <Search size={16} />
              Search
            </button>
          </div>

          {/* Quick filters */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Has local warehouse', icon: '🏭' },
              { label: 'Premium verified', icon: '⭐' },
              { label: 'Same-day delivery', icon: '⚡' },
              { label: 'ISO certified', icon: '📋' },
            ].map(f => (
              <button key={f.label} style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)',
                fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
              }}>
                <span>{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container-ib" style={{ padding: '24px var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--ink-500)' }}>
            <strong style={{ color: 'var(--ink-800)' }}>{MOCK_SUPPLIERS.length} verified suppliers</strong>
            {' '}within {radiusKm}km of Frankfurt
          </div>
          <div style={{
            display: 'flex', background: 'var(--surface-2)',
            borderRadius: 8, padding: 3,
          }}>
            {([['list', List], ['map', MapIcon]] as const).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: viewMode === mode ? 'var(--surface-0)' : 'transparent',
                color: viewMode === mode ? 'var(--ink-800)' : 'var(--ink-400)',
                boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 500,
                transition: 'all 0.15s',
              }}>
                <Icon size={14} />
                {mode === 'list' ? 'List' : 'Map'}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {MOCK_SUPPLIERS.map((supplier, i) => (
              <motion.div key={supplier.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <SupplierCard supplier={supplier} />
              </motion.div>
            ))}
          </div>
        )}

        {viewMode === 'map' && (
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 16, height: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12,
          }}>
            <MapIcon size={40} style={{ color: 'var(--ink-200)' }} />
            <p style={{ color: 'var(--ink-400)', fontSize: '0.875rem' }}>
              Mapbox GL JS map with supplier pins · Set NEXT_PUBLIC_MAPBOX_TOKEN
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
