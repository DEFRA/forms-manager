import Boom from '@hapi/boom'

import { getErrorMessage } from '~/src/helpers/error-message.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { VERSIONS_COLLECTION_NAME, db } from '~/src/mongo.js'

const logger = createLogger()

/**
 * Creates a new form version in the database
 * @param {FormVersionDocument} versionDocument - The form version document to create
 * @param {ClientSession} session - MongoDB transaction session
 * @returns {Promise<FormVersionDocument>}
 */
export async function createVersion(versionDocument, session) {
  logger.info(
    `Creating new version ${versionDocument.versionNumber} for form ID ${versionDocument.formId}`
  )

  const coll = /** @satisfies {Collection<FormVersionDocument>} */ (
    db.collection(VERSIONS_COLLECTION_NAME)
  )

  try {
    const result = await coll.insertOne(versionDocument, { session })

    logger.info(
      `Created version ${versionDocument.versionNumber} for form ID ${versionDocument.formId}`
    )

    return { ...versionDocument, _id: result.insertedId }
  } catch (error) {
    logger.error(
      error,
      `[createVersion] Failed to create version ${versionDocument.versionNumber} for form ID ${versionDocument.formId} - ${getErrorMessage(error)}`
    )

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }
}

/**
 * Gets the latest version number for a form
 * @param {string} formId - The form ID
 * @param {ClientSession} [session] - MongoDB transaction session
 * @returns {Promise<number>}
 */
export async function getLatestVersionNumber(formId, session) {
  logger.info(`Getting latest version number for form ID ${formId}`)

  const coll = /** @satisfies {Collection<FormVersionDocument>} */ (
    db.collection(VERSIONS_COLLECTION_NAME)
  )

  try {
    const sessionOptions = /** @type {FindOptions} */ session && { session }
    const result = await coll.findOne(
      { formId },
      {
        sort: { versionNumber: -1 },
        projection: { versionNumber: 1 },
        ...sessionOptions
      }
    )

    const versionNumber = result?.versionNumber ?? 0
    logger.info(
      `Latest version number for form ID ${formId} is ${versionNumber}`
    )

    return versionNumber
  } catch (error) {
    logger.error(
      error,
      `[getLatestVersionNumber] Failed to get latest version number for form ID ${formId} - ${getErrorMessage(error)}`
    )

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }
}

/**
 * Gets a specific version of a form
 * @param {string} formId - The form ID
 * @param {number} versionNumber - The version number to retrieve
 * @param {ClientSession} [session] - MongoDB transaction session
 * @returns {Promise<FormVersionDocument>}
 */
export async function getVersion(formId, versionNumber, session) {
  logger.info(`Getting version ${versionNumber} for form ID ${formId}`)

  const coll = /** @satisfies {Collection<FormVersionDocument>} */ (
    db.collection(VERSIONS_COLLECTION_NAME)
  )

  try {
    const sessionOptions = /** @type {FindOptions} */ session && { session }
    const result = await coll.findOne({ formId, versionNumber }, sessionOptions)

    if (!result) {
      throw Boom.notFound(
        `Version ${versionNumber} for form ID '${formId}' not found`
      )
    }

    logger.info(`Retrieved version ${versionNumber} for form ID ${formId}`)

    return result
  } catch (error) {
    logger.error(
      error,
      `[getVersion] Failed to get version ${versionNumber} for form ID ${formId} - ${getErrorMessage(error)}`
    )

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }
}

/**
 * Gets the latest version of a form
 * @param {string} formId - The form ID
 * @param {ClientSession} [session] - MongoDB transaction session
 * @returns {Promise<FormVersionDocument>}
 */
export async function getLatestVersion(formId, session) {
  logger.info(`Getting latest version for form ID ${formId}`)

  const coll = /** @satisfies {Collection<FormVersionDocument>} */ (
    db.collection(VERSIONS_COLLECTION_NAME)
  )

  try {
    const sessionOptions = /** @type {FindOptions} */ session && { session }
    const result = await coll.findOne(
      { formId },
      {
        sort: { versionNumber: -1 },
        ...sessionOptions
      }
    )

    if (!result) {
      throw Boom.notFound(`No versions found for form ID '${formId}'`)
    }

    logger.info(
      `Retrieved latest version ${result.versionNumber} for form ID ${formId}`
    )

    return result
  } catch (error) {
    logger.error(
      error,
      `[getLatestVersion] Failed to get latest version for form ID ${formId} - ${getErrorMessage(error)}`
    )

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }
}

/**
 * Gets a paginated list of versions for a form
 * @param {string} formId - The form ID
 * @param {ClientSession} [session] - MongoDB transaction session
 * @param {number} limit - Number of versions to return
 * @param {number} offset - Number of versions to skip
 * @returns {Promise<{versions: FormVersionDocument[], totalCount: number}>}
 */
export async function getVersions(formId, session, limit = 10, offset = 0) {
  logger.info(
    `Getting versions for form ID ${formId} (limit: ${limit}, offset: ${offset})`
  )

  const coll = /** @satisfies {Collection<FormVersionDocument>} */ (
    db.collection(VERSIONS_COLLECTION_NAME)
  )

  try {
    const sessionOptions = /** @type {AggregateOptions} */ session && {
      session
    }
    const query = { formId }

    const [versions, totalCount] = await Promise.all([
      coll
        .find(query, sessionOptions)
        .sort({ versionNumber: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      coll.countDocuments(query, sessionOptions)
    ])

    logger.info(`Retrieved ${versions.length} versions for form ID ${formId}`)

    return { versions, totalCount }
  } catch (error) {
    logger.error(
      error,
      `[getVersions] Failed to get versions for form ID ${formId} - ${getErrorMessage(error)}`
    )

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }
}

/**
 * Removes all versions for a form (used when deleting a form)
 * @param {string} formId - The form ID
 * @param {ClientSession} session - MongoDB transaction session
 */
export async function removeVersionsForForm(formId, session) {
  logger.info(`Removing all versions for form ID ${formId}`)

  const coll = /** @satisfies {Collection<FormVersionDocument>} */ (
    db.collection(VERSIONS_COLLECTION_NAME)
  )

  try {
    const result = await coll.deleteMany({ formId }, { session })

    logger.info(`Removed ${result.deletedCount} versions for form ID ${formId}`)
  } catch (error) {
    logger.error(
      error,
      `[removeVersionsForForm] Failed to remove versions for form ID ${formId} - ${getErrorMessage(error)}`
    )

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }
}

/**
 * @import { FormVersionDocument } from '~/src/api/types.js'
 * @import { ClientSession, Collection } from 'mongodb'
 */
