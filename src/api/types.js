/**
 * @typedef {object} FormConfiguration
 * @property {string} id - The id of the form
 * @property {string} slug - The human-readable slug id of the form
 * @property {string} title - The human-readable title of the form
 * @property {string} organisation - The organisation this form belongs to
 * @property {string} teamName - The name of the team who own this form
 * @property {string} teamEmail - The email of the team who own this form
 */

/**
 * @typedef {Omit<FormConfiguration, 'id'>} FormConfigurationDocument
 * @typedef {Omit<FormConfiguration, 'id' | 'slug'>} FormConfigurationInput
 * @typedef {Request<{ Server: { db: Db }, Params: Pick<FormConfiguration, 'id'> }>} RequestFormById
 * @typedef {Request<{ Server: { db: Db }, Payload: FormConfigurationInput }>} RequestCreateForm
 * @typedef {import('mongodb').Db} Db
 */

/**
 * @template {import('@hapi/hapi').ReqRef} [ReqRef=import('@hapi/hapi').ReqRefDefaults]
 * @typedef {import('@hapi/hapi').Request<ReqRef>} Request
 */
