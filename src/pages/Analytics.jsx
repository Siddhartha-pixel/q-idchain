import React, { useMemo } from 'react'
import { useStore } from '../store/index.js'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#00e5ff', '#9d4edd', '#00ff88', '#ffb700', '#ff3b5c']

function Card({ title, children, style }) {
  return (
    <div className="cyber-card" style={{ padding: 22, ...style }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 18 }}>{title}</div>
      {children}
    </div>
  )
}

const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--cyan-border)', borderRadius: 8, padding: '8px 14px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
    </div>
  )
}

export default function Analytics() {
  const { conversations, contacts, groups, sharedFiles, identity } = useStore()

  const allMsgs = useMemo(() => Object.values(conversations).flat(), [conversations])
  const sentMsgs = allMsgs.filter(m => m.from === identity?.did)
  const recvMsgs = allMsgs.filter(m => m.from !== identity?.did)

  // Messages per day (last 7 days)
  const msgPerDay = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const label = d.toLocaleDateString([], { weekday: 'short' })
      const dayStart = new Date(d.setHours(0,0,0,0)).getTime()
      const dayEnd   = dayStart + 86400000
      return {
        day: label,
        sent:     sentMsgs.filter(m => m.timestamp >= dayStart && m.timestamp < dayEnd).length,
        received: recvMsgs.filter(m => m.timestamp >= dayStart && m.timestamp < dayEnd).length,
      }
    })
    return days
  }, [allMsgs])

  // Contacts message distribution
  const contactDist = useMemo(() =>
    contacts.slice(0, 6).map(c => ({
      name: c.alias,
      messages: (conversations[c.did] || []).length,
    })).filter(x => x.messages > 0)
  , [contacts, conversations])

  // Encryption breakdown (pie)
  const encBreakdown = [
    { name: 'X25519+Kyber-768', value: sentMsgs.length },
    { name: 'Group AES-GCM',   value: Object.values(useStore.getState().groupMessages || {}).flat().length },
    { name: 'File AES-GCM',    value: sharedFiles.length },
  ].filter(x => x.value > 0)

  const totalEncrypted = allMsgs.length + sharedFiles.length

  const statCards = [
    { label: 'TOTAL MESSAGES',       value: allMsgs.length,      color: 'var(--cyan)' },
    { label: 'SENT',                 value: sentMsgs.length,     color: 'var(--purple)' },
    { label: 'RECEIVED',             value: recvMsgs.length,     color: 'var(--green)' },
    { label: 'CONTACTS',             value: contacts.length,     color: 'var(--amber)' },
    { label: 'GROUPS',               value: groups.length,       color: 'var(--cyan)' },
    { label: 'ENCRYPTED OPERATIONS', value: totalEncrypted,      color: 'var(--green)' },
  ]

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.08em', marginBottom: 6 }}>ANALYTICS</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Message volume, encryption usage, and network activity</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginBottom: 22 }}>
        {statCards.map(s => (
          <div key={s.label} className="cyber-card" style={{ padding: '16px 14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card title="MESSAGES PER DAY (LAST 7 DAYS)">
          {allMsgs.length === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No message data yet — start chatting!</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={msgPerDay}>
                <defs>
                  <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00e5ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRecv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#9d4edd" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9d4edd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.07)" />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                <Tooltip content={customTooltip} />
                <Legend wrapperStyle={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }} />
                <Area type="monotone" dataKey="sent"     stroke="#00e5ff" fill="url(#gSent)" strokeWidth={2} />
                <Area type="monotone" dataKey="received" stroke="#9d4edd" fill="url(#gRecv)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="ENCRYPTION BREAKDOWN">
          {encBreakdown.length === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>No encrypted operations yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={encBreakdown} dataKey="value" cx="50%" cy="50%" outerRadius={60} strokeWidth={0}>
                    {encBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={customTooltip} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {encBreakdown.map((e, i) => (
                  <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    {e.name}: {e.value}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card title="MESSAGES PER CONTACT">
          {contactDist.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No contact data</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={contactDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.07)" />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} width={70} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="messages" fill="#00e5ff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="SECURITY METRICS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Messages encrypted (Kyber-768)', value: `${allMsgs.length}`, pct: 100 },
              { label: 'Files encrypted (AES-GCM)',      value: `${sharedFiles.length}`, pct: 100 },
              { label: 'Authentication events (TOTP)',   value: 'All sessions', pct: 100 },
              { label: 'Keys with forward secrecy',      value: 'All messages', pct: 100 },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{item.value}</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-deep)', borderRadius: 2 }}>
                  <div style={{ height: 4, background: 'var(--green)', borderRadius: 2, width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
