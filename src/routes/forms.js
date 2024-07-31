import {
  formMetadataInputKeys,
  formMetadataInputSchema
} from '@defra/forms-model'
import Boom from '@hapi/boom'

import {
  listForms,
  getForm,
  getFormBySlug,
  createForm,
  updateDraftFormDefinition,
  getFormDefinition,
  createLiveFromDraft,
  createDraftFromLive,
  removeForm,
  updateFormMetadata
} from '~/src/api/forms/service.js'
import {
  createFormSchema,
  removeFormPayloadSchema,
  formByIdSchema,
  formBySlugSchema,
  updateFormDefinitionSchema
} from '~/src/models/forms.js'

/**
 * Get the author from the auth credentials
 * @param {UserCredentials & OidcStandardClaims} [user]
 * @returns {FormMetadataAuthor}
 */
function getAuthor(user) {
  if (!user || !user.sub) {
    throw Boom.unauthorized(
      'Failed to get the author, user is undefined or has no id (sub)'
    )
  }

  return {
    id: user.sub,
    displayName: `${user.given_name} ${user.family_name}`
  }
}

/**
 * @type {ServerRoute[]}
 */
export default [
  {
    method: 'GET',
    path: '/forms',
    handler() {
      return listForms()
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
    path: '/forms/{id}',
    /**
     * @param {RequestFormMetadataUpdateById} request
     */
    async handler(request) {
      const { auth, params, payload } = request
      const author = getAuthor(auth.credentials.user)
      const { id } = params

      const response = await updateFormMetadata(id, payload, author)

      if (response.error) {
        return {
          message: response.error.message,
          status: 'error'
        }
      }

      return {
        id,
        slug: response.slug,
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
    path: '/forms/{id}',
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
    path: '/forms/{id}',
    /**
     * @param {RequestRemoveFormById} request
     */
    async handler(request) {
      const { params, payload } = request
      const { id } = params
      const { force } = payload

      await removeForm(id, force)

      return {
        id: params.id,
        status: 'deleted'
      }
    },
    options: {
      validate: {
        params: formByIdSchema,
        payload: removeFormPayloadSchema
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
    method: 'GET',
    path: '/forms/{id}/definition',
    /**
     * @param {RequestFormById} request
     */
    handler(request) {
      const { params } = request
      const { id } = params

      return getFormDefinition(id, 'live')
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
  }
]

/**
 * @import { FormMetadataAuthor, FormMetadataInput } from '@defra/forms-model'
 * @import { AuthCredentials, RequestAuth, ServerRoute, UserCredentials } from '@hapi/hapi'
 * @import { OidcStandardClaims } from 'oidc-client-ts'
 * @import { RequestFormById, RequestFormBySlug, RequestFormDefinition, RequestFormMetadataCreate, RequestFormMetadataUpdateById, RequestRemoveFormById } from '~/src/api/types.js'
 */
