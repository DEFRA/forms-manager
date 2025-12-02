import { getErrorMessage } from '@defra/forms-model'

import * as def from '~/src/api/forms/repositories/form-definition-repository.js'
import * as meta from '~/src/api/forms/repositories/form-metadata-repository.js'
import { feedbackDefinition } from '~/src/helpers/feedback-form/definition.js'
import { feedbackMetadata } from '~/src/helpers/feedback-form/metadata.js'

const moduleTag = '[reinstateFeedbackForm]'

/**
 * @param {FormMetadata} metadata
 * @param {ClientSession} session
 * @param {Logger} logger
 */
export async function saveMetadata(metadata, session, logger) {
  const { modifiedCount, upsertedCount } = await meta.upsert(metadata, session)

  if (modifiedCount + upsertedCount) {
    logger.error(`${moduleTag} Metadata - inserted or updated`)
  } else {
    logger.info(`${moduleTag} Metadata - already exists with correct content`)
  }
}

/**
 * @param {string} formId
 * @param {ClientSession} session
 * @param {Logger} logger
 */
export async function saveDefinition(formId, session, logger) {
  const { modifiedCount, upsertedCount } = await def.upsertDraftAndLive(
    formId,
    {
      draft: feedbackDefinition,
      live: feedbackDefinition
    },
    session
  )

  if (modifiedCount + upsertedCount) {
    logger.error(`${moduleTag} Definition - inserted or updated`)
  } else {
    logger.info(`${moduleTag} Definition - already exists with correct content`)
  }

  return {
    modifiedCount,
    upsertedCount
  }
}

/**
 *
 * @param {MongoClient} client
 * @param {Logger} logger
 */
export async function reinstateFeedbackForm(client, logger) {
  const session = client.startSession()

  logger.info(
    `${moduleTag} Checking if feedback form exists and has correct contents`
  )

  try {
    await session.withTransaction(async () => {
      // Ensure definition exists with expected content
      const { modifiedCount, upsertedCount } = await saveDefinition(
        feedbackMetadata.id,
        session,
        logger
      )

      // Ensure metadata exists with expected content
      const metadata = { ...feedbackMetadata }

      if (upsertedCount) {
        // Set CreatedAt timestamp on metadata
        metadata.createdAt = new Date()
      }

      if (upsertedCount || modifiedCount) {
        // Set UpdatedAt timestamp on metadata
        metadata.updatedAt = new Date()
      }

      await saveMetadata(metadata, session, logger)
    })
    logger.info(`${moduleTag} Completed check for feedback form`)
  } catch (err) {
    logger.error(
      err,
      `${moduleTag} Failed during reinstate Feedback Form - ${getErrorMessage(err)}`
    )
  } finally {
    await session.endSession()
  }
}

/**
 * @import { ClientSession, MongoClient, WithId } from 'mongodb'
 * @import { FormDefinition, FormMetadata, FormMetadataDocument } from '@defra/forms-model'
 * @import { Logger } from 'pino'
 */
