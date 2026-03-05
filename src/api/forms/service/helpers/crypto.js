import crypto from 'node:crypto'

import { config } from '~/src/config/index.js'

/**
 * @param {string} secretValue - cleartext secret value
 * @returns {string} base64-encoded result
 */
export function encryptSecret(secretValue) {
  const publicKeyEncoded = config.get('publicKeyForSecrets')
  if (!publicKeyEncoded) {
    throw new Error('Public key is missing')
  }
  const publicKey = Buffer.from(publicKeyEncoded, 'base64').toString()
  const buffer = Buffer.from(secretValue)
  const encrypted = crypto.publicEncrypt(publicKey, buffer)
  return encrypted.toString('base64')
}
