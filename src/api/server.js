import path from 'path'
import hapi from '@hapi/hapi'

import { config } from '~/src/config'
import { router } from '~/src/api/router'
import { requestLogger } from '~/src/helpers/logging/request-logger'
// Temporarily disabled. Will be restored in task #335165
// import { mongoPlugin } from '~/src/helpers/mongodb'
import { failAction } from '~/src/helpers/fail-action'
import { populateDb } from '~/src/helpers/db/populate-db'
import { secureContext } from '~/src/helpers/secure-context'

const isProduction = config.get('isProduction')

/**
 * Creates the Hapi server
 * @returns {hapi.Server} - The Hapi server
 */
async function createServer() {
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

  // Temporarily disabled. Will be restored in task #335165
  // await server.register({ plugin: mongoPlugin, options: {} })

  await server.register(router, {
    routes: { prefix: config.get('appPathPrefix') }
  })

  await server.register(populateDb)

  return server
}

export { createServer }
