import Boom from '@hapi/boom'

import { ApplicationError } from '~/src/api/forms/errors.js'

/**
 * @satisfies {import('@hapi/hapi').Plugin<void>}
 */
export const transformErrors = {
  name: 'transform-errors',
  register: (server) => {
    server.ext('onPreResponse', (request, h) => {
      const response = request.response

      if (Boom.isBoom(response)) {
        if (response instanceof ApplicationError) {
          response.output.statusCode = response.statusCode
          response.output.payload.statusCode = response.statusCode
          response.output.payload.message = response.message
          response.output.payload.error = response.name
        }
      }

      return h.continue
    })
  }
}
