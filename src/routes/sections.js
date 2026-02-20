import { Scopes } from '@defra/forms-model'

import { reorderDraftFormDefinitionSections } from '~/src/api/forms/service/definition.js'
import { assignSectionsToForm } from '~/src/api/forms/service/sections.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { failAction } from '~/src/helpers/payload-fail-action.js'
import {
  formByIdSchema,
  sectionAssignmentPayloadSchema,
  sortIdsSchema
} from '~/src/models/forms.js'

/**
 * @type {ServerRoute[]}
 */
export default [
  {
    method: 'PUT',
    path: '/forms/{id}/definition/draft/sections',
    /**
     * @param {RequestSectionAssignment} request
     */
    async handler(request) {
      const { auth, params, payload } = request
      const { id } = params
      const author = getAuthor(auth.credentials.user)

      const sections = await assignSectionsToForm(
        id,
        payload.sections,
        author,
        payload.requestType
      )

      return {
        id,
        sections,
        status: 'updated'
      }
    },
    options: {
      auth: {
        scope: [`+${Scopes.FormEdit}`]
      },
      validate: {
        params: formByIdSchema,
        payload: sectionAssignmentPayloadSchema,
        failAction
      }
    }
  },
  {
    method: 'POST',
    path: '/forms/{id}/definition/draft/sections/order',
    /**
     * @param {SortDraftFormSectionsRequest} request
     */
    handler(request) {
      const { auth, params, payload } = request
      const author = getAuthor(auth.credentials.user)

      return reorderDraftFormDefinitionSections(params.id, payload, author)
    },
    options: {
      auth: {
        scope: [`+${Scopes.FormEdit}`]
      },
      validate: {
        params: formByIdSchema,
        payload: sortIdsSchema
      }
    }
  }
]

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { RequestSectionAssignment, SortDraftFormSectionsRequest } from '~/src/api/types.js'
 */
