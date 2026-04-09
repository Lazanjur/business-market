// apps/web/src/app/dashboard/page.tsx
'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, FileText, Bell, MapPin, Shield,
  Package, Users, Euro, Clock, ArrowRight, CheckCircle2,
  AlertCircle, ChevronRight, Building2, Globe2, Star,
  MessageSquare, Zap, BarChart3, Settings, LogOut,
  LayoutDashboard, Search, List, Award,
} from 'lucide-react';
import Link from 'next/link';

const STATS = [
  { label: 'Active Listings', value: '24', change: '+3', trend: 'up', icon: Package, color: 'var(--info)' },
  { label: 'Open Orders', value: '8', change: '+1', trend: 'up', icon: ShoppingCart, color: 'var(--success)' },
  { label: 'Pending RFQs', value: '5', change: '-2', trend: 'down', icon: FileText, color: 'var(--gold-500)' },
  { label: 'Revenue (MTD)', value: '€128K', change: '+12%', trend: 'up', icon: TrendingUp, color: 'var(--success)' },
];

const RECENT_ORDERS = [
  {
    id: 'IBM-2026-000234', buyer: 'TechMed Solutions GmbH', country: '🇩🇪',
    product: 'Industrial Sensor Array ×50', amount: 4450, currency: 'EUR',
    status: 'in_escrow', date: '2026-04-05',
  },
  {
    id: 'IBM-2026-000233', buyer: 'Construct NV', country: '🇧🇪',
    product: 'Steel Profiles 12m × 200', amount: 8900, currency: 'EUR',
    status: 'dispatched', date: '2026-04-04',
  },
  {
    id: 'IBM-2026-000231', buyer: 'GreenEnergy Ltd', country: '🇬🇧',
    product: 'Solar Mounting Rails × 500', amount: 3200, currency: 'GBP',
    status: 'completed', date: '2026-04-02',
  },
];

const ACTIVE_RFQS = [
  {
    id: 'RFQ-2026-000089', title: 'Industrial Rubber Gaskets — 10,000 units',
    responses: 3, deadline: '2026-04-12', budget: '€15,000',
    geoFilter: '🇩🇪 🇳🇱 🇧🇪',
  },
  {
    id: 'RFQ-2026-000091', title: 'Logistics Packaging Materials — Q2 2026',
    responses: 7, deadline: '2026-04-15', budget: 'Negotiable',
    geoFilter: 'Within 200km of Frankfurt',
  },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--ink-300)',
  confirmed: 'var(--info)',
  in_escrow: 'var(--warning)',
  dispatched: 'var(--gold-500)',
  delivered: 'var(--success)',
  completed: 'var(--success)',
  disputed: 'var(--error)',
};

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', active: true },
  { href: '/marketplace', icon: Search, label: 'Marketplace' },
  { href: '/dashboard/listings', icon: Package, label: 'My Listings' },
  { href: '/dashboard/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/dashboard/rfq', icon: FileText, label: 'RFQ' },
  { href: '/dashboard/messages', icon: MessageSquare, label: 'Messages', badge: 3 },
  { href: '/dashboard/procurement', icon: Building2, label: 'Procurement' },
  { href: '/account/locations', icon: MapPin, label: 'Locations' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-1)' }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside style={{
        width: sidebarCollapsed ? 64 : 240,
        background: 'var(--ink-900)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        transition: 'width 0.25s var(--ease-out)',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, background: 'var(--gold-500)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--ink-900)' }}>IB</span>
          </div>
          {!sidebarCollapsed && (
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'white', fontSize: '1rem', whiteSpace: 'nowrap' }}>
              Marketplace
            </span>
          )}
        </div>

        {/* Company info */}
        {!sidebarCollapsed && (
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'linear-gradient(135deg, var(--ink-600), var(--ink-500))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>SD</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  SensorDistrib BV
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem' }}>
                  <div className="verified-badge" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                    PREMIUM
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>🇳🇱 NL</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`sidebar-nav-item ${item.active ? 'active' : ''}`}>
                <Icon size={18} />
                {!sidebarCollapsed && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <div style={{
                        minWidth: 18, height: 18, borderRadius: 9,
                        background: 'var(--error)', color: 'white',
                        fontSize: '0.65rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px',
                      }}>
                        {item.badge}
                      </div>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/account/settings" className="sidebar-nav-item">
            <Settings size={18} />
            {!sidebarCollapsed && <span>Settings</span>}
          </Link>
          <button className="sidebar-nav-item" style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--ink-400)' }}>
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '32px 32px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Good morning, SensorDistrib 👋</h2>
            <p style={{ color: 'var(--ink-500)', fontSize: '0.925rem' }}>
              Monday, 6 April 2026 · Trust score: <strong style={{ color: 'var(--gold-500)' }}>870/1000</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" style={{ position: 'relative' }}>
              <Bell size={16} />
              <div style={{
                position: 'absolute', top: -4, right: -4,
                width: 16, height: 16, borderRadius: 8,
                background: 'var(--error)', color: 'white',
                fontSize: '0.6rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>5</div>
            </button>
            <Link href="/marketplace/listings/new" className="btn btn-gold btn-sm">
              <Zap size={15} />
              New Listing
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{
                  background: 'var(--surface-0)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '20px 22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `${stat.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} style={{ color: stat.color }} />
                  </div>
                  <div style={{
                    fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                    color: stat.trend === 'up' ? 'var(--success)' : 'var(--error)',
                    background: stat.trend === 'up' ? 'var(--success-light)' : 'var(--error-light)',
                    padding: '2px 7px', borderRadius: 10,
                  }}>
                    {stat.change}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink-900)', marginBottom: 4 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-400)' }}>{stat.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Two-column content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>

          {/* Orders */}
          <div style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 14 }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600 }}>
                Recent Orders
              </h4>
              <Link href="/dashboard/orders" style={{ fontSize: '0.82rem', color: 'var(--info)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <table className="table-ib">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Buyer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_ORDERS.map(order => (
                  <tr key={order.id} style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-500)' }}>
                        {order.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{order.country}</span>
                        <span style={{ fontWeight: 500 }}>{order.buyer}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 160 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--ink-600)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                        {order.product}
                      </span>
                    </td>
                    <td>
                      <span className="price" style={{ fontSize: '0.9rem' }}>
                        {order.currency} {order.amount.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20,
                        background: `${STATUS_COLORS[order.status]}18`,
                        color: STATUS_COLORS[order.status],
                        fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {order.status.replace('_', ' ')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Location status */}
            <div style={{
              background: 'var(--surface-0)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4 style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600 }}>
                  📍 Location Status
                </h4>
                <Link href="/account/locations" style={{ fontSize: '0.78rem', color: 'var(--info)', textDecoration: 'none' }}>
                  Manage →
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { type: 'Registered Office', city: 'Amsterdam, NL', status: 'verified', visibility: 'city' },
                  { type: 'Warehouse', city: 'Rotterdam, NL', status: 'verified', visibility: 'verified_members' },
                  { type: 'Branch Office', city: 'Düsseldorf, DE', status: 'unverified', visibility: 'hidden' },
                ].map((loc, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8,
                    background: 'var(--surface-2)',
                  }}>
                    <MapPin size={13} style={{ color: loc.status === 'verified' ? 'var(--gold-500)' : 'var(--ink-300)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {loc.type}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>
                        {loc.city}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.65rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                      color: loc.status === 'verified' ? 'var(--success)' : 'var(--warning)',
                      background: loc.status === 'verified' ? 'var(--success-light)' : 'var(--warning-light)',
                      padding: '2px 6px', borderRadius: 6,
                    }}>
                      {loc.visibility.toUpperCase().replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active RFQs */}
            <div style={{
              background: 'var(--surface-0)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4 style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600 }}>
                  Open RFQs
                </h4>
                <Link href="/dashboard/rfq" style={{ fontSize: '0.78rem', color: 'var(--info)', textDecoration: 'none' }}>
                  View all →
                </Link>
              </div>
              {ACTIVE_RFQS.map(rfq => (
                <div key={rfq.id} style={{
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-800)', marginBottom: 6, lineHeight: 1.4 }}>
                    {rfq.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>
                      {rfq.responses} responses
                    </span>
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-200)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>
                      {rfq.geoFilter}
                    </span>
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-200)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                      Due {rfq.deadline}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust score */}
            <div style={{
              background: 'linear-gradient(135deg, var(--ink-800) 0%, var(--ink-700) 100%)',
              borderRadius: 14, padding: '18px 20px',
              border: '1px solid var(--ink-600)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Trust Score
                </span>
                <Award size={16} style={{ color: 'var(--gold-400)' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: 'var(--gold-400)', marginBottom: 4 }}>
                870
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{ width: '87%', height: '100%', background: 'linear-gradient(90deg, var(--gold-400), var(--gold-500))', borderRadius: 3 }} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>/ 1000</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                Premium tier · KYB verified · 3 locations verified
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
