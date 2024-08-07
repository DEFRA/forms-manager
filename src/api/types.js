/**
 * Form API request types
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput }>} RequestFormById
 * @typedef {Request<{ Server: { db: Db }, Params: FormBySlugInput }>} RequestFormBySlug
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: FormDefinition }>} RequestFormDefinition
 * @typedef {Request<{ Server: { db: Db }, Payload: FormMetadataInput }>} RequestFormMetadataCreate
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: { force: boolean }}>} RequestRemoveFormById
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: Partial<FormMetadataInput> }>} RequestFormMetadataUpdateById
 */

/**
 * @import { FormByIdInput, FormBySlugInput, FormDefinition, FormMetadataInput } from '@defra/forms-model'
 * @import { Request } from '@hapi/hapi'
 * @import { Db } from 'mongodb'
 */
