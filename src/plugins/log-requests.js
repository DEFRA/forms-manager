import hapiPino from 'hapi-pino'

import { loggerOptions } from '~/src/helpers/logging/logger-options.js'

/**
 * @satisfies {HapiPinoServerRegisterOptions}
 */
export const logRequests = {
  plugin: hapiPino,
  options: {
    ...loggerOptions,
    log4xxResponseErrors: true,
    logRequestComplete: true,
    customRequestCompleteMessage(request, responseTime) {
      const { user } = request.auth.credentials

      const userPrefix = user ? `[${user.unique_name}]` : ''

      return `[response] ${userPrefix} ${request.method} ${request.path} ${request.raw.res.statusCode} (${responseTime}ms)`
    }
  }
}

/**
 * @typedef {import('hapi-pino').Options} Options
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<Options>} HapiPinoServerRegisterOptions
 */
