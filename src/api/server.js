import path from 'path'

import hapi from '@hapi/hapi'

import { config } from '~/src/config/index.js'
import { failAction } from '~/src/helpers/fail-action.js'
import { requestLogger } from '~/src/helpers/logging/request-logger.js'
import { secureContext } from '~/src/helpers/secure-context/index.js'
import { logErrors } from '~/src/plugins/log-errors.js'
import { mongodb } from '~/src/plugins/mongodb.js'
import { router } from '~/src/plugins/router.js'

const isProduction = config.get('isProduction')

/**
 * Creates the Hapi server
 */
export async function createServer() {
  const server = hapi.server({
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        },
        failAction
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  await server.register(requestLogger)

  if (isProduction) {
    await server.register(secureContext)
  }

  await server.register(mongodb)
  await server.register(logErrors)

  await server.register(router, {
    routes: { prefix: config.get('appPathPrefix') }
  })

  return server
}
