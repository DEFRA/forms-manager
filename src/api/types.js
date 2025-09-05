/**
 * Form API request types
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput }>} RequestFormById
 * @typedef {Request<{ Server: { db: Db }, Params: FormBySlugInput }>} RequestFormBySlug
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: FormDefinition }>} RequestFormDefinition
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: Page }>} RequestPage
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIDAndPageByIdInput, Payload: PatchPageFields }>} PatchPageRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIDAndPageByIdInput, Payload: ComponentDef; Query: AddComponentQueryOptions }>} RequestComponent
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIDAndPageByIdInput, Payload: string[] }>} SortDraftFormComponentsRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIDAndPageByIdAndComponentByIdInput, Payload: ComponentDef }>} RequestUpdateComponent
 * @typedef {Request<{ Server: { db: Db }, Payload: FormMetadataInput }>} RequestFormMetadataCreate
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: Partial<FormMetadataInput> }>} RequestFormMetadataUpdateById
 * @typedef {Request<{ Server: { db: Db }, Query: QueryOptions }>} RequestListForms
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput & {version: 'v1'|'v2'}, }>} MigrateDraftFormRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: string[] }>} SortDraftFormPagesRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: List }>} CreateListDraftFormPagesRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput & {listId: string}, Payload: List }>} UpdateListDraftFormPagesRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput & {listId: string} }>} DeleteListDraftFormPagesRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIDAndPageByIdInput }>} DeletePageDraftFormRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput, Payload: ConditionWrapperV2 }>} CreateConditionDraftFormPagesRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput & {conditionId: string}, Payload: ConditionWrapperV2 }>} UpdateConditionDraftFormPagesRequest
 * @typedef {Request<{ Server: { db: Db }, Params: FormByIdInput & {conditionId: string} }>} DeleteConditionDraftFormPagesRequest
 * @typedef {Request<{ Server: { db: Db }, Params: {id: string, versionNumber: string} }>} RequestFormVersionById
 */

/**
 * @typedef {Partial<FormMetadataDocument & { 'draft.updatedAt': Date, 'draft.updatedBy': FormMetadataAuthor }>} PartialFormMetadataDocument
 */

/**
 * @typedef {'form_created' | 'form_updated' | 'metadata_updated' | 'page_created' | 'page_updated' | 'page_deleted' | 'page_reordered' | 'component_created' | 'component_updated' | 'component_deleted' | 'component_reordered' | 'list_created' | 'list_updated' | 'list_deleted' | 'condition_created' | 'condition_updated' | 'condition_deleted' | 'live_published' | 'draft_created_from_live' | 'form_migrated'} VersionChangeType
 */

/**
 * @typedef {Required<Pick<FormMetadataDocument, 'title' | 'slug' | 'organisation' | 'teamName' | 'teamEmail'>>} FormVersionMetadata
 */

/**
 * @typedef {object} FormVersionDocument
 * @property {ObjectId} [_id] - MongoDB ObjectId
 * @property {string} formId - The form ID
 * @property {number} versionNumber - The version number
 * @property {FormDefinition} formDefinition - The complete form definition
 * @property {FormVersionMetadata} metadata - Form metadata snapshot
 * @property {FormStatus} status - The status of the form
 * @property {Date} createdAt - When this version was created
 * @property {FormMetadataAuthor} createdBy - Who created this version
 * @property {VersionChangeType} changeType - The type of change
 * @property {string} [changeDescription] - Optional description of the change
 */

/**
 * @typedef {object} VersionedFormDefinitionResponse
 * @property {string} id - The form ID
 * @property {FormDefinition} formDefinition - The complete form definition
 * @property {FormVersionMetadata} metadata - Form metadata snapshot
 * @property {number} version - The version number
 * @property {FormStatus} status - The status of the form
 * @property {Date} createdAt - When this version was created
 */

/**
 * @import { FormByIdInput, FormByIDAndPageByIdInput, FormByIDAndPageByIdAndComponentByIdInput, FormBySlugInput, FormDefinition, FormMetadataAuthor, FormMetadataDocument, FormMetadataInput, QueryOptions, Page, ComponentDef, PatchPageFields, AddComponentQueryOptions, List, ConditionWrapperV2, FormStatus } from '@defra/forms-model'
 * @import { Request } from '@hapi/hapi'
 * @import { Db, ObjectId } from 'mongodb'
 * @import { VersionChangeTypes } from '~/src/api/forms/constants/version-change-types.js'
 */
