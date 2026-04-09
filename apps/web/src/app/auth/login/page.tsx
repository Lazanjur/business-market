// apps/web/src/app/auth/login/page.tsx
'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    window.location.href = '/dashboard';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid', gridTemplateColumns: '1fr 480px',
      background: 'var(--ink-900)',
    }}>
      {/* Left: brand panel */}
      <div style={{
        background: 'linear-gradient(160deg, var(--ink-900) 0%, #0D2040 60%, #0F2A50 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '80px 80px',
        position: 'relative', overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Grid bg */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 80 }}>
            <div style={{ width: 36, height: 36, background: 'var(--gold-500)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink-900)' }}>IB</span>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'white', fontSize: '1.1rem' }}>
              Marketplace
            </span>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 style={{ color: 'white', marginBottom: 20, fontSize: 'clamp(2rem, 3vw, 3rem)' }}>
              Europe's verified<br />
              <span style={{ color: 'var(--gold-400)', fontStyle: 'italic' }}>B2B marketplace</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.75, maxWidth: 420, marginBottom: 56 }}>
              Sign in to access your dashboard, manage listings, respond to RFQs, and participate in public procurement across 20 European markets.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: '🔐', text: 'KYB-verified entities only' },
                { icon: '🌍', text: '20 countries · EU GDPR + UK GDPR' },
                { icon: '📍', text: 'Location-aware supplier discovery' },
              ].map(item => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.925rem' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right: form */}
      <div style={{
        background: 'var(--surface-0)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 48px',
      }}>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ marginBottom: 8 }}>Sign in</h2>
            <p style={{ color: 'var(--ink-500)', fontSize: '0.925rem' }}>
              B2B & B2G entities only · No consumer accounts
            </p>
          </div>

          {error && (
            <div style={{
              background: 'var(--error-light)', border: '1px solid rgba(184,32,32,0.2)',
              borderRadius: 10, padding: '12px 14px',
              display: 'flex', gap: 10, marginBottom: 20,
              fontSize: '0.875rem', color: 'var(--error)',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="label">Business email</label>
              <input
                type="email"
                className="input"
                placeholder="name@company.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ margin: 0 }}>Password</label>
                <Link href="/auth/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--info)', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--ink-400)',
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  animation: 'spin 0.8s linear infinite',
                }} />
              ) : (
                <>Sign in <ArrowRight size={17} /></>
              )}
            </button>
          </form>

          <div className="divider" />

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-500)', fontSize: '0.875rem', marginBottom: 16 }}>
              No account yet?
            </p>
            <Link href="/auth/register" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
              Register Your Business
            </Link>
          </div>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: '0.75rem', color: 'var(--ink-300)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
            BY SIGNING IN YOU AGREE TO OUR{' '}
            <a href="/terms" style={{ color: 'var(--ink-400)', textDecoration: 'underline' }}>TERMS OF USE</a>
            {' '}AND{' '}
            <a href="/privacy" style={{ color: 'var(--ink-400)', textDecoration: 'underline' }}>PRIVACY POLICY</a>
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
