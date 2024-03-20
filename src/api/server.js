import path from 'path'

import Boom from '@hapi/boom'
import hapi from '@hapi/hapi'

import { router } from '~/src/api/router.js'
import { config } from '~/src/config/index.js'
import { populateDb } from '~/src/helpers/db/populate-db.js'
import { failAction } from '~/src/helpers/fail-action.js'
import { requestLogger } from '~/src/helpers/logging/request-logger.js'
// Temporarily disabled. Will be restored in task #335165
// import { mongoPlugin } from '~/src/helpers/mongodb.js'
import { secureContext } from '~/src/helpers/secure-context/index.js'

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

  // Temporarily disabled. Will be restored in task #335165
  // await server.register({ plugin: mongoPlugin, options: {} })

  await server.register(router, {
    routes: { prefix: config.get('appPathPrefix') }
  })

  await server.register(populateDb)

  server.ext('onPreResponse', (request, h) => {
    const response = request.response
    let boomError

    if (response instanceof Error) {
      if (Boom.isBoom(response) && response.isServer) {
        boomError = Boom.boomify(request.response)
      } else if (response.isBoom) {
        boomError = Response
      }
    } else {
      return h.continue
    }

    if (response.statusCode) {
      boomError.output.payload.statusCode = response.statusCode
    }

    if (response.message) {
      boomError.output.payload.message = response.message
      delete boomError.output.payload.error
    }

    return h
      .response(boomError.output.payload)
      .code(boomError.output.statusCode)
  })

  return server
}
