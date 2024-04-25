/**
 * Form definition type
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 */

/**
 * Form metadata type
 * @typedef {object} FormMetadata
 * @property {string} id - The id of the form
 * @property {string} slug - The human-readable slug id of the form
 * @property {string} title - The human-readable title of the form
 * @property {string} organisation - The organisation this form belongs to
 * @property {string} teamName - The name of the team who own this form
 * @property {string} teamEmail - The email of the team who own this form
 */

/**
 * Form API parameter types
 * @typedef {{ id: string }} FormByIdInput
 * @typedef {Omit<FormMetadata, 'id'>} FormMetadataDocument
 * @typedef {Omit<FormMetadata, 'id' | 'slug'>} FormMetadataInput
 */

/**
 * Form API request types
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput }>} RequestFormById
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: FormDefinition }>} RequestFormDefinition
 * @typedef {Request<{ Server: { db: Db }, Payload: FormMetadataInput }>} RequestFormMetadata
 */

/**
 * @template {import('@hapi/hapi').ReqRef} [ReqRef=import('@hapi/hapi').ReqRefDefaults]
 * @typedef {import('@hapi/hapi').Request<ReqRef>} Request
 */

/**
 * @typedef {import('mongodb').Db} Db
 */
