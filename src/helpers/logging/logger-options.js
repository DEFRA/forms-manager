import { ecsFormat } from '@elastic/ecs-pino-format'

import { config } from '~/src/config/index.js'

/**
 * @satisfies {import('pino').LoggerOptions}
 */
export const loggerOptions = {
  enabled: !config.get('isTest'),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers'],
    remove: true
  },
  level: config.get('logLevel'),
  ...(config.get('isDevelopment')
    ? { transport: { target: 'pino-pretty' } }
    : ecsFormat())
}
