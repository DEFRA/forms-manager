import hapiPino from 'hapi-pino'

import { loggerOptions } from '~/src/helpers/logging/logger-options.js'

/**
 * @satisfies {HapiPinoServerRegisterOptions}
 */
export const logRequests = {
  plugin: hapiPino,
  options: {
    ...loggerOptions,
    log4xxResponseErrors: true
  }
}

/**
 * @typedef {import('hapi-pino').Options} Options
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<Options>} HapiPinoServerRegisterOptions
 */
