import util from 'node:util'

import { FormStatus, getErrorMessage } from '@defra/forms-model'

import * as def from '~/src/api/forms/repositories/form-definition-repository.js'
import * as meta from '~/src/api/forms/repositories/form-metadata-repository.js'
import { getValidationSchema } from '~/src/api/forms/service/helpers/definition.js'
import { feedbackDefinition } from '~/src/helpers/feedback-form/definition.js'
import { feedbackMetadata } from '~/src/helpers/feedback-form/metadata.js'

const moduleTag = '[reinstateFeedbackForm]'

/**
 *
 * @param { WithId<FormMetadataDocument> | FormDefinition | undefined} doc1
 * @param { FormMetadata | FormDefinition } doc2
 * @returns
 */
export function isDocumenDifferent(doc1, doc2) {
  return !util.isDeepStrictEqual(
    {
      ...doc1,
      _id: undefined
    },
    {
      ...doc2,
      _id: undefined
    }
  )
}

/**
 * @param {ClientSession} session
 * @param {Logger} logger
 * @returns {Promise<string>}
 */
export async function saveMetadata(session, logger) {
  const { slug } = feedbackMetadata

  /** @type { WithId<FormMetadataDocument> | undefined } */
  let existing
  try {
    existing = await meta.getBySlug(slug, session)
  } catch {}

  if (existing) {
    logger.info(`${moduleTag} Metadata - found existing`)
    if (isDocumenDifferent(existing, feedbackMetadata)) {
      logger.error(`${moduleTag} Metadata - docs different, updating`)
      await meta.update(
        feedbackMetadata.id,
        { $set: feedbackMetadata },
        session
      )
    }
  } else {
    logger.error(`${moduleTag} Metadata - missing, inserting`)
    const res = await meta.create(feedbackMetadata, session)
    return res.insertedId.toString()
  }

  return existing._id.toString()
}

/**
 * @param {string} formId
 * @param {ClientSession} session
 * @param {Logger} logger
 */
export async function saveDefinition(formId, session, logger) {
  // DRAFT
  /** @type { FormDefinition | undefined } */
  let existingDraft
  try {
    existingDraft = await def.get(formId, FormStatus.Draft, session)
  } catch {}

  const schema = getValidationSchema(feedbackDefinition)
  if (existingDraft) {
    logger.info(`${moduleTag} Definition - found existing draft`)
    if (isDocumenDifferent(existingDraft, feedbackDefinition)) {
      logger.error(`${moduleTag} Definition - docs different draft, updating`)
      await def.update(formId, feedbackDefinition, session, schema)
    }
  } else {
    logger.error(`${moduleTag} Definition - missing draft, inserting`)
    await def.insert(formId, feedbackDefinition, session, schema)
  }

  // LIVE
  /** @type { FormDefinition | undefined } */
  let existingLive
  try {
    existingLive = await def.get(formId, FormStatus.Live, session)
  } catch {}

  if (isDocumenDifferent(existingLive, feedbackDefinition)) {
    logger.error(`${moduleTag} Definition - docs different live, updating`)
    await def.createLiveFromDraft(formId, session)
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
      // Rather than do an upsert (which would be based on slug or id), overwrite even if it exists
      // to ensure the contents exactly match the supplied JSON

      // Ensure exact metadata exists
      const formId = await saveMetadata(session, logger)

      // Ensure exact metadata exists
      await saveDefinition(formId, session, logger)
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
