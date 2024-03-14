import hapiPino from 'hapi-pino'

import { loggerOptions } from '~/src/helpers/logging/logger-options.js'

export const requestLogger = {
  plugin: hapiPino,
  options: loggerOptions
}
