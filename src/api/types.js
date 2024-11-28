/**
 * Form API request types
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput }>} RequestFormById
 * @typedef {Request<{ Server: { db: Db }, Params: FormBySlugInput }>} RequestFormBySlug
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: FormDefinition }>} RequestFormDefinition
 * @typedef {Request<{ Server: { db: Db }, Payload: FormMetadataInput }>} RequestFormMetadataCreate
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: { force: boolean }}>} RequestRemoveFormById
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: Partial<FormMetadataInput> }>} RequestFormMetadataUpdateById
 * @typedef {Request<{ Server: { db: Db }, Querystring: PaginationOptions }>} RequestListForms
 */

/**
 * @typedef {Partial<FormMetadataDocument & { 'draft.updatedAt': Date, 'draft.updatedBy': FormMetadataAuthor }>} PartialFormMetadataDocument
 */

/**
 * @import { FormByIdInput, FormBySlugInput, FormDefinition, FormMetadataAuthor, FormMetadataDocument, FormMetadataInput, FormMetadataState } from '@defra/forms-model'
 * @import { Request } from '@hapi/hapi'
 * @import { Db } from 'mongodb'
 */

/**
 * @template T
 * @typedef {object} Result
 * @property {T[]} data - The array of data items.
 * @property {Meta} meta - The metadata about the result.
 */

/**
 * @typedef {object} Meta
 * @property {PaginationResult} [pagination] - The pagination details.
 */

/**
 * @typedef {object} PaginationResult
 * @property {number} page - The current page number.
 * @property {number} perPage - The number of items per page.
 * @property {number} totalItems - The total number of items available.
 * @property {number} totalPages - The total number of pages available.
 */

/**
 * @typedef {object} PaginationOptions
 * @property {number} [page] - The current page number.
 * @property {number} [perPage] - The number of items per page.
 */
