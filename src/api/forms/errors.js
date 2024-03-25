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
    if (options?.statusCode) {
      this.statusCode = options.statusCode
    }
  }
}

/**
 * Indicates the form provided does not match the Defra Forms JSON schema.
 */
export class InvalidFormDefinitionError extends ApplicationError {
  name = 'InvalidFormDefinitionError'
}

/**
 * Indicates the form provided does not match the Defra Forms JSON schema.
 */
export class FailedCreationOperationError extends ApplicationError {
  name = 'FailedCreationOperationError'

  /**
   * Constructs an error
   * @param {ErrorOptions} [options]
   */
  constructor(options) {
    super('Failed to persist the form metadata and/or definition.', options)
  }
}

/**
 * Indicates the form already exists so cannot be created again.
 */
export class FormAlreadyExistsError extends ApplicationError {
  name = 'FormAlreadyExistsError'

  /**
   * Constructs an error
   * @param {string} formId
   * @param {ErrorOptions} [options]
   */
  constructor(formId, options = {}) {
    super(`Form with ID ${formId} already exists`, {
      ...options,
      statusCode: 400
    })
  }
}
