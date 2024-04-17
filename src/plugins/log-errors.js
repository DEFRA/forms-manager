import Boom from '@hapi/boom'

import { ApplicationError } from '~/src/api/forms/errors.js'

/**
 * @satisfies {import('@hapi/hapi').Plugin<void>}
 */
export const logErrors = {
  name: 'log-errors',
  register: (server) => {
    server.ext('onPreResponse', (request, h) => {
      const response = request.response

      if (Boom.isBoom(response)) {
        // An error was raised while processing the request
        const statusCode = response.output.statusCode
        const data = response.data ? response.data.stack : response.stack

        // Log the error
        request.log('error', {
          statusCode,
          message: response.message,
          stack: data
        })

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
