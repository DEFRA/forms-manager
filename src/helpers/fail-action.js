import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()

/**
 * Log and throw an error
 * @type {Lifecycle.Method}
 */
export const failAction = (_request, _h, error) => {
  const normalisedError =
    error instanceof Error ? error : new Error(String(error))

  logger.error(
    `[validationFailed] Request validation failed - ${normalisedError.message}`
  )

  throw normalisedError
}

/**
 * @import { Lifecycle } from '@hapi/hapi'
 */
