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
 * Indicates that the requested resource was not found.
 */
export class ResourceNotFoundError extends ApplicationError {
  name = 'ResourceNotFoundError'

  /**
   * Constructs the error
   * @param {string} message - the message to report
   */
  constructor(message) {
    super(message, { statusCode: 404 })
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
 * Indicates the form provided does not exist or was empty
 */
export class FailedToReadFormError extends ApplicationError {
  name = 'FailedToReadFormError'
}
