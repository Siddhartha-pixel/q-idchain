import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/index.js'
import { encryptFileBytes, hybridEncrypt } from '../lib/crypto.js'
import { sendFileShare, onFileReceived } from '../lib/socket.js'

function formatSize(b) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

function fileIcon(type) {
  if (!type) return '📄'
  if (type.startsWith('image/')) return '🖼'
  if (type.startsWith('video/')) return '🎬'
  if (type.startsWith('audio/')) return '🎵'
  if (type === 'application/pdf') return '📕'
  if (type.includes('zip') || type.includes('tar')) return '🗜'
  return '📄'
}

function bytesToBase64(bytes) {
  if (!bytes) return ''
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < arr.length; i += chunkSize) {
    binary += String.fromCharCode(...arr.subarray(i, i + chunkSize))
  }

  return btoa(binary)
}

export default function Files() {
  const { identity, contacts, sharedFiles, addFile } = useStore()
  const [selectedContact, setSelectedContact] = useState('')
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    const off = onFileReceived(payload => {
      addFile({
        ...payload,
        status: 'received',
      })
    })

    return off
  }, [addFile])

  async function handleUpload() {
    if (!file) {
      setError('Select a file first')
      return
    }

    if (!identity?.did || !identity?.alias || !identity?.keyBundle?.classical?.publicKey) {
      setError('Identity keys not ready')
      return
    }

    if (!selectedContact) {
      setError('Select a recipient')
      return
    }

    setError('')
    setProgress('Encrypting…')

    try {
      const arrayBuffer = await file.arrayBuffer()

      setProgress('Applying AES-GCM encryption…')
      const { encrypted, fek, iv, algorithm } = await encryptFileBytes(arrayBuffer)

      const contact = contacts.find(c => c.did === selectedContact)
      const recipPK = contact?.classicalPublicKey

      if (!recipPK) {
        throw new Error('Recipient public key missing')
      }

      setProgress('Wrapping file key…')
      const encFEK = hybridEncrypt(bytesToBase64(fek), recipPK)

      setProgress('Uploading to IPFS…')
      const formData = new FormData()
      formData.append(
        'file',
        new Blob([encrypted], { type: file.type || 'application/octet-stream' }),
        file.name
      )

      const jwt = import.meta.env.VITE_PINATA_JWT
      if (!jwt) {
        throw new Error('Missing VITE_PINATA_JWT')
      }

      const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Pinata upload failed: ${text}`)
      }

      const json = await res.json()
      const cid = json.IpfsHash

      const fileRecord = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        cid,
        algorithm,
        encryptedFEK: encFEK,
        iv: bytesToBase64(iv),
        fromDid: identity.did,
        fromAlias: identity.alias,
        toDid: selectedContact,
        sharedWith: selectedContact,
        sharedWithAlias: contact?.alias || selectedContact,
        uploadedAt: Date.now(),
        status: 'uploaded',
      }

      addFile(fileRecord)
      sendFileShare(fileRecord)

      setProgress(null)
      setFile(null)
      setSelectedContact('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      setProgress(null)
      setError(e.message || 'Upload failed')
    }
  }

  const gatewayBase = import.meta.env.VITE_GATEWAY_URL
    ? `https://${import.meta.env.VITE_GATEWAY_URL}`
    : 'https://ipfs.io'

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.08em', marginBottom: 6 }}>
          ENCRYPTED FILES
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Files encrypted with AES-GCM, key wrapped in Kyber-768 hybrid scheme, stored on IPFS.
        </p>
      </div>

      <div className="cyber-card" style={{ padding: 24, marginBottom: 22 }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 16 }}>
          ENCRYPT & SHARE FILE
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? 'var(--cyan)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: 14,
            background: file ? 'var(--cyan-glow)' : 'transparent',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>{file ? fileIcon(file.type) : '◰'}</div>
          <div style={{ fontSize: '0.88rem', color: file ? 'var(--cyan)' : 'var(--text-muted)' }}>
            {file ? `${file.name} (${formatSize(file.size)})` : 'Click to select file'}
          </div>

          <input
            ref={fileRef}
            type="file"
            style={{ display: 'none' }}
            onChange={e => {
              const nextFile = e.target.files?.[0] || null
              setFile(nextFile)
              setError('')
            }}
          />
        </div>

        <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 5 }}>
          RECIPIENT
        </label>
        <select
          className="cyber-input"
          value={selectedContact}
          onChange={e => setSelectedContact(e.target.value)}
          style={{ marginBottom: 14 }}
        >
          <option value="">Select contact…</option>
          {contacts.map(c => (
            <option key={c.did} value={c.did}>
              {c.alias}
            </option>
          ))}
        </select>

        {error && (
          <div style={{ padding: '8px 12px', background: 'var(--red-glow)', border: '1px solid rgba(255,59,92,.3)', borderRadius: 8, color: 'var(--red)', fontSize: '0.82rem', marginBottom: 10 }}>
            ⚠ {error}
          </div>
        )}

        {progress && (
          <div style={{ padding: '8px 12px', background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)', borderRadius: 8, color: 'var(--cyan)', fontSize: '0.82rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="animate-spin">⟳</span> {progress}
          </div>
        )}

        <button
          className="cyber-btn primary"
          onClick={handleUpload}
          disabled={!file || !selectedContact || !!progress}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          ◰ ENCRYPT & UPLOAD TO IPFS
        </button>
      </div>

      <div className="cyber-card" style={{ padding: 24 }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 16 }}>
          SHARED FILES ({sharedFiles.length})
        </div>

        {sharedFiles.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '30px 0' }}>
            No files shared yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sharedFiles.map(f => (
              <div
                key={f.id}
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-surface)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 24 }}>{fileIcon(f.type)}</div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 3 }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatSize(f.size)} · {f.algorithm} · IPFS: {f.cid.slice(0, 16)}…
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {f.fromAlias ? (
                        <>From <strong style={{ color: 'var(--cyan)' }}>{f.fromAlias}</strong></>
                      ) : (
                        <>Shared with <strong style={{ color: 'var(--cyan)' }}>{f.sharedWithAlias}</strong></>
                      )}{' '}
                      · {new Date(f.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span className="badge success" style={{ fontSize: '0.6rem' }}>
                    ✓ ENCRYPTED
                  </span>
                  <span className="badge info" style={{ fontSize: '0.6rem' }}>
                    IPFS
                  </span>
                  <a
                    href={`${gatewayBase}/ipfs/${f.cid}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.68rem', color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}
                  >
                    VIEW ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}