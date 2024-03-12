/**
 * Log and throw and error
 * @param {object} request the hapi request
 * @param {object} h the hapi response toolkit
 * @param {{message: string}} error the error object to be thrown
 */
function failAction(request, h, error) {
  request.logger.error(error, error.message)

  throw error
}

export { failAction }
