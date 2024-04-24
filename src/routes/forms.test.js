import {
  FailedToReadFormError,
  FormAlreadyExistsError
} from '../api/forms/errors.js'

import {
  listForms,
  createForm,
  getForm,
  getFormDefinition
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
  const stubFormInput = {
    title: 'Test form',
    organisation: 'Defra',
    teamName: 'Defra Forms',
    teamEmail: 'defraforms@defra.gov.uk'
  }
  const stubFormOutput = {
    id,
    slug: 'test-form',
    title: 'Test form',
    organisation: 'Defra',
    teamName: 'Defra Forms',
    teamEmail: 'defraforms@defra.gov.uk'
  }
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
  const internalErrorResponse = {
    error: 'Internal Server Error',
    message: 'An internal server error occurred',
    statusCode: 500
  }

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
      jest.mocked(listForms).mockResolvedValue([stubFormOutput])

      const response = await server.inject({
        method: 'GET',
        url: '/forms'
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual([stubFormOutput])
    })

    test('Testing POST /forms route returns a new form', async () => {
      jest.mocked(createForm).mockResolvedValue(stubFormOutput)

      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: stubFormInput
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        id: stubFormOutput.id,
        status: 'created'
      })
    })

    test('Testing GET /forms/{id} route returns a form', async () => {
      jest.mocked(getForm).mockResolvedValue(stubFormOutput)

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}`
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual(stubFormOutput)
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
      expect(response.result).toEqual(internalErrorResponse)
    })

    test('Testing POST /forms route with an empty payload returns validation errors', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: {}
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message:
          '"title" is required. "organisation" is required. "teamName" is required. "teamEmail" is required',
        statusCode: 400,
        validation: {
          keys: ['title', 'organisation', 'teamName', 'teamEmail'],
          source: 'payload'
        }
      })
    })

    test('Testing POST /forms route with an invalid payload returns validation errors', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: { title: '', organisation: '', teamName: '', teamEmail: '' }
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message:
          '"title" is not allowed to be empty. "organisation" is not allowed to be empty. "teamName" is not allowed to be empty. "teamEmail" is not allowed to be empty',
        statusCode: 400,
        validation: {
          keys: ['title', 'organisation', 'teamName', 'teamEmail'],
          source: 'payload'
        }
      })
    })

    test('Testing POST /forms route with an invalid payload returns validation errors', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: {
          title: ' ',
          organisation: ' ',
          teamName: ' ',
          teamEmail: ' '
        }
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message:
          '"title" is not allowed to be empty. "organisation" is not allowed to be empty. "teamName" is not allowed to be empty. "teamEmail" is not allowed to be empty',
        statusCode: 400,
        validation: {
          keys: ['title', 'organisation', 'teamName', 'teamEmail'],
          source: 'payload'
        }
      })
    })

    test('Testing POST /forms route with an invalid payload returns validation errors', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: {
          title: 'x'.repeat(251),
          organisation: 'orgname',
          teamName: 'teamname',
          teamEmail: 'test@example.com'
        }
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message:
          '"title" length must be less than or equal to 250 characters long',
        statusCode: 400,
        validation: {
          keys: ['title'],
          source: 'payload'
        }
      })
    })

    test('Testing POST /forms route with an invalid payload returns validation errors', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: {
          title: 'title',
          organisation: 'x'.repeat(101),
          teamName: 'teamname',
          teamEmail: 'test@example.com'
        }
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message:
          '"organisation" length must be less than or equal to 100 characters long',
        statusCode: 400,
        validation: {
          keys: ['organisation'],
          source: 'payload'
        }
      })
    })

    test('Testing POST /forms route with an invalid payload returns validation errors', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: {
          title: 'title',
          organisation: 'orgname',
          teamName: 'x'.repeat(101),
          teamEmail: 'test@example.com'
        }
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message:
          '"teamName" length must be less than or equal to 100 characters long',
        statusCode: 400,
        validation: {
          keys: ['teamName'],
          source: 'payload'
        }
      })
    })

    test('Testing POST /forms route with an invalid payload returns validation errors', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: {
          title: 'title',
          organisation: 'orgname',
          teamName: 'x'.repeat(101),
          teamEmail: 'test@example.com'
        }
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message:
          '"teamName" length must be less than or equal to 100 characters long',
        statusCode: 400,
        validation: {
          keys: ['teamName'],
          source: 'payload'
        }
      })
    })

    test('Testing POST /forms route with an slug that already exists returns 400 FormAlreadyExistsError', async () => {
      jest
        .mocked(createForm)
        .mockRejectedValue(new FormAlreadyExistsError('my-title'))

      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: {
          title: 'My Title',
          organisation: 'orgname',
          teamName: 'teamname',
          teamEmail: 'test@example.com'
        }
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        statusCode: 400,
        error: 'FormAlreadyExistsError',
        message: 'Form with slug my-title already exists'
      })
    })

    test('Testing POST /forms route with an invalid payload returns validation errors', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/forms',
        payload: {
          title: 'title',
          organisation: 'orgname',
          teamName: 'teamname',
          teamEmail: `x`
        }
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message: '"teamEmail" must be a valid email',
        statusCode: 400,
        validation: {
          keys: ['teamEmail'],
          source: 'payload'
        }
      })
    })

    test('Testing GET /forms/{id} route with an invalid id returns validation errors', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/forms/1'
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message: '"id" length must be 24 characters long',
        statusCode: 400,
        validation: {
          keys: ['id'],
          source: 'params'
        }
      })
    })

    test('Testing GET /forms/{id} route with an invalid id returns validation errors', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/forms/${'x'.repeat(24)}`
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message: '"id" must only contain hexadecimal characters',
        statusCode: 400,
        validation: {
          keys: ['id'],
          source: 'params'
        }
      })
    })

    test('Testing GET /forms/{id} route with an id that is not found returns 404 Not found', async () => {
      jest.mocked(getForm).mockResolvedValue(undefined)

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}`
      })

      expect(response.statusCode).toEqual(notFoundStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Not Found',
        message: `Form with id '${id}' not found`,
        statusCode: 404
      })
    })

    test('Testing GET /forms/{id}/definition route with an invalid id returns validation errors', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/forms/1/definition'
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message: '"id" length must be 24 characters long',
        statusCode: 400,
        validation: {
          keys: ['id'],
          source: 'params'
        }
      })
    })

    test('Testing GET /forms/{id}/definition route with an invalid id returns validation errors', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/forms/${'x'.repeat(24)}/definition`
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Bad Request',
        message: '"id" must only contain hexadecimal characters',
        statusCode: 400,
        validation: {
          keys: ['id'],
          source: 'params'
        }
      })
    })

    test('Testing GET /forms/{id}/definition route with an id that is not found returns 404 Not found', async () => {
      jest.mocked(getFormDefinition).mockImplementation(() => {
        throw new FailedToReadFormError('Failed')
      })

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}/definition`
      })

      expect(response.statusCode).toEqual(notFoundStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        error: 'Not Found',
        message: 'Failed',
        statusCode: 404
      })
    })

    test('Testing GET /forms/{id}/definition route throws unknown error', async () => {
      jest.mocked(getFormDefinition).mockImplementation(() => {
        throw new Error('Unknown error')
      })

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}/definition`
      })

      expect(response.statusCode).toEqual(internalErrorStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual(internalErrorResponse)
    })
  })
})

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 */
