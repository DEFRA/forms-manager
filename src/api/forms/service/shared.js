import { FormStatus } from '@defra/forms-model'

import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { client } from '~/src/mongo.js'

export const logger = createLogger()
export const defaultAuthor = {
  displayName: 'Unknown',
  id: '-1'
}
export const defaultDate = new Date('2024-06-25T23:00:00Z') // date we went live

/**
 * Partially update the [state] fields
 * @param {Date} date
 * @param {FormMetadataAuthor} author
 * @param {FormStatus} state
 * @returns {PartialFormMetadataDocument}
 */
export function partialAuditFields(date, author, state = FormStatus.Draft) {
  return /** @type {PartialFormMetadataDocument} */ {
    [`${state}.updatedAt`]: date,
    [`${state}.updatedBy`]: author,
    updatedAt: date,
    updatedBy: author
  }
}

export const SUMMARY_PAGE_ID = '449a45f6-4541-4a46-91bd-8b8931b07b50'

export const MongoError = {
  DuplicateKey: 11000
}

/**
 * Maps a form metadata document from MongoDB to form metadata
 * @param {WithId<Partial<FormMetadataDocument>>} document - form metadata document (with ID)
 * @returns {FormMetadata}
 */
export function mapForm(document) {
  if (
    !document.slug ||
    !document.title ||
    !document.organisation ||
    !document.teamName ||
    !document.teamEmail
  ) {
    throw Error(
      'Form is malformed in the database. Expected fields are missing.'
    )
  }

  const lastUpdated = getLastUpdated(document)
  const created = getCreated(document)

  return {
    id: document._id.toString(),
    slug: document.slug,
    title: document.title,
    organisation: document.organisation,
    teamName: document.teamName,
    teamEmail: document.teamEmail,
    contact: document.contact,
    submissionGuidance: document.submissionGuidance,
    privacyNoticeUrl: document.privacyNoticeUrl,
    notificationEmail: document.notificationEmail,
    draft: document.draft,
    live: document.live,
    createdBy: created.createdBy,
    createdAt: created.createdAt,
    updatedBy: lastUpdated.updatedBy,
    updatedAt: lastUpdated.updatedAt
  }
}

/**
 * @param {Partial<FormMetadataDocument>} document - form metadata document
 * @returns {{ updatedAt: Date, updatedBy: FormMetadataAuthor }}
 */
export function getLastUpdated(document) {
  if (document.updatedAt && document.updatedBy) {
    return { updatedAt: document.updatedAt, updatedBy: document.updatedBy }
  } else if (document.draft) {
    // draft is newer than live, handle it first
    return document.draft
  } else if (document.live) {
    return document.live
  } else {
    return { updatedAt: defaultDate, updatedBy: defaultAuthor }
  }
}

/**
 * @param {Partial<FormMetadataDocument>} document - form metadata document
 * @returns {{ createdAt: Date, createdBy: FormMetadataAuthor }}
 */
export function getCreated(document) {
  if (document.createdAt && document.createdBy) {
    return { createdAt: document.createdAt, createdBy: document.createdBy }
  } else if (document.live) {
    // live is older than draft, handle it first
    return document.live
  } else if (document.draft) {
    return document.draft
  } else {
    return { createdAt: defaultDate, createdBy: defaultAuthor }
  }
}

/**
 * Abstraction of a generic service method
 * @template T
 * @param {string} formId
 * @param {(session: ClientSession) => Promise<T>} asyncHandler
 * @param {FormMetadataAuthor} author
 * @param {string} startLog
 * @param {string} endLog
 * @param {string} failLog
 * @returns {Promise<T>}
 */
export async function callSessionTransaction(
  formId,
  asyncHandler,
  author,
  startLog,
  endLog,
  failLog
) {
  logger.info(startLog)

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
    logger.info(endLog)

    return sessionReturn
  } catch (err) {
    logger.error(err, failLog)
    throw err
  } finally {
    await session.endSession()
  }
}
/**
 * @import { FormMetadataDocument, FormMetadata, FormMetadataAuthor } from '@defra/forms-model'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 * @import { WithId, ClientSession } from 'mongodb'
 */
