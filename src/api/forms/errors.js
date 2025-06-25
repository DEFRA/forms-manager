import { getCauses } from '~/src/api/forms/validation-errors.js'

/**
 * Base class to support all application errors.
 */
export class ApplicationError extends Error {
  name = 'ApplicationError'

  /**
   * HTTP status code
   * @type {number}
   */
  statusCode = 500

  /**
   * Constructs an error
   * @param {string} message - the message to report
   * @param {ErrorOptions & { statusCode?: number }} [options] - error options
   */
  constructor(message, options = {}) {
    super(message, options)
    if (options.statusCode) {
      this.statusCode = options.statusCode
    }
  }
}

/**
 * Indicates the form provided does not match the Defra Forms JSON schema.
 */
export class InvalidFormDefinitionError extends ApplicationError {
  name = 'InvalidFormDefinitionError'
  statusCode = 400

  /**
   * Constructs an InvalidFormDefinitionError
   * @param {ValidationError} validationError - the joi form definition error
   * @param {ErrorMatchPath} [errorPathPrefix] - the error path prefix to use
   */
  constructor(validationError, errorPathPrefix) {
    super(validationError.message, {
      cause: getCauses(validationError, errorPathPrefix)
    })
  }
}

/**
 * Indicates the form already exists so cannot be created again.
 */
export class FormAlreadyExistsError extends ApplicationError {
  name = 'FormAlreadyExistsError'

  /**
   * Constructs an error
   * @param {string} slug
   * @param {ErrorOptions} [options]
   */
  constructor(slug, options = {}) {
    super(`Form with slug ${slug} already exists`, {
      ...options,
      statusCode: 400
    })
  }
}

/**
 * @import { ValidationError } from 'joi'
 * @import { ErrorMatchPath } from '@defra/forms-model'
 */
