import pino from 'pino'

import { loggerOptions } from '~/src/helpers/logging/logger-options'

/**
 * Create a logger instance.
 * @returns {object} The logger instance.
 */
function createLogger() {
  return pino(loggerOptions)
}

export { createLogger }
