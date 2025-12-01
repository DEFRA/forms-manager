import { buildMockCollection } from '~/src/api/forms/__stubs__/mongo.js'
import { feedbackDefinition } from '~/src/helpers/feedback-form/definition.js'
import { feedbackMetadata } from '~/src/helpers/feedback-form/metadata.js'
import { reinstateFeedbackForm } from '~/src/helpers/feedback-form/reinstate.js'
import { client, db } from '~/src/mongo.js'

const formId = '691df13266b1bdc98fa3e73a'

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
    mockCollection.findOne.mockResolvedValue(undefined)
    mockCollection.insertOne.mockResolvedValue({ insertedId: formId })
    mockCollection.findOneAndUpdate.mockResolvedValue({ insertedId: formId })

    await reinstateFeedbackForm(client, mockLogger)

    expect(mockLogger.info).toHaveBeenCalledTimes(2)
    expect(mockLogger.error).toHaveBeenCalledTimes(3)

    expect(mockLogger.info.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Checking if feedback form exists and has correct contents'
    )
    expect(mockLogger.info.mock.calls[1][0]).toBe(
      '[reinstateFeedbackForm] Completed check for feedback form'
    )

    expect(mockLogger.error.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Metadata - missing, inserting'
    )
    expect(mockLogger.error.mock.calls[1][0]).toBe(
      '[reinstateFeedbackForm] Definition - missing draft, inserting'
    )
    expect(mockLogger.error.mock.calls[2][0]).toBe(
      '[reinstateFeedbackForm] Definition - docs different live, updating'
    )
  })

  test('should insert only metadata when missing', async () => {
    mockCollection.findOne.mockResolvedValueOnce(undefined).mockResolvedValue({
      draft: feedbackDefinition,
      live: feedbackDefinition
    })
    mockCollection.insertOne.mockResolvedValue({ insertedId: formId })
    mockCollection.findOneAndUpdate.mockResolvedValue({ insertedId: formId })

    await reinstateFeedbackForm(client, mockLogger)

    expect(mockLogger.info).toHaveBeenCalledTimes(3)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)

    expect(mockLogger.info.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Checking if feedback form exists and has correct contents'
    )
    expect(mockLogger.info.mock.calls[1][0]).toBe(
      '[reinstateFeedbackForm] Definition - found existing draft'
    )
    expect(mockLogger.info.mock.calls[2][0]).toBe(
      '[reinstateFeedbackForm] Completed check for feedback form'
    )

    expect(mockLogger.error.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Metadata - missing, inserting'
    )
  })

  test('should update only metadata when different', async () => {
    mockCollection.findOne
      .mockResolvedValueOnce({ id: formId, _id: formId })
      .mockResolvedValue({
        draft: feedbackDefinition,
        live: feedbackDefinition
      })
    mockCollection.insertOne.mockResolvedValue({ insertedId: formId })
    mockCollection.findOneAndUpdate.mockResolvedValue({ insertedId: formId })
    mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 })

    await reinstateFeedbackForm(client, mockLogger)

    expect(mockLogger.info).toHaveBeenCalledTimes(4)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)

    expect(mockLogger.info.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Checking if feedback form exists and has correct contents'
    )
    expect(mockLogger.info.mock.calls[1][0]).toBe(
      '[reinstateFeedbackForm] Metadata - found existing'
    )
    expect(mockLogger.info.mock.calls[2][0]).toBe(
      '[reinstateFeedbackForm] Definition - found existing draft'
    )
    expect(mockLogger.info.mock.calls[3][0]).toBe(
      '[reinstateFeedbackForm] Completed check for feedback form'
    )

    expect(mockLogger.error.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Metadata - docs different, updating'
    )
  })

  test('should update only draft definition when different', async () => {
    mockCollection.findOne
      .mockResolvedValueOnce({ _id: formId, ...feedbackMetadata })
      .mockResolvedValue({
        draft: {
          ...feedbackDefinition,
          name: 'different'
        },
        live: feedbackDefinition
      })
    mockCollection.insertOne.mockResolvedValue({ insertedId: formId })
    mockCollection.findOneAndUpdate.mockResolvedValue({ insertedId: formId })
    mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 })

    await reinstateFeedbackForm(client, mockLogger)

    expect(mockLogger.info).toHaveBeenCalledTimes(4)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)

    expect(mockLogger.info.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Checking if feedback form exists and has correct contents'
    )
    expect(mockLogger.info.mock.calls[1][0]).toBe(
      '[reinstateFeedbackForm] Metadata - found existing'
    )
    expect(mockLogger.info.mock.calls[2][0]).toBe(
      '[reinstateFeedbackForm] Definition - found existing draft'
    )
    expect(mockLogger.info.mock.calls[3][0]).toBe(
      '[reinstateFeedbackForm] Completed check for feedback form'
    )

    expect(mockLogger.error.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Definition - docs different draft, updating'
    )
  })

  test('should throw error when db error', async () => {
    mockCollection.findOne.mockResolvedValueOnce(undefined).mockResolvedValue({
      draft: feedbackDefinition,
      live: feedbackDefinition
    })
    mockCollection.insertOne.mockImplementation(() => {
      throw new Error('DB error')
    })
    mockCollection.findOneAndUpdate.mockResolvedValue({ insertedId: formId })
    mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 })

    await reinstateFeedbackForm(client, mockLogger)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledTimes(2)

    expect(mockLogger.info.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Checking if feedback form exists and has correct contents'
    )

    expect(mockLogger.error.mock.calls[0][0]).toBe(
      '[reinstateFeedbackForm] Metadata - missing, inserting'
    )
    expect(mockLogger.error.mock.calls[1][0]).toEqual(new Error('DB error'))
  })
})
