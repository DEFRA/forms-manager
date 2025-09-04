import { FormStatus } from '@defra/forms-model'

import * as formDefinitionRepository from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadataRepository from '~/src/api/forms/repositories/form-metadata-repository.js'
import * as formVersionsRepository from '~/src/api/forms/repositories/form-versions-repository.js'
import { getErrorMessage } from '~/src/helpers/error-message.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { client } from '~/src/mongo.js'

const logger = createLogger()

/**
 * Creates a new version of a form definition
 * @param {string} formId - The form ID
 * @param {FormMetadataAuthor} author - The author who made the change
 * @param {VersionChangeType} changeType - The type of change that triggered this version
 * @param {string} [changeDescription] - Optional description of the change
 * @param {FormStatus} [status] - The status of the form (draft or live), defaults to draft
 * @param {ClientSession} [session] - Existing MongoDB session (if called within a transaction)
 * @returns {Promise<FormVersionDocument>}
 */
export async function createFormVersion(
  formId,
  author,
  changeType,
  changeDescription,
  status = FormStatus.Draft,
  session = undefined
) {
  logger.info(`Creating new version for form ID ${formId} due to ${changeType}`)

  const shouldCreateOwnSession = !session
  const workingSession = session ?? client.startSession()

  try {
    const result = await (shouldCreateOwnSession
      ? workingSession.withTransaction(
          async () =>
            await createVersionInTransaction(
              formId,
              author,
              changeType,
              status,
              workingSession,
              changeDescription
            )
        )
      : createVersionInTransaction(
          formId,
          author,
          changeType,
          status,
          workingSession,
          changeDescription
        ))

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
 * @param {FormMetadataAuthor} author
 * @param {VersionChangeType} changeType
 * @param {FormStatus} status
 * @param {ClientSession} session
 * @param {string} [changeDescription]
 */
async function createVersionInTransaction(
  formId,
  author,
  changeType,
  status,
  session,
  changeDescription
) {
  const currentVersionNumber =
    await formVersionsRepository.getLatestVersionNumber(formId, session)
  const nextVersionNumber = currentVersionNumber + 1

  const [formDefinition, formMetadata] = await Promise.all([
    formDefinitionRepository.get(formId, status, session),
    formMetadataRepository.get(formId)
  ])

  const versionDocument = /** @type {FormVersionDocument} */ ({
    formId,
    versionNumber: nextVersionNumber,
    formDefinition,
    metadata: /** @type {FormVersionMetadata} */ ({
      title: formMetadata.title,
      slug: formMetadata.slug,
      organisation: formMetadata.organisation,
      teamName: formMetadata.teamName,
      teamEmail: formMetadata.teamEmail
    }),
    status,
    createdAt: new Date(),
    createdBy: author,
    changeType,
    changeDescription
  })

  return await formVersionsRepository.createVersion(versionDocument, session)
}

/**
 * Retrieves the latest version of a form definition
 * @param {string} formId - The form ID
 * @returns {Promise<FormVersionDocument>}
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
 * Retrieves a paginated list of versions for a form
 * @param {string} formId - The form ID
 * @param {number} limit - Number of versions to return
 * @param {number} offset - Number of versions to skip
 * @returns {Promise<{versions: FormVersionDocument[], totalCount: number}>}
 */
export async function getFormVersions(formId, limit = 10, offset = 0) {
  logger.info(
    `Getting versions for form ID ${formId} (limit: ${limit}, offset: ${offset})`
  )

  try {
    return await formVersionsRepository.getVersions(
      formId,
      undefined,
      limit,
      offset
    )
  } catch (error) {
    logger.error(
      error,
      `[getFormVersions] Failed to get versions for form ID ${formId} - ${getErrorMessage(error)}`
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
 * @import { FormMetadataAuthor } from '@defra/forms-model'
 * @import { FormVersionDocument, VersionChangeType, FormVersionMetadata, VersionedFormDefinitionResponse } from '~/src/api/types.js'
 * @import { ClientSession } from 'mongodb'
 */
