/**
 * Get base64 certs from all environment variables starting with TRUSTSTORE_
 * @param {NodeJS.ProcessEnv} envs - environment variables
 * @returns {string[]} - the trust store certs decoded from base64 to strings
 */
export const getTrustStoreCerts = (envs) =>
  Object.entries(envs)
    .filter(
      /** @type { (env: [string, string?]) => env is [string, string] } */
      (([key, value]) => key.startsWith('TRUSTSTORE_') && !!value)
    )
    .map(([, value]) => Buffer.from(value, 'base64').toString().trim())
