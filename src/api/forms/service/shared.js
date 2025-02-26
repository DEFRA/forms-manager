import { createLogger } from '~/src/helpers/logging/logger.js'

export const logger = createLogger()
export const defaultAuthor = {
  displayName: 'Unknown',
  id: '-1'
}
export const defaultDate = new Date('2024-06-25T23:00:00Z') // date we went live
/**
 * @typedef {'draft' | 'live'} State
 */

export const DRAFT = /** @type {State} */ ('draft')
/**
 * Partially update the [state] fields
 * @param {Date} date
 * @param {FormMetadataAuthor} author
 * @param {string} state
 * @returns {PartialFormMetadataDocument}
 */
export function partialAuditFields(date, author, state = DRAFT) {
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
 * @import { FormMetadataAuthor } from '@defra/forms-model'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
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
 * @import { FormMetadataDocument, FormMetadata } from '@defra/forms-model'
 * @import { WithId } from 'mongodb'
 */
