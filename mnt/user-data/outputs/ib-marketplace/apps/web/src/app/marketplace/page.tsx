// apps/web/src/app/marketplace/page.tsx
'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, SlidersHorizontal, Grid3X3, Map,
  Star, Shield, ChevronDown, X, Filter, ArrowUpDown,
  Package, Clock, Truck, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { id: 1, name: 'Industrial & Manufacturing', icon: '⚙️', count: 2340 },
  { id: 2, name: 'Chemicals & Materials', icon: '🧪', count: 1820 },
  { id: 3, name: 'Electronics & Components', icon: '🔌', count: 3410 },
  { id: 4, name: 'Food & Agriculture', icon: '🌾', count: 980 },
  { id: 5, name: 'Construction & Building', icon: '🏗️', count: 1560 },
  { id: 6, name: 'Energy & Utilities', icon: '⚡', count: 740 },
  { id: 7, name: 'Logistics & Transport', icon: '🚛', count: 890 },
  { id: 8, name: 'Professional Services', icon: '💼', count: 1230 },
  { id: 9, name: 'Healthcare & Pharma', icon: '⚕️', count: 670 },
  { id: 10, name: 'IT & Software', icon: '💻', count: 2100 },
  { id: 11, name: 'Textiles & Apparel', icon: '🧵', count: 430 },
  { id: 12, name: 'Machinery & Equipment', icon: '🏭', count: 1890 },
];

const MOCK_LISTINGS = [
  {
    id: '1', title: 'Industrial CNC Milling Machine — 5-Axis DMU 50',
    seller: 'Müller Maschinenbau GmbH', country: 'DE', flag: '🇩🇪',
    price: 48500, currency: 'EUR', unit: 'unit', moq: 1,
    category: 'Machinery & Equipment', trustScore: 870,
    tier: 'premium', image: null,
    distance: 42, city: 'Stuttgart',
    verified: true, leadTime: 14,
    tags: ['CNC', '5-axis', 'precision', 'ISO 9001'],
  },
  {
    id: '2', title: 'High-Purity Ethanol 96% — Food & Industrial Grade',
    seller: 'ChemDistrib Nederland BV', country: 'NL', flag: '🇳🇱',
    price: 1.24, currency: 'EUR', unit: 'litre', moq: 1000,
    category: 'Chemicals & Materials', trustScore: 920,
    tier: 'premium', image: null,
    distance: 87, city: 'Rotterdam',
    verified: true, leadTime: 5,
    tags: ['food-grade', 'pharmaceutical', 'bulk'],
  },
  {
    id: '3', title: 'Stainless Steel Sheets 316L — Custom Cut to Size',
    seller: 'Acier Professionnel SAS', country: 'FR', flag: '🇫🇷',
    price: 320, currency: 'EUR', unit: 'sheet', moq: 10,
    category: 'Chemicals & Materials', trustScore: 760,
    tier: 'standard', image: null,
    distance: 156, city: 'Lyon',
    verified: true, leadTime: 7,
    tags: ['316L', 'custom-cut', 'food-safe'],
  },
  {
    id: '4', title: 'Industrial IoT Sensors — Modbus RS485 Temperature',
    seller: 'SensorTech BV', country: 'NL', flag: '🇳🇱',
    price: 89, currency: 'EUR', unit: 'unit', moq: 50,
    category: 'Electronics & Components', trustScore: 830,
    tier: 'standard', image: null,
    distance: 63, city: 'Eindhoven',
    verified: true, leadTime: 10,
    tags: ['IoT', 'RS485', 'industrial'],
  },
  {
    id: '5', title: 'Organic Wheat Flour T55 — Certified Organic',
    seller: 'Meunerie du Rhône', country: 'FR', flag: '🇫🇷',
    price: 0.68, currency: 'EUR', unit: 'kg', moq: 500,
    category: 'Food & Agriculture', trustScore: 690,
    tier: 'standard', image: null,
    distance: 234, city: 'Grenoble',
    verified: false, leadTime: 3,
    tags: ['organic', 'T55', 'EU certified'],
  },
  {
    id: '6', title: 'Heavy-Duty Racking System — Adjustable Pallet Shelving',
    seller: 'StorageSystems UK Ltd', country: 'GB', flag: '🇬🇧',
    price: 1250, currency: 'GBP', unit: 'bay', moq: 4,
    category: 'Industrial & Manufacturing', trustScore: 800,
    tier: 'standard', image: null,
    distance: 520, city: 'Birmingham',
    verified: true, leadTime: 21,
    tags: ['warehouse', 'racking', 'GBP'],
  },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'distance', label: 'Nearest first' },
  { value: 'trust_score', label: 'Trust score' },
  { value: 'price_asc', label: 'Price: Low to high' },
  { value: 'price_desc', label: 'Price: High to low' },
  { value: 'newest', label: 'Newest first' },
];

function TrustBadge({ score, tier }: { score: number; tier: string }) {
  const color = tier === 'premium' ? 'var(--gold-500)' :
                tier === 'standard' ? 'var(--info)' : 'var(--ink-400)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 44, height: 4, borderRadius: 2,
        background: 'var(--ink-100)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${(score / 1000) * 100}%`, height: '100%',
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 2,
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-400)' }}>
        {score}
      </span>
    </div>
  );
}

function ListingCard({ listing }: { listing: typeof MOCK_LISTINGS[0] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        background: 'var(--surface-0)',
        border: `1px solid ${hovered ? 'var(--ink-300)' : 'var(--border)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      }}
    >
      {/* Image area */}
      <div style={{
        height: 180,
        background: `linear-gradient(135deg, var(--ink-50) 0%, var(--surface-2) 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        borderBottom: '1px solid var(--border)',
      }}>
        <Package size={48} style={{ color: 'var(--ink-200)' }} />

        {/* Tags */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {listing.verified && (
            <div className="verified-badge"><Shield size={9} /> VERIFIED</div>
          )}
          {listing.tags.slice(0, 2).map(tag => (
            <div key={tag} className="badge badge-ink" style={{ fontSize: '0.65rem', padding: '3px 8px' }}>
              {tag}
            </div>
          ))}
        </div>

        {/* Distance */}
        {listing.distance && (
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            background: 'rgba(8,12,26,0.7)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            padding: '4px 10px', borderRadius: 20,
            fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <MapPin size={10} />
            {listing.distance}km
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '18px 20px' }}>
        {/* Category */}
        <div style={{ fontSize: '0.72rem', color: 'var(--ink-400)', fontFamily: 'var(--font-mono)', marginBottom: 8, letterSpacing: '0.04em' }}>
          {listing.category.toUpperCase()}
        </div>

        <h3 style={{
          fontFamily: 'var(--font-body)', fontWeight: 600,
          fontSize: '0.95rem', lineHeight: 1.4,
          color: 'var(--ink-900)', marginBottom: 12,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {listing.title}
        </h3>

        {/* Seller */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          padding: '8px 10px',
          background: 'var(--surface-2)',
          borderRadius: 8,
        }}>
          <span style={{ fontSize: '1rem' }}>{listing.flag}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-700)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {listing.seller}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>
              {listing.city}, {listing.country}
            </div>
          </div>
          <TrustBadge score={listing.trustScore} tier={listing.tier} />
        </div>

        {/* Price + MOQ */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-400)' }}>
                {listing.currency}
              </span>
              <span className="price price-large">
                {listing.price.toLocaleString('en-EU', { minimumFractionDigits: listing.price < 10 ? 2 : 0 })}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--ink-400)' }}>/{listing.unit}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-400)', marginTop: 2 }}>
              MOQ: {listing.moq.toLocaleString()} {listing.unit}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-400)', fontSize: '0.78rem' }}>
            <Clock size={12} />
            <span>{listing.leadTime}d</span>
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: '0.82rem' }}>
            Request Quote
          </button>
          <button className="btn btn-outline btn-sm" style={{ padding: '8px 12px' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function MarketplacePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [searchQuery, setSearchQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState(200);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-1)' }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--ink-800)',
        borderBottom: '1px solid var(--ink-700)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div className="container-ib" style={{ display: 'flex', alignItems: 'center', gap: 12, height: 64 }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 8 }}>
            <div style={{ width: 28, height: 28, background: 'var(--gold-500)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink-900)' }}>IB</span>
            </div>
          </Link>

          {/* Search */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 0,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products, services, suppliers…"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                color: 'white', fontSize: '0.9rem',
                padding: '12px 0', outline: 'none',
              }}
            />
            <div style={{
              height: '100%', padding: '0 14px',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
              fontSize: '0.8rem', fontFamily: 'var(--font-mono)',
            }}>
              <MapPin size={13} />
              Frankfurt +{radiusKm}km
              <ChevronDown size={12} />
            </div>
            <button className="btn btn-gold btn-sm" style={{ borderRadius: '0 8px 8px 0', margin: 2 }}>
              Search
            </button>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            {['Suppliers', 'RFQ', 'Tenders'].map(item => (
              <Link key={item} href={`/${item.toLowerCase()}`} style={{
                color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 500,
                padding: '8px 14px', borderRadius: 8, textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
              }}>
                {item}
              </Link>
            ))}
          </div>

          <Link href="/dashboard" className="btn btn-outline btn-sm" style={{
            color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.15)',
            marginLeft: 4,
          }}>
            Dashboard
          </Link>
        </div>
      </div>

      {/* ── CATEGORY BAR ─────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        <div className="container-ib" style={{ display: 'flex', gap: 4, padding: '12px var(--space-8)', whiteSpace: 'nowrap' }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: selectedCategory === null ? 'var(--ink-800)' : 'var(--surface-2)',
              color: selectedCategory === null ? 'white' : 'var(--ink-600)',
              fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.15s',
            }}>
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: selectedCategory === cat.id ? 'var(--ink-800)' : 'var(--surface-2)',
                color: selectedCategory === cat.id ? 'white' : 'var(--ink-600)',
                fontSize: '0.82rem', fontWeight: 500, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <span>{cat.icon}</span>
              {cat.name}
              <span style={{ fontSize: '0.72rem', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
                {cat.count.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <div className="container-ib" style={{ padding: '24px var(--space-8)' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <SlidersHorizontal size={14} />
              Filters
              {showFilters && <X size={12} />}
            </button>
            <div className="badge badge-ink" style={{ fontSize: '0.75rem' }}>
              {MOCK_LISTINGS.length.toLocaleString()} results
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', color: 'var(--ink-400)' }}>
              <MapPin size={13} style={{ color: 'var(--gold-500)' }} />
              Sorted by distance from Frankfurt
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface-0)',
                fontSize: '0.82rem', color: 'var(--ink-700)', cursor: 'pointer',
                outline: 'none',
              }}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* View mode toggle */}
            <div style={{
              display: 'flex', background: 'var(--surface-2)',
              borderRadius: 8, padding: 3,
            }}>
              {[
                { mode: 'grid', Icon: Grid3X3 },
                { mode: 'map', Icon: Map },
              ].map(({ mode, Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: viewMode === mode ? 'var(--surface-0)' : 'transparent',
                    color: viewMode === mode ? 'var(--ink-800)' : 'var(--ink-400)',
                    boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden', marginBottom: 24 }}
            >
              <div style={{
                background: 'var(--surface-0)',
                border: '1px solid var(--border)',
                borderRadius: 14, padding: 24,
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
              }}>
                {/* Location filter */}
                <div>
                  <label className="label">
                    <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                    Proximity radius
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="range" min={25} max={1000} step={25}
                      value={radiusKm}
                      onChange={e => setRadiusKm(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ink-600)', minWidth: 60 }}>
                      {radiusKm}km
                    </span>
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label className="label">Country</label>
                  <select className="input" style={{ padding: '8px 12px' }}>
                    <option value="">All countries</option>
                    {[['DE','🇩🇪 Germany'], ['NL','🇳🇱 Netherlands'], ['FR','🇫🇷 France'],
                      ['GB','🇬🇧 United Kingdom'], ['IT','🇮🇹 Italy'], ['ES','🇪🇸 Spain']
                    ].map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Verification */}
                <div>
                  <label className="label">Verification tier</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['Verified only', 'Standard+', 'Premium only'].map(opt => (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--ink-600)' }}>
                        <input type="checkbox" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Delivery */}
                <div>
                  <label className="label">Delivery</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['Has local warehouse', 'Delivers to my country', 'Express available'].map(opt => (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--ink-600)' }}>
                        <input type="checkbox" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        {viewMode === 'grid' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {MOCK_LISTINGS.map((listing, i) => (
              <motion.div key={listing.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <ListingCard listing={listing} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Map View Placeholder */}
        {viewMode === 'map' && (
          <div style={{
            background: 'linear-gradient(135deg, var(--ink-50) 0%, var(--surface-2) 100%)',
            border: '1px solid var(--border)',
            borderRadius: 16, height: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 16,
          }}>
            <Map size={48} style={{ color: 'var(--ink-200)' }} />
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ color: 'var(--ink-400)', marginBottom: 8 }}>Mapbox GL map renders here</h4>
              <p style={{ color: 'var(--ink-300)', fontSize: '0.875rem' }}>
                NEXT_PUBLIC_MAPBOX_TOKEN required · See MapboxSupplierMap component
              </p>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
          {[1, 2, 3, '...', 24].map((page, i) => (
            <button key={i} style={{
              width: 38, height: 38, borderRadius: 8,
              border: page === 1 ? 'none' : '1px solid var(--border)',
              background: page === 1 ? 'var(--ink-800)' : 'var(--surface-0)',
              color: page === 1 ? 'white' : 'var(--ink-500)',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: page === 1 ? 600 : 400,
            }}>
              {page}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
