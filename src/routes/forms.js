import {
  formDefinitionSchema,
  formMetadataCreateSchema
} from '@defra/forms-model'
import Boom from '@hapi/boom'

import { FailedToReadFormError } from '../api/forms/errors.js'

import {
  listForms,
  getForm,
  getFormBySlug,
  createForm,
  updateDraftFormDefinition,
  getDraftFormDefinition
} from '~/src/api/forms/service.js'
import { formByIdSchema, formBySlugSchema } from '~/src/models/forms.js'

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
     * @param {RequestFormMetadata} request
     */
    async handler(request) {
      const { payload } = request

      const formMetadata = await createForm(payload)

      return {
        id: formMetadata.id,
        status: 'created'
      }
    },
    options: {
      validate: {
        payload: formMetadataCreateSchema
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
        const definition = await getDraftFormDefinition(id)

        return definition
      } catch (err) {
        if (err instanceof FailedToReadFormError) {
          return Boom.notFound(err.message, err)
        }

        throw err
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
    path: '/forms/{id}/definition/draft',
    /**
     * @param {RequestFormDefinition} request
     */
    async handler(request) {
      const { params, payload } = request

      await updateDraftFormDefinition(params.id, payload)

      return {
        id: params.id,
        status: 'updated'
      }
    },
    options: {
      validate: {
        payload: formDefinitionSchema
      }
    }
  }
]

/**
 * @typedef {import('@hapi/hapi').ServerRoute} ServerRoute
 * @typedef {import('~/src/api/types.js').RequestFormById} RequestFormById
 * @typedef {import('~/src/api/types.js').RequestFormBySlug} RequestFormBySlug
 * @typedef {import('~/src/api/types.js').RequestFormDefinition} RequestFormDefinition
 * @typedef {import('~/src/api/types.js').RequestFormMetadata} RequestFormMetadata
 */
