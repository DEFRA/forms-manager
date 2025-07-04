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
 */

/**
 * @typedef {Partial<FormMetadataDocument & { 'draft.updatedAt': Date, 'draft.updatedBy': FormMetadataAuthor }>} PartialFormMetadataDocument
 */

/**
 * @import { FormByIdInput, FormByIDAndPageByIdInput, FormByIDAndPageByIdAndComponentByIdInput, FormBySlugInput, FormDefinition, FormMetadataAuthor, FormMetadataDocument, FormMetadataInput, QueryOptions, Page, ComponentDef, PatchPageFields, AddComponentQueryOptions, List, ConditionWrapperV2 } from '@defra/forms-model'
 * @import { Request } from '@hapi/hapi'
 * @import { Db } from 'mongodb'
 */
