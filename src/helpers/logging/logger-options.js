import { ecsFormat } from '@elastic/ecs-pino-format'

import { config } from '~/src/config/index.js'

const logConfig = config.get('log')
const serviceName = config.get('serviceName')
const serviceVersion = config.get('serviceVersion')

const formatters = {
  ecs: /** @type {Omit<LoggerOptions, 'mixin' | 'transport'>} */ ({
    ...ecsFormat(),
    base: {
      service: {
        name: serviceName,
        type: 'nodeJs',
        version: serviceVersion
      }
    }
  }),
  'pino-pretty': /** @type {{ transport: TransportSingleOptions }} */ ({
    transport: {
      target: 'pino-pretty'
    }
  })
}

/**
 * @satisfies {Options}
 */
export const loggerOptions = {
  enabled: logConfig.enabled,
  ignorePaths: ['/health'],
  redact: {
    paths: logConfig.redact,
    remove: true
  },
  level: logConfig.level,
  ...formatters[logConfig.format]
}

/**
 * @import { Options } from 'hapi-pino'
 * @import { LoggerOptions, TransportSingleOptions } from 'pino'
 */
