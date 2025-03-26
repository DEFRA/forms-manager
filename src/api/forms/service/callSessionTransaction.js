import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { logger, partialAuditFields } from '~/src/api/forms/service/shared.js'
import { client } from '~/src/mongo.js'

/**
 * Abstraction of a generic service method
 * @template T
 * @param {string} formId
 * @param {(session: ClientSession) => Promise<T>} asyncHandler
 * @param {FormMetadataAuthor} author
 * @param {{ start: string; end: string; fail: string }} logs
 * @returns {Promise<T>}
 */
export async function callSessionTransaction(
  formId,
  asyncHandler,
  author,
  logs
) {
  logger.info(logs.start)

  const session = client.startSession()

  try {
    const sessionReturn = await session.withTransaction(async () => {
      const handlerReturn = await asyncHandler(session)

      // Update the form with the new draft state
      await formMetadata.update(
        formId,
        { $set: partialAuditFields(new Date(), author) },
        session
      )

      return handlerReturn
    })
    logger.info(logs.end)

    return sessionReturn
  } catch (err) {
    logger.error(err, logs.fail)
    throw err
  } finally {
    await session.endSession()
  }
}

/**
 * @import { FormMetadataAuthor } from '@defra/forms-model'
 * @import { ClientSession } from 'mongodb'
 */
