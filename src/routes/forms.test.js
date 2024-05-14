import { organisations } from '@defra/forms-model' /*  */

import {
  FailedToReadFormError,
  FormAlreadyExistsError
} from '../api/forms/errors.js'

import {
  listForms,
  createForm,
  getForm,
  getDraftFormDefinition,
  getFormBySlug,
  createLiveFromDraft,
  createDraftFromLive
} from '~/src/api/forms/service.js'
import { createServer } from '~/src/api/server.js'

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
    fees: [],
    outputs: [],
    feeOptions: {
      paymentReferenceFormat: 'string',
      payReturnUrl: 'string',
      allowSubmissionWithoutPayment: true,
      maxAttempts: 1,
      customPayErrorMessage: 'string',
      showPaymentSkippedWarningPage: true
    }
  }

  const slug = stubFormMetadataOutput.slug

  describe('Success responses', () => {
    test('Testing GET /forms route returns empty array', async () => {
      jest.mocked(listForms).mockResolvedValue([])

      const response = await server.inject({
        method: 'GET',
        url: '/forms'
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual([])
    })

    test('Testing GET /forms route returns a list of forms', async () => {
      jest.mocked(listForms).mockResolvedValue([stubFormMetadataOutput])

      const response = await server.inject({
        method: 'GET',
        url: '/forms'
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
        payload: { metadata: stubFormMetadataInput, author }
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        id: stubFormMetadataOutput.id,
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

    test('Testing GET /forms/{id}/definition/draft route returns a form definition', async () => {
      jest.mocked(getDraftFormDefinition).mockResolvedValue(stubFormDefinition)

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}/definition/draft`
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual(stubFormDefinition)
    })

    test('Testing POST /forms/{id}/create-live route returns a "created-live" status', async () => {
      jest.mocked(createLiveFromDraft).mockResolvedValue(true)

      const response = await server.inject({
        method: 'POST',
        url: `/forms/${id}/create-live`,
        payload: author
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        id: stubFormMetadataOutput.id,
        status: 'created-live'
      })
    })

    test('Testing POST /forms/{id}/create-draft route returns a "created-draft" status', async () => {
      jest.mocked(createDraftFromLive).mockResolvedValue(true)

      const response = await server.inject({
        method: 'POST',
        url: `/forms/${id}/create-draft`,
        payload: author
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
        url: '/forms'
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
          keys: [
            'metadata.title',
            'metadata.organisation',
            'metadata.teamName',
            'metadata.teamEmail'
          ],
          messages: [
            '"metadata.title" is required.',
            '"metadata.organisation" is required.',
            '"metadata.teamName" is required.',
            '"metadata.teamEmail" is required'
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
            'metadata.title',
            'metadata.organisation',
            'metadata.organisation',
            'metadata.teamName',
            'metadata.teamEmail'
          ],
          messages: [
            '"metadata.title" is not allowed to be empty.',
            `"metadata.organisation" must be one of [${organisations.join(', ')}].`,
            '"metadata.organisation" is not allowed to be empty.',
            '"metadata.teamName" is not allowed to be empty.',
            '"metadata.teamEmail" is not allowed to be empty'
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
          keys: ['metadata.title'],
          messages: [
            '"metadata.title" length must be less than or equal to 250 characters long'
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
          keys: ['metadata.organisation'],
          messages: [
            `"metadata.organisation" must be one of [${organisations.join(', ')}]`
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
          keys: ['metadata.teamName'],
          messages: [
            '"metadata.teamName" length must be less than or equal to 100 characters long'
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
          keys: ['metadata.teamEmail'],
          messages: ['"metadata.teamEmail" must be a valid email']
        }
      }
    ])(
      'Testing POST /forms route with an invalid payload returns validation errors',
      async ({ payload: metadata, error }) => {
        const response = await server.inject({
          method: 'POST',
          url: '/forms',
          payload: { metadata, author }
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
          metadata: {
            title: 'My Title',
            organisation: 'Defra',
            teamName: 'teamname',
            teamEmail: 'defraforms@defra.gov.uk'
          },
          author
        }
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
      jest.mocked(getForm).mockResolvedValue(undefined)

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}`
      })

      expect(response.statusCode).toEqual(notFoundStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        error: 'Not Found',
        message: `Form with id '${id}' not found`
      })
    })

    test('Testing GET /forms/{slug} route with an id that is not found returns 404 Not found', async () => {
      jest.mocked(getFormBySlug).mockResolvedValue(undefined)

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
      jest
        .mocked(getDraftFormDefinition)
        .mockRejectedValue(new FailedToReadFormError('Failed'))

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}/definition/draft`
      })

      expect(response.statusCode).toEqual(notFoundStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        error: 'Not Found',
        message: 'Failed'
      })
    })

    test('Testing GET /forms/{id}/definition/draft route throws unknown error', async () => {
      jest
        .mocked(getDraftFormDefinition)
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

    test.each([
      {
        payload: {},
        error: {
          keys: ['id', 'displayName'],
          messages: ['"id" is required.', '"displayName" is required']
        }
      },
      {
        payload: {
          id: '',
          displayName: ''
        },
        error: {
          keys: ['id', 'displayName'],
          messages: [
            '"id" is not allowed to be empty.',
            '"displayName" is not allowed to be empty'
          ]
        }
      }
    ])(
      'Testing POST /forms/{id}/create-live route with an invalid payload returns validation errors',
      async ({ payload, error }) => {
        const response = await server.inject({
          method: 'POST',
          url: `/forms/${id}/create-live`,
          payload
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

    test.each([
      {
        payload: {},
        error: {
          keys: ['id', 'displayName'],
          messages: ['"id" is required.', '"displayName" is required']
        }
      },
      {
        payload: {
          id: '',
          displayName: ''
        },
        error: {
          keys: ['id', 'displayName'],
          messages: [
            '"id" is not allowed to be empty.',
            '"displayName" is not allowed to be empty'
          ]
        }
      },
      {
        payload: {
          id: 'x'.repeat(36),
          displayName: authorDisplayName
        },
        error: {
          keys: ['id'],
          messages: ['"id" must be a valid GUID']
        }
      }
    ])(
      'Testing POST /forms/{id}/create-draft route with an invalid payload returns validation errors',
      async ({ payload, error }) => {
        const response = await server.inject({
          method: 'POST',
          url: `/forms/${id}/create-draft`,
          payload
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
  })
})

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 * @typedef {import('@defra/forms-model').FormMetadata} FormMetadata
 * @typedef {import('@defra/forms-model').FormMetadataInput} FormMetadataInput
 * @typedef {import('@defra/forms-model').FormMetadataAuthor} FormMetadataAuthor
 */
