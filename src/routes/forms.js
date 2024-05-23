import Boom from '@hapi/boom'

import { FailedToReadFormError } from '../api/forms/errors.js'

import {
  listForms,
  getForm,
  getFormBySlug,
  createForm,
  updateDraftFormDefinition,
  getFormDefinition,
  createLiveFromDraft,
  createDraftFromLive
} from '~/src/api/forms/service.js'
import {
  createFormSchema,
  formByIdSchema,
  formBySlugSchema,
  updateFormDefinitionSchema
} from '~/src/models/forms.js'

/**
 * Get the author from the auth credentials
 * @param {RequestAuth} auth
 * @returns {FormMetadataAuthor}
 */
function getAuthor(auth) {
  const user = auth.credentials.user

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
      const author = getAuthor(auth)

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
    method: 'GET',
    path: '/forms/{id}',
    /**
     * @param {RequestFormById} request
     */
    async handler(request) {
      const { params } = request
      const { id } = params
      const form = await getForm(id)

      if (!form) {
        return Boom.notFound(`Form with id '${id}' not found`)
      }

      return form
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
    async handler(request) {
      const { params } = request
      const { slug } = params
      const form = await getFormBySlug(slug)

      if (!form) {
        return Boom.notFound(`Form with slug '${slug}' not found`)
      }

      return form
    },
    options: {
      auth: false,
      validate: {
        params: formBySlugSchema
      }
    }
  },
  {
    method: 'GET',
    path: '/forms/{id}/definition/draft',
    /**
     * @param {RequestFormById} request
     */
    async handler(request) {
      const { params } = request
      const { id } = params

      try {
        const definition = await getFormDefinition(id)

        return definition
      } catch (err) {
        if (err instanceof FailedToReadFormError) {
          return Boom.notFound(err.message, err)
        }

        throw err
      }
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
      const author = getAuthor(auth)

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
    async handler(request) {
      const { params } = request
      const { id } = params

      try {
        const definition = await getFormDefinition(id, 'live')

        return definition
      } catch (err) {
        if (err instanceof FailedToReadFormError) {
          return Boom.notFound(err.message, err)
        }

        throw err
      }
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
      const author = getAuthor(auth)

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
      const author = getAuthor(auth)

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
 * @typedef {import('@hapi/hapi').ServerRoute} ServerRoute
 * @typedef {import('@defra/forms-model').FormMetadataAuthor} FormMetadataAuthor
 * @typedef {import('~/src/api/types.js').RequestFormById} RequestFormById
 * @typedef {import('~/src/api/types.js').RequestFormBySlug} RequestFormBySlug
 * @typedef {import('~/src/api/types.js').RequestFormDefinition} RequestFormDefinition
 * @typedef {import('~/src/api/types.js').RequestFormMetadataCreate} RequestFormMetadataCreate
 * @typedef {import('@hapi/hapi').AuthCredentials} AuthCredentials
 * @typedef {import('@hapi/hapi').RequestAuth} RequestAuth
 */
