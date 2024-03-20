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
  }
}
