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
      let userPrefix = ''

      if (request.auth.isAuthenticated) {
        const { user } = request.auth.credentials

        if (
          user &&
          'preferred_username' in user &&
          typeof user.preferred_username === 'string'
        ) {
          userPrefix = ` [${user.preferred_username}] `
        }
      }

      return `[response]${userPrefix} ${request.method} ${request.path} ${request.raw.res.statusCode} (${responseTime}ms)`
    }
  }
}

/**
 * @typedef {import('hapi-pino').Options} Options
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<Options>} HapiPinoServerRegisterOptions
 */
