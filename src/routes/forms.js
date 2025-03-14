import {
  FormStatus,
  componentSchema,
  formMetadataInputKeys,
  formMetadataInputSchema,
  listSchemaV2,
  pageSchemaV2,
  queryOptionsSchema
} from '@defra/forms-model'

import {
  createComponentOnDraftDefinition,
  deleteComponentOnDraftDefinition,
  updateComponentOnDraftDefinition
} from '~/src/api/forms/service/component.js'
import {
  addListsToDraftFormDefinition,
  createDraftFromLive,
  createLiveFromDraft,
  getFormDefinition,
  listForms,
  reorderDraftFormDefinitionPages,
  updateDraftFormDefinition
} from '~/src/api/forms/service/definition.js'
import {
  createForm,
  getForm,
  getFormBySlug,
  removeForm,
  updateFormMetadata
} from '~/src/api/forms/service/index.js'
import { migrateDefinitionToV2 } from '~/src/api/forms/service/migration.js'
import {
  createPageOnDraftDefinition,
  patchFieldsOnDraftDefinitionPage
} from '~/src/api/forms/service/page.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import {
  componentByIdSchema,
  componentPayloadWithRequiredIdSchema,
  createFormSchema,
  formByIdSchema,
  formBySlugSchema,
  migrateDefinitionParamSchema,
  pageByIdSchema,
  patchPageSchema,
  prependQuerySchema,
  sortIdsSchema,
  updateFormDefinitionSchema
} from '~/src/models/forms.js'

export const ROUTE_FORMS = '/forms/{id}'

/**
 * @type {ServerRoute[]}
 */
export default [
  {
    method: 'GET',
    path: '/forms',
    /**
     * @param {RequestListForms} request
     * @param {ExtendedResponseToolkit<FormMetadata>} h
     */
    async handler(request, h) {
      const { query } = request

      const { forms, totalItems, filters } = await listForms(query)

      return h.queryResponse(forms, totalItems, query, filters)
    },
    options: {
      auth: false,
      validate: {
        query: queryOptionsSchema
      }
    }
  },
  {
    method: 'POST',
    path: '/forms',
    /**
     * @param {RequestFormMetadataCreate} request
     */
    async handler(request) {
      const { auth, payload } = request
      const author = getAuthor(auth.credentials.user)

      const formMetadata = await createForm(payload, author)

      return {
        id: formMetadata.id,
        slug: formMetadata.slug,
        status: 'created'
      }
    },
    options: {
      validate: {
        payload: createFormSchema
      }
    }
  },
  {
    method: 'PATCH',
    path: ROUTE_FORMS,
    /**
     * @param {RequestFormMetadataUpdateById} request
     */
    async handler(request) {
      const { auth, params, payload } = request
      const author = getAuthor(auth.credentials.user)
      const { id } = params

      const slug = await updateFormMetadata(id, payload, author)

      return {
        id,
        slug,
        status: 'updated'
      }
    },
    options: {
      validate: {
        params: formByIdSchema,
        // Take the form metadata update schema and make all fields optional. This acts similar to Partial<T> in Typescript.
        payload: formMetadataInputSchema.fork(
          Object.keys(formMetadataInputKeys),
          (schema) => schema.optional()
        )
      }
    }
  },
  {
    method: 'GET',
    path: ROUTE_FORMS,
    /**
     * @param {RequestFormById} request
     */
    handler(request) {
      const { params } = request
      const { id } = params

      return getForm(id)
    },
    options: {
      auth: false,
      validate: {
        params: formByIdSchema
      }
    }
  },
  {
    method: 'GET',
    path: '/forms/slug/{slug}',
    /**
     * @param {RequestFormBySlug} request
     */
    handler(request) {
      const { params } = request
      const { slug } = params

      return getFormBySlug(slug)
    },
    options: {
      auth: false,
      validate: {
        params: formBySlugSchema
      }
    }
  },
  {
    method: 'DELETE',
    path: ROUTE_FORMS,
    /**
     * @param {RequestFormById} request
     */
    async handler(request) {
      const { id } = request.params

      await removeForm(id)

      return {
        id,
        status: 'deleted'
      }
    },
    options: {
      validate: {
        params: formByIdSchema
      }
    }
  },
  {
    method: 'GET',
    path: '/forms/{id}/definition/draft',
    /**
     * @param {RequestFormById} request
     */
    handler(request) {
      const { params } = request
      const { id } = params

      return getFormDefinition(id)
    },
    options: {
      auth: false,
      validate: {
        params: formByIdSchema
      }
    }
  },
  {
    method: 'POST',
    path: '/forms/{id}/definition/draft',
    /**
     * @param {RequestFormDefinition} request
     */
    async handler(request) {
      const { auth, params, payload } = request
      const author = getAuthor(auth.credentials.user)

      await updateDraftFormDefinition(params.id, payload, author)

      return {
        id: params.id,
        status: 'updated'
      }
    },
    options: {
      validate: {
        payload: updateFormDefinitionSchema
      }
    }
  },
  {
    method: 'POST',
    path: '/forms/{id}/definition/draft/migrate/{version}',
    /**
     * @param {MigrateDraftFormRequest} request
     */
    handler(request) {
      const { auth, params } = request
      const author = getAuthor(auth.credentials.user)

      return migrateDefinitionToV2(params.id, author)
    },
    options: {
      validate: {
        params: migrateDefinitionParamSchema
      }
    }
  },
  {
    method: 'POST',
    path: '/forms/{id}/definition/draft/pages',
    /**
     * @param {RequestPage} request
     */
    handler(request) {
      const { auth, params, payload } = request
      const author = getAuthor(auth.credentials.user)
      return createPageOnDraftDefinition(params.id, payload, author)
    },
    options: {
      validate: {
        params: formByIdSchema,
        payload: pageSchemaV2
      }
    }
  },
  {
    method: 'POST',
    path: '/forms/{id}/definition/draft/pages/order',
    /**
     * @param {SortDraftFormPagesRequest} request
     */
    handler(request) {
      const { auth, params, payload } = request
      const author = getAuthor(auth.credentials.user)
      return reorderDraftFormDefinitionPages(params.id, payload, author)
    },
    options: {
      validate: {
        params: formByIdSchema,
        payload: sortIdsSchema
      }
    }
  },
  {
    method: 'PATCH',
    path: '/forms/{id}/definition/draft/pages/{pageId}',
    /**
     * @param {PatchPageRequest} request
     */
    handler(request) {
      const { auth, params, payload } = request
      const author = getAuthor(auth.credentials.user)
      return patchFieldsOnDraftDefinitionPage(
        params.id,
        params.pageId,
        payload,
        author
      )
    },
    options: {
      validate: {
        params: pageByIdSchema,
        payload: patchPageSchema
      }
    }
  },
  {
    method: 'POST',
    path: '/forms/{id}/definition/draft/pages/{pageId}/components',
    /**
     * @param {RequestComponent} request
     */
    async handler(request) {
      const { auth, params, payload, query } = request
      const { id, pageId } = params
      const { prepend } = query

      const author = getAuthor(auth.credentials.user)
      const [component] = await createComponentOnDraftDefinition(
        id,
        pageId,
        [payload],
        author,
        prepend
      )

      return component
    },
    options: {
      validate: {
        params: pageByIdSchema,
        payload: componentSchema,
        query: prependQuerySchema
      }
    }
  },
  {
    method: 'PUT',
    path: '/forms/{id}/definition/draft/pages/{pageId}/components/{componentId}',
    /**
     * @param {RequestUpdateComponent} request
     */
    handler(request) {
      const { auth, params, payload } = request
      const { id, pageId, componentId } = params

      const author = getAuthor(auth.credentials.user)
      return updateComponentOnDraftDefinition(
        id,
        pageId,
        componentId,
        payload,
        author
      )
    },
    options: {
      validate: {
        params: componentByIdSchema,
        payload: componentPayloadWithRequiredIdSchema
      }
    }
  },
  {
    method: 'DELETE',
    path: '/forms/{id}/definition/draft/pages/{pageId}/components/{componentId}',
    /**
     * @param {RequestUpdateComponent} request
     */
    async handler(request) {
      const { auth, params } = request
      const { id, pageId, componentId } = params

      const author = getAuthor(auth.credentials.user)
      await deleteComponentOnDraftDefinition(id, pageId, componentId, author)

      return {
        componentId,
        status: 'deleted'
      }
    },
    options: {
      validate: {
        params: componentByIdSchema
      }
    }
  },
  {
    method: 'GET',
    path: '/forms/{id}/definition',
    /**
     * @param {RequestFormById} request
     */
    handler(request) {
      const { params } = request
      const { id } = params

      return getFormDefinition(id, FormStatus.Live)
    },
    options: {
      auth: false,
      validate: {
        params: formByIdSchema
      }
    }
  },
  {
    method: 'POST',
    path: '/forms/{id}/create-live',
    /**
     * @param {RequestFormById} request
     */
    async handler(request) {
      const { auth, params } = request
      const { id } = params
      const author = getAuthor(auth.credentials.user)

      // Create the live state from draft using the author in the credentials
      await createLiveFromDraft(id, author)

      return {
        id,
        status: 'created-live'
      }
    },
    options: {
      validate: {
        params: formByIdSchema
      }
    }
  },
  {
    method: 'POST',
    path: '/forms/{id}/create-draft',
    /**
     * @param {RequestFormById} request
     */
    async handler(request) {
      const { auth, params } = request
      const { id } = params
      const author = getAuthor(auth.credentials.user)

      // Recreate the draft state from live using the author in the credentials
      await createDraftFromLive(id, author)

      return {
        id,
        status: 'created-draft'
      }
    },
    options: {
      validate: {
        params: formByIdSchema
      }
    }
  },
  {
    method: 'POST',
    path: '/forms/{id}/definition/draft/lists',
    /**
     * @param {CreateListDraftFormPagesRequest} request
     */
    async handler(request) {
      const { auth, params, payload } = request
      const { id } = params
      const author = getAuthor(auth.credentials.user)

      // Recreate the draft state from live using the author in the credentials
      const [list] = await addListsToDraftFormDefinition(id, [payload], author)

      return {
        id: list.id,
        list,
        status: 'created'
      }
    },
    options: {
      validate: {
        params: formByIdSchema,
        payload: listSchemaV2
      }
    }
  }
]

/**
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { RequestFormById, RequestFormBySlug, RequestFormDefinition, RequestFormMetadataCreate, RequestFormMetadataUpdateById, RequestListForms, RequestPage, RequestComponent, PatchPageRequest, RequestUpdateComponent, MigrateDraftFormRequest, SortDraftFormPagesRequest, CreateListDraftFormPagesRequest } from '~/src/api/types.js'
 * @import { ExtendedResponseToolkit } from '~/src/plugins/query-handler/types.js'
 */
