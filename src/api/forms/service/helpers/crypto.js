import crypto from 'node:crypto'

import { config } from '~/src/config/index.js'

/**
 * @param {string} secretValue - cleartext secret value
 * @returns {string} base64-encoded result
 */
export function encryptSecret(secretValue) {
  const publicKey = config.get('publicKeyForSecrets')
  if (!publicKey) {
    throw new Error('Public key is missing')
  }
  const buffer = Buffer.from(secretValue)
  const encrypted = crypto.publicEncrypt(publicKey, buffer)
  return encrypted.toString('base64')
}
