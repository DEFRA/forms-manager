import { FormStatus } from '@defra/forms-model'

import * as formDefinitionRepository from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadataRepository from '~/src/api/forms/repositories/form-metadata-repository.js'
import * as formVersionsRepository from '~/src/api/forms/repositories/form-versions-repository.js'
import { MAX_VERSIONS } from '~/src/api/forms/repositories/form-versions-repository.js'
import { getErrorMessage } from '~/src/helpers/error-message.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { client } from '~/src/mongo.js'

const logger = createLogger()

/**
 * Creates a new version of a form definition
 * @param {string} formId - The form ID
 * @param {ClientSession} [session] - Existing MongoDB session (if called within a transaction)
 * @returns {Promise<FormVersionDocument>}
 */
export async function createFormVersion(formId, session = undefined) {
  logger.info(`Creating new version for form ID ${formId}`)

  const shouldCreateOwnSession = !session
  const workingSession = session ?? client.startSession()

  try {
    const result = await (shouldCreateOwnSession
      ? workingSession.withTransaction(async () =>
          createVersionInTransaction(formId, workingSession)
        )
      : createVersionInTransaction(formId, workingSession))

    logger.info(`Created version ${result.versionNumber} for form ID ${formId}`)
    return result
  } catch (error) {
    logger.error(
      error,
      `[createFormVersion] Failed to create version for form ID ${formId} - ${getErrorMessage(error)}`
    )
    throw error
  } finally {
    if (shouldCreateOwnSession) {
      await workingSession.endSession()
    }
  }
}

/**
 * Internal function to create version within a transaction
 * @private
 * @param {string} formId
 * @param {ClientSession} session
 */
async function createVersionInTransaction(formId, session) {
  const existingVersions = await formMetadataRepository.getVersionMetadata(
    formId,
    session
  )
  const currentVersionNumber =
    existingVersions.length > 0
      ? Math.max(...existingVersions.map((v) => v.versionNumber))
      : 0
  const nextVersionNumber = currentVersionNumber + 1

  const formDefinition = await formDefinitionRepository.get(
    formId,
    FormStatus.Draft,
    session
  )

  const createdAt = new Date()

  const versionMetadata = /** @type {FormVersionMetadata} */ ({
    versionNumber: nextVersionNumber,
    createdAt
  })

  await formMetadataRepository.addVersionMetadata(
    formId,
    versionMetadata,
    session
  )

  const versionDocument = /** @type {FormVersionDocument} */ ({
    formId,
    versionNumber: nextVersionNumber,
    formDefinition,
    createdAt
  })

  return formVersionsRepository.createVersion(versionDocument, session)
}

/**
 * Retrieves a specific version of a form definition
 * @param {string} formId - The form ID
 * @param {number} versionNumber - The version number
 * @returns {Promise<FormVersionDocument>}
 */
export async function getFormVersion(formId, versionNumber) {
  logger.info(`Getting version ${versionNumber} for form ID ${formId}`)

  try {
    return await formVersionsRepository.getVersion(formId, versionNumber)
  } catch (error) {
    logger.error(
      error,
      `[getFormVersion] Failed to get version ${versionNumber} for form ID ${formId} - ${getErrorMessage(error)}`
    )
    throw error
  }
}

/**
 * Retrieves all versions for a form
 * @param {string} formId - The form ID
 * @returns {Promise<FormVersionDocument[]>}
 */
export async function getFormVersions(formId) {
  logger.info(`Getting all versions for form ID ${formId}`)

  try {
    const { versions } = await formVersionsRepository.getVersions(
      formId,
      undefined,
      MAX_VERSIONS,
      0
    )
    return versions
  } catch (error) {
    logger.error(
      error,
      `[getFormVersions] Failed to get versions for form ID ${formId} - ${getErrorMessage(error)}`
    )
    throw error
  }
}

/**
 * Gets the latest version of a form
 * @param {string} formId - The form ID
 * @returns {Promise<FormVersionDocument | null>}
 */
export async function getLatestFormVersion(formId) {
  logger.info(`Getting latest version for form ID ${formId}`)

  try {
    return await formVersionsRepository.getLatestVersion(formId)
  } catch (error) {
    logger.error(
      error,
      `[getLatestFormVersion] Failed to get latest version for form ID ${formId} - ${getErrorMessage(error)}`
    )
    throw error
  }
}

/**
 * Removes all versions for a form
 * @param {string} formId - The form ID
 * @param {ClientSession} session - MongoDB transaction session
 */
export async function removeFormVersions(formId, session) {
  logger.info(`Removing all versions for form ID ${formId}`)

  try {
    await formVersionsRepository.removeVersionsForForm(formId, session)
    logger.info(`Removed all versions for form ID ${formId}`)
  } catch (error) {
    logger.error(
      error,
      `[removeFormVersions] Failed to remove versions for form ID ${formId} - ${getErrorMessage(error)}`
    )
    throw error
  }
}

/**
 * @import { FormVersionMetadata } from '@defra/forms-model'
 * @import { FormVersionDocument } from '~/src/api/types.js'
 * @import { ClientSession } from 'mongodb'
 */
