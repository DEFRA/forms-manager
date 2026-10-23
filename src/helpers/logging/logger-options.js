import { addLogContextToMessage, logContextMixin } from '@defra/forms-common'
import { ecsFormat } from '@elastic/ecs-pino-format'

import { config } from '~/src/config/index.js'

const logConfig = config.get('log')
const serviceName = config.get('serviceName')
const serviceVersion = config.get('serviceVersion')

const formatters = {
  ecs: {
    ...ecsFormat({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- serviceVersion can be null from config
      serviceVersion: serviceVersion ?? '1.0.0',
      serviceName
    })
  },
  'pino-pretty': { transport: { target: 'pino-pretty' } }
}

export const loggerOptions = /** @type {any} */ ({
  enabled: logConfig.enabled,
  ignorePaths: ['/health'],
  redact: {
    paths: logConfig.redact,
    remove: true
  },
  level: logConfig.level,
  ...formatters[/** @type {'ecs' | 'pino-pretty'} */ (logConfig.format)],
  nesting: true,
  mixin: logContextMixin,
  hooks: {
    logMethod: addLogContextToMessage
  }
})

/**
 * @import { Options } from 'hapi-pino'
 * @import { LoggerOptions, TransportSingleOptions } from 'pino'
 */
