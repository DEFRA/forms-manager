import { normaliseError } from '~/src/helpers/error-utils.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()

/**
 * Log and throw and error
 * @type {Lifecycle.Method}
 */
export const failAction = (_request, _h, error) => {
  const err = normaliseError(error)
  logger.error(
    err,
    `[validationFailed] Request validation failed - ${err.message}`
  )

  throw error ?? new Error('Unknown error')
}

/**
 * @import { Lifecycle } from '@hapi/hapi'
 */
