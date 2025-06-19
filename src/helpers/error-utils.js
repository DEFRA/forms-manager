/**
 * Normalises unknown values to proper Error instances.
 * @param {unknown} error - The error value to normalise
 * @param {string} [fallbackMessage] - Message to use if error is not an Error instance
 * @returns {Error} A proper Error instance
 */
export function normaliseError(error, fallbackMessage = 'Unknown error') {
  return error instanceof Error ? error : new Error(fallbackMessage)
}
