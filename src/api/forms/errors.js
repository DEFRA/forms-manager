/**
 * Base class to support all application errors.
 */
export class ApplicationError extends Error {
  /**
   * Constructs an error
   * @param {string} name - name of the error
   * @param {number} statusCode - the status code to report
   * @param {string} message - the message to report
   * @param {Error | undefined} [cause] - a base error, if required
   */
  constructor(name, statusCode, message, cause = undefined) {
    super()
    this.name = name
    this.statusCode = statusCode
    this.message = message

    if (cause) {
      this.cause = cause
    }
  }
}

/**
 * Indicates the form provided does not match the Defra Forms JSON schema.
 */
export class InvalidFormDefinitionError extends ApplicationError {
  /**
   * Constructs the error
   * @param {string} message
   */
  constructor(message) {
    super('InvalidFormDefinitionError', 500, message)
  }
}

/**
 * Indicates the form provided does not match the Defra Forms JSON schema.
 */
export class InvalidFormMetadataError extends ApplicationError {
  /**
   * Constructs the error
   * @param {Error} cause
   */
  constructor() {
    super(
      'InvalidFormMetadataError',
      400,
      'The requested operation resulted in a JSON schema that failed validation'
    )
  }
}

/**
 * Indicates the form already exists so cannot be created again.
 */
export class FormAlreadyExistsError extends ApplicationError {
  /**
   * Constructs the error
   * @param {string} formId
   */
  constructor(formId) {
    super(
      'FormAlreadyExistsError',
      400,
      `Form with ID ${formId} already exists`
    )
  }
}
