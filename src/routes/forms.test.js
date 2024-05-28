import { organisations } from '@defra/forms-model' /*  */
import Boom from '@hapi/boom'

import { FormAlreadyExistsError } from '~/src/api/forms/errors.js'
import {
  listForms,
  createForm,
  getForm,
  getFormDefinition,
  getFormBySlug,
  createLiveFromDraft,
  createDraftFromLive
} from '~/src/api/forms/service.js'
import { createServer } from '~/src/api/server.js'
import { auth } from '~/test/fixtures/auth.js'

jest.mock('~/src/db.js')
jest.mock('~/src/api/forms/service.js')

describe('Forms route', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(() => {
    return server.stop()
  })

  const okStatusCode = 200
  const badRequestStatusCode = 400
  const notFoundStatusCode = 404
  const internalErrorStatusCode = 500
  const jsonContentType = 'application/json'
  const id = '661e4ca5039739ef2902b214'
  const now = new Date()
  const authorId = 'f50ceeed-b7a4-47cf-a498-094efc99f8bc'
  const authorDisplayName = 'Enrique Chase'

  /**
   * @satisfies {FormMetadataAuthor}
   */
  const author = { id: authorId, displayName: authorDisplayName }

  /**
   * @satisfies {FormMetadataInput}
   */
  const stubFormMetadataInput = {
    title: 'Test form',
    organisation: 'Defra',
    teamName: 'Defra Forms',
    teamEmail: 'defraforms@defra.gov.uk'
  }

  /**
   * @satisfies {FormMetadata}
   */
  const stubFormMetadataOutput = {
    id,
    slug: 'test-form',
    title: 'Test form',
    organisation: 'Defra',
    teamName: 'Defra Forms',
    teamEmail: 'defraforms@defra.gov.uk',
    draft: {
      createdAt: now,
      createdBy: author,
      updatedAt: now,
      updatedBy: author
    }
  }

  /**
   * @satisfies {FormDefinition}
   */
  const stubFormDefinition = {
    name: '',
    startPage: '/page-one',
    pages: [],
    conditions: [],
    sections: [],
    lists: [],
    outputs: []
  }

  const slug = stubFormMetadataOutput.slug

  describe('Success responses', () => {
    test('Testing GET /forms route returns empty array', async () => {
      jest.mocked(listForms).mockResolvedValue([])

      const response = await server.inject({
        method: 'GET',
        url: '/forms',
        auth
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual([])
    })

    test('Testing GET /forms route returns a list of forms', async () => {
      jest.mocked(listForms).mockResolvedValue([stubFormMetadataOutput])

      const response = await server.inject({
        method: 'GET',
        url: '/forms',
        auth
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual([stubFormMetadataOutput])
    })

    test('Testing POST /forms route returns a "created" status', async () => {
      jest.mocked(createForm).mockResolvedValue(stubFormMetadataOutput)

      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: stubFormMetadataInput,
        auth
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        id: stubFormMetadataOutput.id,
        slug: 'test-form',
        status: 'created'
      })
    })

    test('Testing GET /forms/{id} route returns a form', async () => {
      jest.mocked(getForm).mockResolvedValue(stubFormMetadataOutput)

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}`
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual(stubFormMetadataOutput)
    })

    test('Testing GET /forms/slug/{slug} route returns a form', async () => {
      jest.mocked(getFormBySlug).mockResolvedValue(stubFormMetadataOutput)

      const response = await server.inject({
        method: 'GET',
        url: `/forms/slug/${slug}`
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual(stubFormMetadataOutput)
    })

    test('Testing GET /forms/{id}/definition route returns a form definition', async () => {
      jest.mocked(getFormDefinition).mockResolvedValue(stubFormDefinition)

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}/definition`
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual(stubFormDefinition)
    })

    test('Testing GET /forms/{id}/definition/draft route returns a form definition', async () => {
      jest.mocked(getFormDefinition).mockResolvedValue(stubFormDefinition)

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}/definition/draft`
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual(stubFormDefinition)
    })

    test('Testing POST /forms/{id}/create-live route returns a "created-live" status', async () => {
      jest.mocked(createLiveFromDraft).mockResolvedValue(undefined)

      const response = await server.inject({
        method: 'POST',
        url: `/forms/${id}/create-live`,
        auth
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        id: stubFormMetadataOutput.id,
        status: 'created-live'
      })
    })

    test('Testing POST /forms/{id}/create-draft route returns a "created-draft" status', async () => {
      jest.mocked(createDraftFromLive).mockResolvedValue(undefined)

      const response = await server.inject({
        method: 'POST',
        url: `/forms/${id}/create-draft`,
        auth
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        id: stubFormMetadataOutput.id,
        status: 'created-draft'
      })
    })
  })

  describe('Error responses', () => {
    test('Testing GET /forms route throws unknown error', async () => {
      jest
        .mocked(listForms)
        .mockResolvedValue(Promise.reject(new Error('Unknown error')))

      const response = await server.inject({
        method: 'GET',
        url: '/forms',
        auth
      })

      expect(response.statusCode).toEqual(internalErrorStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        error: 'Internal Server Error',
        message: 'An internal server error occurred'
      })
    })

    test.each([
      {
        payload: {},
        error: {
          keys: ['title', 'organisation', 'teamName', 'teamEmail'],
          messages: [
            '"title" is required.',
            '"organisation" is required.',
            '"teamName" is required.',
            '"teamEmail" is required'
          ]
        }
      },
      {
        payload: {
          title: '',
          organisation: '',
          teamName: '',
          teamEmail: ''
        },
        error: {
          keys: [
            'title',
            'organisation',
            'organisation',
            'teamName',
            'teamEmail'
          ],
          messages: [
            '"title" is not allowed to be empty.',
            `"organisation" must be one of [${organisations.join(', ')}].`,
            '"organisation" is not allowed to be empty.',
            '"teamName" is not allowed to be empty.',
            '"teamEmail" is not allowed to be empty'
          ]
        }
      },
      {
        payload: {
          title: 'x'.repeat(251),
          organisation: 'Defra',
          teamName: 'teamname',
          teamEmail: 'defraforms@defra.gov.uk'
        },
        error: {
          keys: ['title'],
          messages: [
            '"title" length must be less than or equal to 250 characters long'
          ]
        }
      },
      {
        payload: {
          title: 'title',
          organisation: 'Cyberdyne Systems',
          teamName: 'teamname',
          teamEmail: 'defraforms@defra.gov.uk'
        },
        error: {
          keys: ['organisation'],
          messages: [
            `"organisation" must be one of [${organisations.join(', ')}]`
          ]
        }
      },
      {
        payload: {
          title: 'title',
          organisation: 'Defra',
          teamName: 'x'.repeat(101),
          teamEmail: 'defraforms@defra.gov.uk'
        },
        error: {
          keys: ['teamName'],
          messages: [
            '"teamName" length must be less than or equal to 100 characters long'
          ]
        }
      },
      {
        payload: {
          title: 'title',
          organisation: 'Defra',
          teamName: 'teamname',
          teamEmail: `x`
        },
        error: {
          keys: ['teamEmail'],
          messages: ['"teamEmail" must be a valid email']
        }
      }
    ])(
      'Testing POST /forms route with an invalid payload returns validation errors',
      async ({ payload: metadata, error }) => {
        const response = await server.inject({
          method: 'POST',
          url: '/forms',
          payload: metadata,
          auth
        })

        expect(response.statusCode).toEqual(badRequestStatusCode)
        expect(response.headers['content-type']).toContain(jsonContentType)
        expect(response.result).toMatchObject({
          error: 'Bad Request',
          message: error.messages.join(' '),
          validation: {
            keys: error.keys,
            source: 'payload'
          }
        })
      }
    )

    test('Testing POST /forms route with an slug that already exists returns 400 FormAlreadyExistsError', async () => {
      jest
        .mocked(createForm)
        .mockRejectedValue(new FormAlreadyExistsError('my-title'))

      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: {
          title: 'My Title',
          organisation: 'Defra',
          teamName: 'teamname',
          teamEmail: 'defraforms@defra.gov.uk'
        },
        auth
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        error: 'FormAlreadyExistsError',
        message: 'Form with slug my-title already exists'
      })
    })

    test.each([
      {
        url: '/forms/1',
        error: {
          keys: ['id'],
          messages: ['"id" length must be 24 characters long']
        }
      },
      {
        url: `/forms/${'x'.repeat(24)}`,
        error: {
          keys: ['id'],
          messages: ['"id" must only contain hexadecimal characters']
        }
      }
    ])(
      'Testing GET /forms/{id} route with an invalid id returns validation errors',
      async ({ url, error }) => {
        const response = await server.inject({ method: 'GET', url })

        expect(response.statusCode).toEqual(badRequestStatusCode)
        expect(response.headers['content-type']).toContain(jsonContentType)
        expect(response.result).toMatchObject({
          error: 'Bad Request',
          message: error.messages.join(' '),
          validation: {
            keys: error.keys,
            source: 'params'
          }
        })
      }
    )

    test('Testing GET /forms/{id} route with an id that is not found returns 404 Not found', async () => {
      jest.mocked(getForm).mockRejectedValue(Boom.notFound())

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}`
      })

      expect(response.statusCode).toEqual(notFoundStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
    })

    test('Testing GET /forms/{slug} route with an id that is not found returns 404 Not found', async () => {
      jest
        .mocked(getFormBySlug)
        .mockRejectedValue(Boom.notFound(`Form with slug '${slug}' not found`))

      const response = await server.inject({
        method: 'GET',
        url: `/forms/slug/${slug}`
      })

      expect(response.statusCode).toEqual(notFoundStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        error: 'Not Found',
        message: `Form with slug '${slug}' not found`
      })
    })

    test.each([
      {
        url: '/forms/1/definition/draft',
        error: {
          keys: ['id'],
          messages: ['"id" length must be 24 characters long']
        }
      },
      {
        url: `/forms/${'x'.repeat(24)}/definition/draft`,
        error: {
          keys: ['id'],
          messages: ['"id" must only contain hexadecimal characters']
        }
      }
    ])(
      'Testing GET /forms/{id}/definition/draft route with an invalid id returns validation errors',
      async ({ url, error }) => {
        const response = await server.inject({ method: 'GET', url })

        expect(response.statusCode).toEqual(badRequestStatusCode)
        expect(response.headers['content-type']).toContain(jsonContentType)
        expect(response.result).toMatchObject({
          error: 'Bad Request',
          message: error.messages.join(' '),
          validation: {
            keys: error.keys,
            source: 'params'
          }
        })
      }
    )

    test('Testing GET /forms/{id}/definition/draft route with an id that is not found returns 404 Not found', async () => {
      jest.mocked(getFormDefinition).mockRejectedValue(Boom.notFound())

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}/definition/draft`
      })

      expect(response.statusCode).toEqual(notFoundStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        error: 'Not Found',
        message: 'Not Found'
      })
    })

    test('Testing GET /forms/{id}/definition/draft route throws unknown error', async () => {
      jest
        .mocked(getFormDefinition)
        .mockRejectedValue(new Error('Unknown error'))

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}/definition/draft`
      })

      expect(response.statusCode).toEqual(internalErrorStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        error: 'Internal Server Error',
        message: 'An internal server error occurred'
      })
    })
  })
})

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 * @typedef {import('@defra/forms-model').FormMetadata} FormMetadata
 * @typedef {import('@defra/forms-model').FormMetadataInput} FormMetadataInput
 * @typedef {import('@defra/forms-model').FormMetadataAuthor} FormMetadataAuthor
 */
