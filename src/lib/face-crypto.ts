import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getKey(): Buffer {
  const hex = process.env.FACE_ENCRYPTION_KEY
  if (!hex) throw new Error('FACE_ENCRYPTION_KEY env var is missing')
  const buf = Buffer.from(hex, 'hex')
  if (buf.length !== 32) throw new Error('FACE_ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
  return buf
}

function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`
}

function decrypt(encrypted: string): string {
  const key = getKey()
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted format')
  const iv = Buffer.from(parts[0], 'base64')
  const authTag = Buffer.from(parts[1], 'base64')
  const ciphertext = Buffer.from(parts[2], 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  try {
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new Error('Decryption failed — key mismatch or data corrupted')
  }
}

export function encryptDescriptor(descriptor: number[]): string {
  return encrypt(JSON.stringify(descriptor))
}

export function decryptDescriptor(encrypted: string): number[] {
  return JSON.parse(decrypt(encrypted)) as number[]
}

export function encryptFaceData(faceData: unknown): string {
  return encrypt(JSON.stringify(faceData))
}

export function decryptFaceData(encrypted: string): unknown {
  return JSON.parse(decrypt(encrypted))
}
