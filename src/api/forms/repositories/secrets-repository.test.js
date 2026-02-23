import Boom from '@hapi/boom'
import { MongoServerError } from 'mongodb'

import { buildMockCollection } from '~/src/api/forms/__stubs__/mongo.js'
import {
  exists,
  get,
  save
} from '~/src/api/forms/repositories/secrets-repository.js'
import author from '~/src/api/forms/service/__stubs__/author.js'
import { db } from '~/src/mongo.js'

const mockCollection = buildMockCollection()
/**
 * @type {any}
 */
const mockSession = author
jest.mock('~/src/mongo.js', () => {
  let isPrepared = false
  const collection =
    /** @satisfies {Collection<{draft: FormDefinition}>} */ jest
      .fn()
      .mockImplementation(() => mockCollection)
  return {
    db: {
      collection
    },
    get client() {
      if (!isPrepared) {
        return undefined
      }

      return {
        startSession: () => ({
          endSession: jest.fn().mockResolvedValue(undefined),
          withTransaction: jest.fn(
            /**
             * Mock transaction handler
             * @param {() => Promise<void>} fn
             */
            async (fn) => fn()
          )
        })
      }
    },

    prepareDb() {
      isPrepared = true
      return Promise.resolve()
    }
  }
})

const mockLoggerError = jest.fn()
const mockLoggerInfo = jest.fn()
const mockLoggerWarn = jest.fn()

jest.mock('~/src/helpers/logging/logger.js', () => ({
  createLogger: jest.fn().mockReturnValue({
    // @ts-expect-error - error handling uses any type
    error: (err, message) => mockLoggerError(err, message),
    warn: () => mockLoggerWarn(),
    info: () => mockLoggerInfo()
  })
}))

describe('secrets-repository', () => {
  const formId = 'fe339c6a-1f6e-4ab8-88c6-73fa1528dc90'
  const secret = {
    formId,
    secretName: 'my-secret',
    secretValue: 'my secret value'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .mocked(db.collection)
      .mockReturnValue(/** @type {any} */ (mockCollection))
  })

  describe('get', () => {
    it('should get the secret', async () => {
      mockCollection.findOne.mockResolvedValue(secret)
      const result = await get(formId, 'my-secret', mockSession)
      expect(result).toEqual(secret)
    })

    it('should fail if secret not found', async () => {
      mockCollection.findOne.mockResolvedValue(undefined)
      await expect(get(formId, 'my-secret', mockSession)).rejects.toThrow(
        `Form secret 'my-secret' on form ID '${formId}' not found`
      )
    })

    it('should throw if db error', async () => {
      mockCollection.findOne.mockImplementationOnce(() => {
        throw new Error('DB error get')
      })
      await expect(() => get(formId, 'my-secret', mockSession)).rejects.toThrow(
        'DB error get'
      )
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.anything(),
        "[getSecret] Getting form secret 'my-secret' with form ID fe339c6a-1f6e-4ab8-88c6-73fa1528dc90 failed - DB error get"
      )
    })

    it('should throw if Boom error', async () => {
      mockCollection.findOne.mockImplementationOnce(() => {
        throw Boom.badRequest('Boom error')
      })
      await expect(() => get(formId, 'my-secret', mockSession)).rejects.toThrow(
        'Boom error'
      )
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.anything(),
        "[getSecret] Getting form secret 'my-secret' with form ID fe339c6a-1f6e-4ab8-88c6-73fa1528dc90 failed - Boom error"
      )
    })
  })

  describe('exists', () => {
    it('should return true if the secret exists', async () => {
      mockCollection.findOne.mockResolvedValue(secret)
      const result = await exists(formId, 'my-secret', mockSession)
      expect(result).toBe(true)
    })

    it('should return false if secret not found', async () => {
      mockCollection.findOne.mockResolvedValue(undefined)
      const result = await exists(formId, 'my-secret', mockSession)
      expect(result).toBe(false)
    })

    it('should throw if db error', async () => {
      mockCollection.findOne.mockImplementationOnce(() => {
        throw new Error('DB error exists')
      })
      await expect(() =>
        exists(formId, 'my-secret', mockSession)
      ).rejects.toThrow('DB error exists')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.anything(),
        "[existsSecret] Checking existence of form secret 'my-secret' with form ID fe339c6a-1f6e-4ab8-88c6-73fa1528dc90 failed - DB error exists"
      )
    })

    it('should throw if Boom error', async () => {
      mockCollection.findOne.mockImplementationOnce(() => {
        throw Boom.badRequest('Boom error')
      })
      await expect(() =>
        exists(formId, 'my-secret', mockSession)
      ).rejects.toThrow('Boom error')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.anything(),
        "[existsSecret] Checking existence of form secret 'my-secret' with form ID fe339c6a-1f6e-4ab8-88c6-73fa1528dc90 failed - Boom error"
      )
    })
  })

  describe('save', () => {
    it('should return true if the secret exists', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(secret)
      const result = await save(
        formId,
        'my-secret',
        'my secret value',
        mockSession
      )
      expect(result).toEqual(secret)
    })

    it('should throw if db error', async () => {
      mockCollection.findOneAndUpdate.mockImplementationOnce(() => {
        throw new MongoServerError({ message: 'DB error insert' })
      })
      await expect(() =>
        save(formId, 'my-secret', 'my secret value', mockSession)
      ).rejects.toThrow('DB error insert')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.anything(),
        "[mongoError] Secret with name 'my-secret' for form ID fe339c6a-1f6e-4ab8-88c6-73fa1528dc90 failed to save - MongoDB error code: undefined - DB error insert"
      )
    })

    it('should throw if other error', async () => {
      mockCollection.findOneAndUpdate.mockImplementationOnce(() => {
        throw new Error('DB error insert')
      })
      await expect(() =>
        save(formId, 'my-secret', 'my secret value', mockSession)
      ).rejects.toThrow('DB error insert')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.anything(),
        "[updateError] Secret with name 'my-secret' for form ID fe339c6a-1f6e-4ab8-88c6-73fa1528dc90 failed to save - DB error insert"
      )
    })
  })
})
