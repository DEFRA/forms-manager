/*
  WARNING: this file is imported by migrate-mongo which does not use babel. Avoid importing assets from the wider project as they'll use tilde imports.
*/
import tls from 'node:tls'

/**
 * @type {SecureContext}
 */
export let secureContext

/**
 * Prepares the TLS secure context
 * @returns
 * @param {(arg: string) => void} loggerFn
 */
export function prepareSecureContext(loggerFn) {
  const originalCreateSecureContext = tls.createSecureContext

  tls.createSecureContext = function (options = {}) {
    const trustStoreCerts = getTrustStoreCerts(process.env)

    if (!trustStoreCerts.length) {
      loggerFn('Could not find any TRUSTSTORE_ certificates')
    }

    const originalSecureContext = originalCreateSecureContext(options)

    trustStoreCerts.forEach((cert) => {
      // eslint-disable-next-line -- Node.js API not documented
      originalSecureContext.context.addCACert(cert)
    })

    return originalSecureContext
  }

  secureContext = tls.createSecureContext()

  return secureContext
}

/**
 * Get base64 certs from all environment variables starting with TRUSTSTORE_
 * @param {NodeJS.ProcessEnv} envs
 * @returns {string[]}
 */
export function getTrustStoreCerts(envs) {
  return Object.entries(envs)
    .map(([key, value]) => key.startsWith('TRUSTSTORE_') && value)
    .filter(
      /** @returns {envValue is string} */
      (envValue) => Boolean(envValue)
    )
    .map((envValue) => Buffer.from(envValue, 'base64').toString().trim())
}

/**
 * @import { SecureContext } from 'node:tls'
 */
