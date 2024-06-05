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
          'unique_name' in user &&
          typeof user.unique_name === 'string'
        ) {
          userPrefix = ` [${user.unique_name}] `
        }
      }

      return `[response]${userPrefix} ${request.method} ${request.path} ${request.raw.res.statusCode} (${responseTime}ms)`
    }
  }
}

/**
 * @typedef {import('hapi-pino').Options} Options
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<Options>} HapiPinoServerRegisterOptions
 * @typedef {import('~/src/plugins/auth.js').UserProfile} UserProfile
 */

/**
 * @template {import('@hapi/hapi').ReqRef} [ReqRef=import('@hapi/hapi').ReqRefDefaults]
 * @typedef {import('@hapi/hapi').Request<ReqRef>} Request
 */
