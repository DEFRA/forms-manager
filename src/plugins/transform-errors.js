import Boom from '@hapi/boom'

import { ApplicationError } from '~/src/api/forms/errors.js'

/**
 * @satisfies {Plugin<void>}
 */
export const transformErrors = {
  name: 'transform-errors',
  register(server) {
    server.ext('onPreResponse', (request, h) => {
      const response = request.response

      if (Boom.isBoom(response)) {
        if (response instanceof ApplicationError) {
          response.output.statusCode = response.statusCode
          response.output.payload.statusCode = response.statusCode
          response.output.payload.message = response.message
          response.output.payload.error = response.name
        } else {
          // Allow custom payload in addition to standard Boom properties
          response.output.payload.data = response.data
        }
      }

      return h.continue
    })
  }
}

/**
 * @import { Plugin } from '@hapi/hapi'
 */
