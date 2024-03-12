/**
 * Get base64 certs from all environment variables starting with TRUSTSTORE_
 * @param {string[]} envs environment variables
 * @returns {string[]} the trust store certs decoded from base64 to strings
 */
const getTrustStoreCerts = (envs) =>
  Object.entries(envs)
    .map(([key, value]) => key.startsWith('TRUSTSTORE_') && value)
    .filter(Boolean)
    .map((envValue) => Buffer.from(envValue, 'base64').toString().trim())

export { getTrustStoreCerts }
