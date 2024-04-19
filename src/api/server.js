import path from 'path'

import hapi from '@hapi/hapi'

import { config } from '~/src/config/index.js'
import { prepareDb } from '~/src/db.js'
import { failAction } from '~/src/helpers/fail-action.js'
import { requestLogger } from '~/src/helpers/logging/request-logger.js'
import { logErrors } from '~/src/plugins/log-errors.js'
import { router } from '~/src/plugins/router.js'
import { prepareSecureContext } from '~/src/secure-context.js'

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
    prepareSecureContext(server)
  }

  await prepareDb(server)

  await server.register(logErrors)

  await server.register(router)

  return server
}
