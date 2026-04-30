/**
 * Q-IDChain — Identity & TOTP 2FA
 *
 * Pure WebCrypto TOTP implementation — zero Node.js dependencies.
 * Fully compatible with Google Authenticator, Authy, and all RFC 6238 apps.
 *
 * TOTP spec: RFC 6238 (TOTP) + RFC 4226 (HOTP) + RFC 4648 (Base32)
 */

import { generateKeyBundle } from './crypto.js'
import QRCode from 'qrcode'

// ─── Base32 (RFC 4648) ────────────────────────────────────────────────────────

const B32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const B32_MAP   = Object.fromEntries([...B32_CHARS].map((c, i) => [c, i]))

/** Encode bytes → base32 string */
function base32Encode(bytes) {
  let bits = 0, value = 0, out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out  += B32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32_CHARS[(value << (5 - bits)) & 31]
  // Pad to multiple of 8
  while (out.length % 8 !== 0) out += '='
  return out
}

/** Decode base32 string → Uint8Array */
function base32Decode(str) {
  // Strip padding, spaces, dashes; uppercase
  const s    = str.toUpperCase().replace(/[= \-]/g, '')
  const bytes = []
  let bits = 0, value = 0
  for (const ch of s) {
    if (!(ch in B32_MAP)) throw new Error(`Invalid base32 character: ${ch}`)
    value = (value << 5) | B32_MAP[ch]
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return new Uint8Array(bytes)
}

// ─── HOTP (RFC 4226) ─────────────────────────────────────────────────────────

/** Compute HOTP value for a given counter using HMAC-SHA1 via WebCrypto */
async function hotp(secretBase32, counter, digits = 6) {
  const keyBytes = base32Decode(secretBase32)

  // Encode counter as 8-byte big-endian
  const counterBuf = new ArrayBuffer(8)
  const view       = new DataView(counterBuf)
  // JS numbers are 53-bit safe — split into two 32-bit halves
  const hi = Math.floor(counter / 0x100000000)
  const lo = counter >>> 0
  view.setUint32(0, hi, false)
  view.setUint32(4, lo, false)

  // Import key for HMAC-SHA1
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign']
  )

  // Compute HMAC-SHA1
  const sig    = await crypto.subtle.sign('HMAC', cryptoKey, counterBuf)
  const hmac   = new Uint8Array(sig)

  // Dynamic truncation (RFC 4226 §5.4)
  const offset = hmac[hmac.length - 1] & 0x0f
  const code   = (
    ((hmac[offset]     & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) <<  8) |
     (hmac[offset + 3] & 0xff)
  ) % Math.pow(10, digits)

  return String(code).padStart(digits, '0')
}

// ─── TOTP (RFC 6238) ─────────────────────────────────────────────────────────

const TOTP_PERIOD = 30   // seconds
const TOTP_DIGITS = 6
const TOTP_WINDOW = 1    // accept ±1 time step to tolerate clock drift

/** Get current TOTP time step */
function timeStep(offset = 0) {
  return Math.floor((Date.now() / 1000 + offset * TOTP_PERIOD) / TOTP_PERIOD)
}

/** Generate the current TOTP code (useful for testing) */
export async function generateTOTPCode(secretBase32) {
  return hotp(secretBase32, timeStep(), TOTP_DIGITS)
}

/**
 * Verify a TOTP token against a base32 secret.
 * Checks current window ± TOTP_WINDOW steps to handle clock drift.
 */
export async function verifyTOTP(token, secretBase32) {
  const t = String(token).trim().replace(/\s/g, '')
  if (!/^\d{6}$/.test(t)) return false
  try {
    for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset++) {
      const expected = await hotp(secretBase32, timeStep(offset), TOTP_DIGITS)
      if (expected === t) return true
    }
    return false
  } catch (e) {
    console.error('[TOTP] verify error:', e)
    return false
  }
}

// ─── TOTP Setup ───────────────────────────────────────────────────────────────

/** Generate a cryptographically random base32 secret for TOTP */
function generateTOTPSecret(byteLength = 20) {
  const bytes = new Uint8Array(byteLength)
  globalThis.crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}

/**
 * Set up TOTP for a user — returns secret + QR code data URL.
 * Scan the QR with Google Authenticator to add the account.
 */
export async function setupTOTP(did, alias) {
  const secret  = generateTOTPSecret(20)
  const label   = encodeURIComponent(`${alias}@Q-IDChain`)
  const issuer  = encodeURIComponent('Q-IDChain')
  // RFC 6238 otpauth URI
  const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`

  const qrDataUrl = await QRCode.toDataURL(otpauth, {
    width: 220, margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#00e5ff', light: '#020408' },
  })

  return {
    secret,
    otpauth,
    qrDataUrl,
    algorithm: 'TOTP-HMAC-SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
  }
}

// ─── Backup Codes ─────────────────────────────────────────────────────────────

export function generateBackupCodes(n = 8) {
  return Array.from({ length: n }, () => {
    const b = new Uint8Array(5)
    globalThis.crypto.getRandomValues(b)
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
  })
}

// ─── DID ─────────────────────────────────────────────────────────────────────

export async function createIdentity(alias) {
  const keyBundle = generateKeyBundle()
  const did       = `did:key:z${keyBundle.classical.publicKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 44)}`

  const didDocument = {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: did,
    created: new Date().toISOString(),
    verificationMethod: [
      { id: `${did}#key-classical`, type: 'X25519KeyAgreementKey2020',  controller: did, publicKeyMultibase: `z${keyBundle.classical.publicKey}` },
      { id: `${did}#key-quantum`,   type: 'KyberKeyAgreement2024',      controller: did, publicKeyMultibase: `z${keyBundle.kyber.publicKey}` },
      { id: `${did}#key-signing`,   type: 'Ed25519VerificationKey2020', controller: did, publicKeyMultibase: `z${keyBundle.signing.publicKey}` },
    ],
    authentication: [`${did}#key-signing`],
    keyAgreement:   [`${did}#key-classical`, `${did}#key-quantum`],
  }

  return { did, alias, keyBundle, didDocument, createdAt: Date.now(), status: 'active' }
}

export function truncateDID(did, n = 20) {
  if (!did || did.length <= n * 2) return did || ''
  return `${did.slice(0, n)}…${did.slice(-10)}`
}
