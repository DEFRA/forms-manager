import { componentPayloadSchemaV2 } from '@defra/forms-model'

import {
  createComponentOnDraftDefinition,
  deleteComponentOnDraftDefinition,
  updateComponentOnDraftDefinition
} from '~/src/api/forms/service/component.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import {
  componentByIdSchema,
  componentPayloadWithRequiredIdSchema,
  pageByIdSchema,
  prependQuerySchema
} from '~/src/models/forms.js'

export const ROUTE_COMPONENTS =
  '/forms/{id}/definition/draft/pages/{pageId}/components/{componentId}'

/**
 * @type {ServerRoute[]}
 */
export default [
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
      const component = await createComponentOnDraftDefinition(
        id,
        pageId,
        payload,
        author,
        prepend
      )

      return component
    },
    options: {
      validate: {
        params: pageByIdSchema,
        payload: componentPayloadSchemaV2,
        query: prependQuerySchema
      }
    }
  },
  {
    method: 'PUT',
    path: ROUTE_COMPONENTS,
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
    path: ROUTE_COMPONENTS,
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
  }
]

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { RequestComponent, RequestUpdateComponent } from '~/src/api/types.js'
 */
