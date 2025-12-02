import { buildMockCollection } from '~/src/api/forms/__stubs__/mongo.js'
import { reinstateFeedbackForm } from '~/src/helpers/feedback-form/reinstate.js'
import { client, db } from '~/src/mongo.js'

const mockCollection = buildMockCollection()

/** @type {any} */
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

jest.mock('~/src/mongo.js', () => {
  const collection =
    /** @satisfies {Collection<{draft: FormDefinition}>} */ jest
      .fn()
      .mockImplementation(() => mockCollection)
  return {
    db: {
      collection
    },
    client: {
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
  }
})

jest.mock('~/src/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    error: jest.fn(),
    info: jest.fn()
  })
}))

describe('reinstate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .mocked(db.collection)
      .mockReturnValue(/** @type {any} */ (mockCollection))
    jest.doMock('~/src/helpers/logging/logger.js', () => ({
      createLogger: jest.fn().mockReturnValue(mockLogger)
    }))
  })

  test('should insert both metadata and definition when missing', async () => {
    mockCollection.updateOne.mockResolvedValue({
      upsertedCount: 1,
      modifiedCount: 0
    })

    await reinstateFeedbackForm(client, mockLogger)

    expect(mockLogger.info).toHaveBeenCalledTimes(2)
    expect(mockLogger.error).toHaveBeenCalledTimes(2)

    expect(mockLogger.info.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Checking if feedback form exists and has correct contents'
    )
    expect(mockLogger.info.mock.calls[1][0]).toBe(
      '[reinstateFeedbackForm] Completed check for feedback form'
    )

    expect(mockLogger.error.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Definition - inserted or updated'
    )
    expect(mockLogger.error.mock.calls[1][0]).toBe(
      '[reinstateFeedbackForm] Metadata - inserted or updated'
    )
  })

  test('should insert only metadata when missing', async () => {
    mockCollection.updateOne
      .mockResolvedValueOnce({ upsertedCount: 0, modifiedCount: 0 })
      .mockResolvedValueOnce({ upsertedCount: 1, modifiedCount: 0 })

    await reinstateFeedbackForm(client, mockLogger)

    expect(mockLogger.info).toHaveBeenCalledTimes(3)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)

    expect(mockLogger.info.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Checking if feedback form exists and has correct contents'
    )
    expect(mockLogger.info.mock.calls[1][0]).toBe(
      '[reinstateFeedbackForm] Definition - already exists with correct content'
    )
    expect(mockLogger.info.mock.calls[2][0]).toBe(
      '[reinstateFeedbackForm] Completed check for feedback form'
    )

    expect(mockLogger.error.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Metadata - inserted or updated'
    )
  })
  test('should update only draft definition when different', async () => {
    mockCollection.updateOne
      .mockResolvedValueOnce({ upsertedCount: 0, modifiedCount: 1 })
      .mockResolvedValueOnce({ upsertedCount: 0, modifiedCount: 0 })

    await reinstateFeedbackForm(client, mockLogger)

    expect(mockLogger.info).toHaveBeenCalledTimes(3)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)

    expect(mockLogger.info.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Checking if feedback form exists and has correct contents'
    )
    expect(mockLogger.info.mock.calls[1][0]).toBe(
      '[reinstateFeedbackForm] Metadata - already exists with correct content'
    )
    expect(mockLogger.info.mock.calls[2][0]).toBe(
      '[reinstateFeedbackForm] Completed check for feedback form'
    )

    expect(mockLogger.error.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Definition - inserted or updated'
    )
  })

  test('should throw error when db error', async () => {
    mockCollection.updateOne.mockImplementation(() => {
      throw new Error('DB error')
    })

    await reinstateFeedbackForm(client, mockLogger)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)

    expect(mockLogger.info.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Checking if feedback form exists and has correct contents'
    )

    expect(mockLogger.error.mock.calls[0][0]).toEqual(new Error('DB error'))
  })
})
