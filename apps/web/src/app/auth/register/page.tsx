// apps/web/src/app/auth/register/page.tsx
'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, ArrowRight, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const COUNTRIES = [
  ['AT', '🇦🇹 Austria'], ['BE', '🇧🇪 Belgium'], ['CY', '🇨🇾 Cyprus'],
  ['CZ', '🇨🇿 Czech Republic'], ['DE', '🇩🇪 Germany'], ['DK', '🇩🇰 Denmark'],
  ['ES', '🇪🇸 Spain'], ['FI', '🇫🇮 Finland'], ['FR', '🇫🇷 France'],
  ['GB', '🇬🇧 United Kingdom'], ['GR', '🇬🇷 Greece'], ['HR', '🇭🇷 Croatia'],
  ['HU', '🇭🇺 Hungary'], ['IE', '🇮🇪 Ireland'], ['IT', '🇮🇹 Italy'],
  ['LU', '🇱🇺 Luxembourg'], ['NL', '🇳🇱 Netherlands'], ['PL', '🇵🇱 Poland'],
  ['PT', '🇵🇹 Portugal'], ['RO', '🇷🇴 Romania'], ['SE', '🇸🇪 Sweden'],
  ['SK', '🇸🇰 Slovakia'], ['SI', '🇸🇮 Slovenia'],
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    window.location.href = '/dashboard';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid', gridTemplateColumns: '1fr 520px',
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
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--gold-500), var(--gold-700))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1.1rem', color: 'var(--ink-900)',
            }}>IB</div>
            <span style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>Marketplace</span>
          </div>

          <div style={{ marginBottom: 40 }}>
            <p style={{ color: 'var(--gold-500)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.12em', marginBottom: 16 }}>
              JOIN THE PLATFORM
            </p>
            <h1 style={{ color: 'white', fontSize: '2.6rem', fontWeight: 700, lineHeight: 1.15, marginBottom: 20 }}>
              Start trading across<br />
              <em style={{ color: 'var(--gold-500)', fontStyle: 'italic' }}>20 European markets.</em>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.7 }}>
              KYB-verified registration. Your company is verified against national registries within 24 hours.
            </p>
          </div>

          {/* Benefits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: <Shield size={16} />, text: 'KYB verification in 24 hours' },
              { icon: <Building2 size={16} />, text: 'Access to 12,400+ verified suppliers' },
              { icon: <CheckCircle2 size={16} />, text: 'EU GDPR + UK GDPR compliant' },
              { icon: '📍', text: 'Location-aware supplier discovery' },
              { icon: '📋', text: 'RFQ & public procurement tenders' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1rem', color: 'var(--gold-500)' }}>{item.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.925rem' }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Step indicator */}
          <div style={{ marginTop: 48, display: 'flex', gap: 8, alignItems: 'center' }}>
            {[1, 2].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: s === step ? 28 : 8, height: 8, borderRadius: 4,
                  background: s <= step ? 'var(--gold-500)' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s ease',
                }} />
              </div>
            ))}
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
              STEP {step} OF 2
            </span>
          </div>
        </motion.div>
      </div>

      {/* Right: form */}
      <div style={{
        background: 'var(--surface-0)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 48px',
        overflowY: 'auto',
      }}>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ marginBottom: 8 }}>
              {step === 1 ? 'Company details' : 'Account credentials'}
            </h2>
            <p style={{ color: 'var(--ink-500)', fontSize: '0.925rem' }}>
              {step === 1
                ? 'B2B & B2G entities only · No consumer accounts'
                : 'Set your login email and a strong password'}
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
            {step === 1 ? (
              <>
                <div>
                  <label className="label">Legal company name</label>
                  <input type="text" className="input" placeholder="Acme GmbH" required autoComplete="organization" />
                </div>
                <div>
                  <label className="label">Country of registration</label>
                  <select className="input" required style={{ cursor: 'pointer' }}>
                    <option value="">Select country…</option>
                    {COUNTRIES.map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Company registration number</label>
                  <input type="text" className="input" placeholder="e.g. HRB 12345" required />
                </div>
                <div>
                  <label className="label">VAT number <span style={{ color: 'var(--ink-300)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="text" className="input" placeholder="e.g. DE123456789" />
                </div>
                <div>
                  <label className="label">Entity type</label>
                  <select className="input" required style={{ cursor: 'pointer' }}>
                    <option value="">Select type…</option>
                    <option value="private">Private company (B2B)</option>
                    <option value="public">Public authority (B2G)</option>
                    <option value="ngo">NGO / Association</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label">Business email</label>
                  <input type="email" className="input" placeholder="name@company.com" required autoComplete="email" />
                </div>
                <div>
                  <label className="label">Full name</label>
                  <input type="text" className="input" placeholder="Your full name" required autoComplete="name" />
                </div>
                <div>
                  <label className="label">Job title</label>
                  <input type="text" className="input" placeholder="e.g. Procurement Manager" />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input"
                      placeholder="Min. 12 characters"
                      required
                      minLength={12}
                      autoComplete="new-password"
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
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--ink-500)', lineHeight: 1.5 }}>
                  <input type="checkbox" required style={{ marginTop: 3, flexShrink: 0 }} />
                  I agree to the{' '}
                  <a href="/terms" style={{ color: 'var(--info)', textDecoration: 'underline' }}>Terms of Use</a>
                  {' '}and{' '}
                  <a href="/privacy" style={{ color: 'var(--info)', textDecoration: 'underline' }}>Privacy Policy</a>
                </label>
              </>
            )}

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
              ) : step === 1 ? (
                <>Continue <ArrowRight size={17} /></>
              ) : (
                <>Create account <ArrowRight size={17} /></>
              )}
            </button>

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-outline"
                style={{ justifyContent: 'center' }}
              >
                Back
              </button>
            )}
          </form>

          <div className="divider" />
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-500)', fontSize: '0.875rem', marginBottom: 16 }}>
              Already have an account?
            </p>
            <Link href="/auth/login" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
              Sign in
            </Link>
          </div>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: '0.75rem', color: 'var(--ink-300)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
            KYB VERIFICATION REQUIRED · B2B & B2G ONLY · EU GDPR COMPLIANT
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
