import {
  FormDefinitionRequestType,
  FormStatus,
  formDefinitionSchema
} from '@defra/forms-model'
import Boom from '@hapi/boom'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { logger } from '~/src/api/forms/service/shared.js'
import { createFormVersion } from '~/src/api/forms/service/versioning.js'
import { getErrorMessage } from '~/src/helpers/error-message.js'
import { publishFormUpdatedEvent } from '~/src/messaging/publish.js'
import { client } from '~/src/mongo.js'

/**
 * Fails if the list name or title is duplicate
 * @param {string} formId
 * @param {ClientSession} session
 * @returns {Promise<FormDefinition>}
 */
export async function duplicateListGuard(formId, session) {
  const definition = await formDefinition.get(formId, FormStatus.Draft, session)

  const { error } = formDefinitionSchema
    .extract('lists')
    .validate(definition.lists)

  if (error) {
    throw Boom.conflict('Duplicate list name or title found.')
  }

  return definition
}

/**
 * Add a list of new lists to the draft form definition
 * @param {string} formId
 * @param {List} list
 * @param {FormMetadataAuthor} author
 */
export async function addListToDraftFormDefinition(formId, list, author) {
  logger.info(`Adding list ${list.name} to form ID ${formId}`)

  const session = client.startSession()

  try {
    const newForm = await session.withTransaction(async () => {
      // Add the lists to the form definition
      const returnedList = await formDefinition.addList(formId, list, session)

      await duplicateListGuard(formId, session)

      const metadataDocument = await formMetadata.updateAudit(
        formId,
        author,
        session
      )

      await createFormVersion(formId, session)

      // TODO: List could be > 256KB?
      await publishFormUpdatedEvent(
        metadataDocument,
        list,
        FormDefinitionRequestType.CREATE_LIST
      )

      return returnedList
    })

    logger.info(`Added list ${list.name} to form ID ${formId}`)

    return newForm
  } catch (err) {
    logger.error(
      `[addList] Failed to add list ${list.name} to form ID ${formId} - ${getErrorMessage(err)}`
    )

    throw err
  } finally {
    await session.endSession()
  }
}

/**
 * Update a list on the draft form definition
 * @param {string} formId
 * @param {string} listId
 * @param {List} list
 * @param {FormMetadataAuthor} author
 */
export async function updateListOnDraftFormDefinition(
  formId,
  listId,
  list,
  author
) {
  logger.info(`Updating list ${listId} for form ID ${formId}`)

  const session = client.startSession()

  try {
    const updatedList = await session.withTransaction(async () => {
      // Update the list on the form definition
      const returnedList = await formDefinition.updateList(
        formId,
        listId,
        list,
        session
      )

      await duplicateListGuard(formId, session)

      const metadataDocument = await formMetadata.updateAudit(
        formId,
        author,
        session
      )

      await createFormVersion(formId, session)

      // TODO: List could be > 256KB?
      await publishFormUpdatedEvent(
        metadataDocument,
        list,
        FormDefinitionRequestType.UPDATE_LIST
      )

      return returnedList
    })

    logger.info(`Updated list ${listId} for form ID ${formId}`)

    return updatedList
  } catch (err) {
    logger.error(
      `[updateList] Failed to update list ${listId} for form ID ${formId} - ${getErrorMessage(err)}`
    )

    throw err
  } finally {
    await session.endSession()
  }
}

/**
 * Remove a list from the draft form definition
 * @param {string} formId
 * @param {string} listId
 * @param {FormMetadataAuthor} author
 */
export async function removeListOnDraftFormDefinition(formId, listId, author) {
  logger.info(`Removing list ${listId} for form ID ${formId}`)

  const session = client.startSession()

  try {
    await session.withTransaction(async () => {
      // Update the list on the form definition
      await formDefinition.deleteList(formId, listId, session)

      const metadataDocument = await formMetadata.updateAudit(
        formId,
        author,
        session
      )

      await createFormVersion(formId, session)

      await publishFormUpdatedEvent(
        metadataDocument,
        { listId },
        FormDefinitionRequestType.DELETE_LIST
      )
    })

    logger.info(`Removed list ${listId} for form ID ${formId}`)
  } catch (err) {
    logger.error(
      `[removeList] Failed to remove list ${listId} for form ID ${formId} - ${getErrorMessage(err)}`
    )

    throw err
  } finally {
    await session.endSession()
  }
}

/**
 * @import { FormMetadataAuthor, List, FormDefinition } from '@defra/forms-model'
 * @import { ClientSession } from 'mongodb'
 */
