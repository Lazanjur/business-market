// apps/web/src/app/account/locations/page.tsx
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Plus, Eye, EyeOff, Shield, Truck, Building2,
  CheckCircle2, Clock, AlertTriangle, Globe, Map as MapIcon,
  Edit2, Trash2, Star, Navigation, Package, Info, ChevronDown,
  ExternalLink, Upload, Mail, X,
} from 'lucide-react';

const LOCATION_TYPE_CONFIG = {
  registered: { icon: Building2, label: 'Registered Office', color: 'var(--info)', desc: 'Legal registered address · Auto-verified from KYB' },
  operational_hq: { icon: Star, label: 'Operational HQ', color: 'var(--gold-500)', desc: 'Main place of business' },
  warehouse: { icon: Package, label: 'Warehouse / Depot', color: 'var(--success)', desc: 'Storage & dispatch point' },
  branch_office: { icon: Building2, label: 'Branch Office', color: 'var(--ink-500)', desc: 'Regional sales or service office' },
  showroom: { icon: Eye, label: 'Showroom', color: 'var(--gold-500)', desc: 'Physical product display location' },
  delivery_hub: { icon: Truck, label: 'Delivery Hub', color: 'var(--success)', desc: 'Last-mile distribution centre' },
};

const VISIBILITY_CONFIG = {
  hidden: {
    icon: EyeOff, label: 'Hidden',
    desc: 'Not shown to any other users',
    color: 'var(--ink-300)',
    bg: 'var(--surface-2)',
  },
  country_region: {
    icon: Globe, label: 'Country / Region',
    desc: 'Shows: "Netherlands, Noord-Holland"',
    color: 'var(--ink-500)',
    bg: 'var(--ink-50)',
  },
  city: {
    icon: MapPin, label: 'City level',
    desc: 'Shows: "Amsterdam, Netherlands" · Approximate pin',
    color: 'var(--info)',
    bg: 'var(--info-light)',
  },
  street_level: {
    icon: Navigation, label: 'Street level',
    desc: 'Full address + exact pin · Visible to verified members',
    color: 'var(--success)',
    bg: 'var(--success-light)',
  },
  verified_members: {
    icon: Shield, label: 'Verified Members only',
    desc: 'Street-level · Standard-tier verified only',
    color: 'var(--gold-500)',
    bg: 'var(--gold-50)',
  },
};

const MOCK_LOCATIONS = [
  {
    id: '1',
    location_type: 'registered' as const,
    label: 'Legal Office',
    address_line1: 'Herengracht 182',
    city: 'Amsterdam',
    region: 'Noord-Holland',
    postal_code: '1016 BR',
    country_code: 'NL',
    visibility: 'city' as const,
    address_verified: true,
    verified_method: 'kyb_match',
    geocode_status: 'verified',
    is_primary: false,
    delivery_radius_km: null,
  },
  {
    id: '2',
    location_type: 'warehouse' as const,
    label: 'Main Warehouse',
    address_line1: 'Waalhaven Oostzijde 12',
    city: 'Rotterdam',
    region: 'Zuid-Holland',
    postal_code: '3087 BM',
    country_code: 'NL',
    visibility: 'verified_members' as const,
    address_verified: true,
    verified_method: 'postcard',
    geocode_status: 'verified',
    is_primary: true,
    delivery_radius_km: 350,
    delivery_countries: ['NL', 'BE', 'DE', 'FR', 'LU'],
  },
  {
    id: '3',
    location_type: 'branch_office' as const,
    label: 'Germany Branch',
    address_line1: 'Kaiserswerther Str. 115',
    city: 'Düsseldorf',
    region: 'Nordrhein-Westfalen',
    postal_code: '40474',
    country_code: 'DE',
    visibility: 'hidden' as const,
    address_verified: false,
    verified_method: null,
    geocode_status: 'pending',
    is_primary: false,
    delivery_radius_km: null,
  },
];

function LocationCard({
  location,
  onEdit,
  onDelete,
  onSetPrimary,
}: {
  location: typeof MOCK_LOCATIONS[0];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = LOCATION_TYPE_CONFIG[location.location_type];
  const visConfig = VISIBILITY_CONFIG[location.visibility];
  const TypeIcon = typeConfig.icon;
  const VisIcon = visConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--surface-0)',
        border: `1.5px solid ${location.is_primary ? 'var(--gold-400)' : 'var(--border)'}`,
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: expanded ? '1px solid var(--border)' : 'none',
        cursor: 'pointer',
      }} onClick={() => setExpanded(!expanded)}>

        {/* Type icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `${typeConfig.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <TypeIcon size={20} style={{ color: typeConfig.color }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink-900)' }}>
              {location.label || typeConfig.label}
            </span>
            {location.is_primary && (
              <div className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
                PRIMARY
              </div>
            )}
            {location.address_verified ? (
              <div className="verified-badge" style={{ fontSize: '0.65rem' }}>
                <CheckCircle2 size={9} /> VERIFIED
              </div>
            ) : (
              <div className="badge" style={{ background: 'var(--warning-light)', color: 'var(--warning)', fontSize: '0.65rem', padding: '2px 7px' }}>
                <Clock size={9} /> UNVERIFIED
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} />
            {location.city}, {location.region} · {location.country_code}
          </div>
        </div>

        {/* Visibility badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 20,
          background: visConfig.bg, color: visConfig.color,
          fontSize: '0.78rem', fontWeight: 600,
          border: `1px solid ${visConfig.color}30`,
        }}>
          <VisIcon size={12} />
          {visConfig.label}
        </div>

        {/* Geocode */}
        <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-300)', textAlign: 'right', minWidth: 60 }}>
          {location.geocode_status === 'verified' ? '📍 geocoded' :
           location.geocode_status === 'pending' ? '⏳ geocoding' : '⚠️ failed'}
        </div>

        <ChevronDown size={16} style={{
          color: 'var(--ink-300)', transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }} />
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Address */}
              <div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-400)', letterSpacing: '0.06em', marginBottom: 10 }}>
                  FULL ADDRESS
                </div>
                <div style={{
                  background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px',
                  fontSize: '0.875rem', color: 'var(--ink-700)', lineHeight: 1.7,
                }}>
                  <div>{location.address_line1}</div>
                  <div>{location.postal_code} {location.city}</div>
                  <div>{location.region}</div>
                  <div style={{ fontWeight: 600 }}>{location.country_code}</div>
                </div>

                {/* Verification method */}
                {location.verified_method && (
                  <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={13} />
                    Verified via {location.verified_method === 'kyb_match' ? 'KYB registry match' :
                                  location.verified_method === 'postcard' ? 'physical postcard' : 'document upload'}
                  </div>
                )}

                {!location.address_verified && (
                  <div style={{
                    marginTop: 12, padding: '10px 14px',
                    background: 'var(--warning-light)', borderRadius: 8,
                    fontSize: '0.8rem', color: 'var(--warning)',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Address unverified</div>
                    <div>Unverified locations are excluded from geo-search results.</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="btn btn-sm" style={{
                        background: 'var(--warning)', color: 'white', border: 'none',
                        fontSize: '0.75rem', padding: '6px 12px',
                      }}>
                        <Mail size={12} />
                        Send Postcard
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                        <Upload size={12} />
                        Upload Document
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery settings */}
              <div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-400)', letterSpacing: '0.06em', marginBottom: 10 }}>
                  DELIVERY SETTINGS
                </div>
                {location.delivery_radius_km ? (
                  <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Truck size={14} style={{ color: 'var(--success)' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {location.delivery_radius_km} km radius
                      </span>
                    </div>
                    {(location as any).delivery_countries && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(location as any).delivery_countries.map((c: string) => (
                          <div key={c} className="country-chip" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px',
                    fontSize: '0.85rem', color: 'var(--ink-400)',
                  }}>
                    No delivery radius set
                  </div>
                )}

                {/* Visibility selector */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-400)', letterSpacing: '0.06em', marginBottom: 8 }}>
                    VISIBILITY
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(VISIBILITY_CONFIG).map(([key, cfg]) => {
                      const VIcon = cfg.icon;
                      const isSelected = key === location.visibility;
                      return (
                        <label key={key} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', borderRadius: 8,
                          border: `1px solid ${isSelected ? cfg.color + '60' : 'var(--border)'}`,
                          background: isSelected ? cfg.bg : 'transparent',
                          cursor: 'pointer',
                        }}>
                          <input type="radio" name={`vis-${location.id}`} defaultChecked={isSelected} style={{ display: 'none' }} />
                          <VIcon size={14} style={{ color: cfg.color }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: isSelected ? 600 : 400, color: 'var(--ink-800)' }}>
                              {cfg.label}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--ink-400)' }}>
                              {cfg.desc}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              padding: '12px 24px 16px',
              display: 'flex', gap: 10, alignItems: 'center',
              borderTop: '1px solid var(--border)',
            }}>
              <button className="btn btn-primary btn-sm" onClick={() => onEdit(location.id)}>
                <Edit2 size={13} />
                Edit Location
              </button>
              {!location.is_primary && (
                <button className="btn btn-outline btn-sm" onClick={() => onSetPrimary(location.id)}>
                  <Star size={13} />
                  Set as Primary
                </button>
              )}
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--error)', marginLeft: 'auto' }}
                onClick={() => onDelete(location.id)}
              >
                <Trash2 size={13} />
                Remove
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LocationsPage() {
  const [locations, setLocations] = useState(MOCK_LOCATIONS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocType, setNewLocType] = useState<keyof typeof LOCATION_TYPE_CONFIG>('warehouse');

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Business Locations</h2>
          <p style={{ color: 'var(--ink-500)', fontSize: '0.925rem' }}>
            Manage your registered office, warehouses, branches, and showrooms across Europe.
            Disclosed locations appear in proximity search results.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={{ flexShrink: 0 }}
        >
          <Plus size={16} />
          Add Location
        </button>
      </div>

      {/* GDPR notice */}
      <div style={{
        background: 'var(--info-light)', border: '1px solid rgba(26,95,180,0.2)',
        borderRadius: 12, padding: '14px 18px',
        display: 'flex', gap: 14, marginBottom: 28,
      }}>
        <Info size={18} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: '0.875rem', color: 'var(--ink-700)', lineHeight: 1.6 }}>
          <strong>Privacy by default:</strong> All new locations are set to <em>Hidden</em> until you choose to disclose them.
          Street-level visibility requires Standard-tier verification. Sole traders: your registered address may be your home address —
          please review privacy settings carefully before changing visibility.
          {' '}<a href="/privacy/location" style={{ color: 'var(--info)', textDecoration: 'underline' }}>Learn more →</a>
        </div>
      </div>

      {/* Location cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {locations.map(loc => (
          <LocationCard
            key={loc.id}
            location={loc}
            onEdit={(id) => console.log('edit', id)}
            onDelete={(id) => setLocations(l => l.filter(x => x.id !== id))}
            onSetPrimary={(id) => setLocations(l => l.map(x => ({ ...x, is_primary: x.id === id })))}
          />
        ))}
      </div>

      {/* Stats summary */}
      <div style={{
        marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
      }}>
        {[
          { label: 'Total locations', value: locations.length, icon: MapPin },
          { label: 'Verified', value: locations.filter(l => l.address_verified).length, icon: CheckCircle2 },
          { label: 'Visible in search', value: locations.filter(l => l.visibility !== 'hidden' && l.address_verified).length, icon: Eye },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={{
            background: 'var(--surface-0)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Icon size={20} style={{ color: 'var(--gold-500)' }} />
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink-900)' }}>
                {value}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-400)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Location Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(8,12,26,0.7)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
            onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              style={{
                background: 'var(--surface-0)', borderRadius: 20,
                padding: 32, width: '100%', maxWidth: 580,
                maxHeight: '90vh', overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0 }}>Add Business Location</h3>
                <button onClick={() => setShowAddModal(false)} className="btn btn-ghost btn-sm" style={{ padding: 8 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Location type selection */}
              <div style={{ marginBottom: 24 }}>
                <label className="label">Location Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(LOCATION_TYPE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const isSelected = key === newLocType;
                    return (
                      <button
                        key={key}
                        onClick={() => setNewLocType(key as any)}
                        style={{
                          padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                          border: `1.5px solid ${isSelected ? cfg.color : 'var(--border)'}`,
                          background: isSelected ? `${cfg.color}0F` : 'var(--surface-0)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Icon size={15} style={{ color: cfg.color }} />
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--ink-800)' }}>
                            {cfg.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--ink-400)' }}>{cfg.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Address form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Internal label (optional)</label>
                  <input className="input" placeholder="e.g. Amsterdam Warehouse, Berlin Branch" />
                </div>

                <div>
                  <label className="label">Address line 1 *</label>
                  <input className="input" placeholder="Street and number" />
                </div>

                <div>
                  <label className="label">Address line 2</label>
                  <input className="input" placeholder="Floor, suite, unit (optional)" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">City *</label>
                    <input className="input" placeholder="City" />
                  </div>
                  <div>
                    <label className="label">Postal code *</label>
                    <input className="input" placeholder="Postal / ZIP code" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Region / State</label>
                    <input className="input" placeholder="Region, province, Bundesland" />
                  </div>
                  <div>
                    <label className="label">Country *</label>
                    <select className="input">
                      {[['NL','🇳🇱 Netherlands'], ['DE','🇩🇪 Germany'], ['FR','🇫🇷 France'],
                        ['GB','🇬🇧 United Kingdom'], ['BE','🇧🇪 Belgium'], ['IT','🇮🇹 Italy'],
                        ['ES','🇪🇸 Spain'], ['PL','🇵🇱 Poland'], ['AT','🇦🇹 Austria']
                      ].map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Delivery (for warehouses) */}
                {(newLocType === 'warehouse' || newLocType === 'delivery_hub') && (
                  <div>
                    <label className="label">
                      <Truck size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Delivery radius (km)
                    </label>
                    <input className="input" type="number" placeholder="e.g. 250" min={0} max={5000} />
                    <p style={{ fontSize: '0.78rem', color: 'var(--ink-400)', marginTop: 4 }}>
                      Buyers will see a delivery coverage circle on the map
                    </p>
                  </div>
                )}

                {/* Privacy warning for street-level */}
                <div style={{
                  background: 'var(--info-light)', borderRadius: 10, padding: '12px 14px',
                  fontSize: '0.8rem', color: 'var(--ink-700)',
                  display: 'flex', gap: 10,
                }}>
                  <Info size={15} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    New location will be set to <strong>Hidden</strong> by default. You can change visibility after the address is geocoded and verified.
                    Geocoding typically completes within 1–2 minutes.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary">
                  <Plus size={15} />
                  Add Location
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
