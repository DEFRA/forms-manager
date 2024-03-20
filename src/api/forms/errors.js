/**
 * Indicates the form provided does not match the Defra Forms JSON schema.
 */
export class InvalidFormDefinitionError extends Error {
  /**
   * Constructs the error
   * @param {string} message
   */
  constructor(message) {
    super(message)
    this.name = 'InvalidFormDefinitionError'
    this.statusCode = 500
  }
}

/**
 * Indicates the form provided does not match the Defra Forms JSON schema.
 */
export class InvalidFormMetadataError extends Error {
  /**
   * Constructs the error
   * @param {Error} cause
   */
  constructor(cause) {
    super()
    this.name = 'InvalidFormMetadataError'
    this.cause = cause
    this.statusCode = 400
  }
}

/**
 * Indicates the form already exists so cannot be created again.
 */
export class FormAlreadyExistsError extends Error {
  /**
   * Constructs the error
   * @param {string} formId
   */
  constructor(formId) {
    super()
    this.name = 'FormAlreadyExistsError'
    this.message = `Form with ID ${formId} already exists`
    this.statusCode = 400
  }
}
