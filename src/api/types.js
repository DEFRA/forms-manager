/**
 * @typedef {object} FormConfiguration
 * @property {string} id - The id of the form
 * @property {string} title - The human-readable title of the form
 * @property {string} organisation - The organisation this form belongs to
 * @property {string} teamName - The name of the team who own this form
 * @property {string} teamEmail - The email of the team who own this form
 */

/**
 * @typedef {Omit<FormConfiguration, 'id'>} FormConfigurationInput
 */
