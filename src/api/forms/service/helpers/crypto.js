import { JSEncrypt } from 'jsencrypt'

import { config } from '~/src/config/index.js'

/**
 * @param {string} secretValue - cleartext secret value
 * @returns {string} base64-encoded result
 */
export function encryptSecret(secretValue) {
  const crypt = new JSEncrypt()
  const publicKey = config.get('publicKeyForSecrets')
  if (!publicKey) {
    throw new Error('Public key is missing')
  }
  crypt.setPublicKey(publicKey)
  const encrypted = crypt.encrypt(secretValue)
  if (encrypted === false) {
    throw new Error('Error during encryption')
  }
  return /** @type {string} */ (crypt.encrypt(secretValue))
}

