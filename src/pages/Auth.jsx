import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/index.js'
import {
  createIdentity,
  setupTOTP,
  verifyTOTP,
  generateBackupCodes,
  truncateDID,
} from '../lib/identity.js'

export default function Auth() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setIdentity = useStore(s => s.setIdentity)
  const storedId = useStore(s => s.identity)
  const storedTOTP = useStore(s => s.totpSecret)

  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [alias, setAlias] = useState('')
  const [pass, setPass] = useState('')
  const [passC, setPassC] = useState('')
  const [newId, setNewId] = useState(null)
  const [totp, setTotp] = useState(null)
  const [totpToken, setTotpToken] = useState('')
  const [codes, setCodes] = useState([])
  const [loginOTP, setLoginOTP] = useState('')

  async function doRegister() {
    setError('')

    if (step === 0) {
      if (!alias.trim()) return setError('Alias required')
      if (pass.length < 12) return setError('Passphrase min 12 characters')
      if (pass !== passC) return setError('Passphrases do not match')

      setLoading(true)
      try {
        const id = await createIdentity(alias.trim())
        const t = await setupTOTP(id.did, alias.trim())
        const c = generateBackupCodes()
        setNewId(id)
        setTotp(t)
        setCodes(c)
        setStep(1)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    } else if (step === 1) {
      if (!totp?.secret) return setError('TOTP secret missing')
      const ok = await verifyTOTP(totpToken, totp.secret)
      if (!ok) return setError('Invalid code — open Google Authenticator, enter the current 6-digit code for Q-IDChain')
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else {
      setIdentity(newId, totp.secret, codes)
      navigate('/app')
    }
  }

  async function doLogin() {
    setError('')
    if (!storedId) return setError('No identity found on this device. Please register first.')

    if (storedTOTP) {
      const ok = await verifyTOTP(loginOTP, storedTOTP)
      if (!ok) return setError('Invalid Google Authenticator code')
    }

    setIdentity(storedId, storedTOTP, [])
    navigate('/app')
  }

  const steps = ['Identity', '2FA Setup', 'Backup', 'Done']

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-void)', padding: 24 }}>
      <div className="hex-grid-bg" style={{ position: 'fixed', inset: 0, opacity: .18 }} />
      <div className="cyber-card" style={{ width: '100%', maxWidth: 440, padding: 30, position: 'relative', zIndex: 5 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', letterSpacing: '0.1em', marginBottom: 12 }}>
            <span style={{ color: 'var(--cyan)' }}>Q-ID</span><span style={{ color: 'var(--purple)' }}>Chain</span>
          </div>

          <div style={{ display: 'flex', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {['register', 'login'].map(m => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setStep(0)
                  setError('')
                  setLoginOTP('')
                  setTotpToken('')
                }}
                style={{
                  flex: 1,
                  padding: '9px',
                  background: mode === m ? 'var(--cyan-glow)' : 'transparent',
                  border: 'none',
                  color: mode === m ? 'var(--cyan)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  letterSpacing: '0.07em',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.14s',
                }}
              >
                {m === 'register' ? 'CREATE DID' : 'SIGN IN'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: '9px 13px', borderRadius: 8, marginBottom: 14, background: 'var(--red-glow)', border: '1px solid rgba(255,59,92,.3)', color: 'var(--red)', fontSize: '0.83rem' }}>
            ⚠ {error}
          </div>
        )}

        {mode === 'register' && (
          <>
            <div style={{ display: 'flex', gap: 5, marginBottom: 22 }}>
              {steps.map((l, i) => (
                <div key={l} style={{ flex: 1 }}>
                  <div style={{ height: 3, borderRadius: 2, background: i <= step ? 'var(--cyan)' : 'var(--border)', transition: 'background 0.3s' }} />
                  <div style={{ fontSize: '0.58rem', color: i === step ? 'var(--cyan)' : 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)', textAlign: 'center', letterSpacing: '0.05em' }}>
                    {l}
                  </div>
                </div>
              ))}
            </div>

            {step === 0 && (
              <>
                <label style={labelStyle}>DISPLAY ALIAS</label>
                <input className="cyber-input" placeholder="e.g. alice" value={alias} onChange={e => setAlias(e.target.value)} style={inputStyle} />

                <label style={labelStyle}>PASSPHRASE (min 12 chars)</label>
                <input className="cyber-input" type="password" placeholder="Strong passphrase..." value={pass} onChange={e => setPass(e.target.value)} style={inputStyle} />

                <input className="cyber-input" type="password" placeholder="Confirm passphrase..." value={passC} onChange={e => setPassC(e.target.value)} style={inputStyle} />

                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
                  Your DID + Kyber-768 keypair generated locally. Passphrase encrypts your keys — we never see it.
                </p>
              </>
            )}

            {step === 1 && totp && (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                  Scan with <strong style={{ color: 'var(--cyan)' }}>Google Authenticator</strong>:
                </p>

                <div style={{ textAlign: 'center', marginBottom: 14, background: 'var(--bg-deep)', borderRadius: 8, padding: 14 }}>
                  <img src={totp.qrDataUrl} alt="TOTP QR" style={{ width: 170, height: 170 }} />
                </div>

                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', marginBottom: 14, padding: '8px 10px', background: 'var(--bg-deep)', borderRadius: 6 }}>
                  SECRET: {totp.secret}
                </div>

                <label style={labelStyle}>ENTER 6-DIGIT CODE TO CONFIRM</label>
                <input
                  className="cyber-input"
                  placeholder="000000"
                  maxLength={6}
                  value={totpToken}
                  onChange={e => setTotpToken(e.target.value.replace(/\D/g, ''))}
                  style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.15rem' }}
                />

                <p style={{ fontSize: '0.72rem', color: 'var(--amber)', marginBottom: 10 }}>
                  ⚠ Only Google Authenticator / compatible TOTP apps. No SMS.
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Save these backup codes securely — each can only be used once:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 14 }}>
                  {codes.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        color: 'var(--green)',
                        background: 'var(--green-glow)',
                        border: '1px solid rgba(0,255,136,.2)',
                        borderRadius: 6,
                        padding: '5px 9px',
                        textAlign: 'center',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: '0.72rem', color: 'var(--amber)' }}>⚠ Store offline — cannot be recovered.</p>
              </>
            )}

            {step === 3 && newId && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 44, marginBottom: 10, color: 'var(--green)' }}>✓</div>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--green)', letterSpacing: '0.1em', marginBottom: 8 }}>
                  IDENTITY CREATED
                </h3>
                <div style={{ padding: '10px 14px', background: 'var(--bg-deep)', borderRadius: 8, border: '1px solid var(--cyan-border)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan)', wordBreak: 'break-all' }}>
                  {truncateDID(newId.did, 22)}
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span className="badge purple">KYBER-768</span>
                  <span className="badge success">TOTP 2FA ON</span>
                  <span className="badge info">did:key</span>
                </div>
              </div>
            )}

            <button className="cyber-btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={doRegister} disabled={loading}>
              {loading ? <span className="animate-spin">⟳</span> : null}
              {step === 3 ? '⬡ ENTER Q-IDChain' : 'CONTINUE →'}
            </button>
          </>
        )}

        {mode === 'login' && (
          <>
            {storedId ? (
              <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(0,229,255,.05)', border: '1px solid var(--cyan-border)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  STORED IDENTITY
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 2 }}>{storedId.alias}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                  {truncateDID(storedId.did, 18)}
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px 13px', background: 'var(--amber-glow)', border: '1px solid rgba(255,183,0,.3)', borderRadius: 8, color: 'var(--amber)', fontSize: '0.82rem', marginBottom: 16 }}>
                ⚠ No identity on this device. Please Create a DID first.
              </div>
            )}

            <label style={labelStyle}>GOOGLE AUTHENTICATOR CODE</label>
            <input
              className="cyber-input"
              placeholder="000000"
              maxLength={6}
              value={loginOTP}
              onChange={e => setLoginOTP(e.target.value.replace(/\D/g, ''))}
              style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.1rem' }}
            />

            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Open Google Authenticator → enter the 6-digit code for Q-IDChain
            </p>

            <button className="cyber-btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={doLogin}>
              ◉ CONNECT IDENTITY
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Your private keys never leave your device.
        </p>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '0.68rem',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em',
  marginBottom: 5,
  marginTop: 10,
}

const inputStyle = { marginBottom: 8 }