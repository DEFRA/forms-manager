/**
 * Form API request types
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput }>} RequestFormById
 * @typedef {Request<{ Server: { db: Db }, Params: FormBySlugInput }>} RequestFormBySlug
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: FormDefinition }>} RequestFormDefinition
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: Page }>} RequestPage
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIDAndPageByIdInput, Payload: PatchPageFields }>} PatchPageRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIDAndPageByIdInput, Payload: ComponentDef; Query: AddComponentQueryOptions }>} RequestComponent
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIDAndPageByIdAndComponentByIdInput, Payload: ComponentDef }>} RequestUpdateComponent
 * @typedef {Request<{ Server: { db: Db }, Payload: FormMetadataInput }>} RequestFormMetadataCreate
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: Partial<FormMetadataInput> }>} RequestFormMetadataUpdateById
 * @typedef {Request<{ Server: { db: Db }, Query: QueryOptions }>} RequestListForms
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput & {version: 'v1'|'v2'}, }>} MigrateDraftFormRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: string[] }>} SortDraftFormPagesRequest
 */

/**
 * @typedef {Partial<FormMetadataDocument & { 'draft.updatedAt': Date, 'draft.updatedBy': FormMetadataAuthor }>} PartialFormMetadataDocument
 */

/**
 * @import { FormByIdInput, FormByIDAndPageByIdInput, FormByIDAndPageByIdAndComponentByIdInput, FormBySlugInput, FormDefinition, FormMetadataAuthor, FormMetadataDocument, FormMetadataInput, QueryOptions, Page, ComponentDef, PatchPageFields, AddComponentQueryOptions } from '@defra/forms-model'
 * @import { Request } from '@hapi/hapi'
 * @import { Db } from 'mongodb'
 */
