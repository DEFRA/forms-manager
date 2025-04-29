import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { logger, partialAuditFields } from '~/src/api/forms/service/shared.js'
import { client } from '~/src/mongo.js'

/**
 * Returns true if there is a duplicate title or name in the list
 * @param {FormDefinition} definition
 * @param {List} newList
 */
export function listIsDuplicate(definition, newList) {
  return definition.lists.some(
    (list) => list.name === newList.name || list.title === newList.title
  )
}

/**
 * Add a list of new lists to the draft form definition
 * @param {string} formId
 * @param {List[]} lists
 * @param {FormMetadataAuthor} author
 */
export async function addListsToDraftFormDefinition(formId, lists, author) {
  logger.info(
    `Adding lists ${lists.map((list) => list.name).join(', ')} on Form Definition (draft) for form ID ${formId}`
  )

  const session = client.startSession()

  try {
    const newForm = await session.withTransaction(async () => {
      // Add the lists to the form definition
      const returnedLists = await formDefinition.addLists(
        formId,
        lists,
        session
      )

      const now = new Date()
      await formMetadata.update(
        formId,
        {
          $set: partialAuditFields(now, author)
        },
        session
      )

      return returnedLists
    })

    logger.info(
      `Added lists ${lists.map((list) => list.name).join(', ')} on Form Definition (draft) for form ID ${formId}`
    )

    return newForm
  } catch (err) {
    logger.error(
      err,
      `Failed to add lists ${lists.map((list) => list.id).join(', ')} on Form Definition (draft) for form ID ${formId}`
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
  logger.info(
    `Updating list ${listId} on Form Definition (draft) for form ID ${formId}`
  )

  const session = client.startSession()

  try {
    const updatedList = await session.withTransaction(async () => {
      // Update the list on the form definition
      const returnedLists = await formDefinition.updateList(
        formId,
        listId,
        list,
        session
      )

      const now = new Date()
      await formMetadata.update(
        formId,
        {
          $set: partialAuditFields(now, author)
        },
        session
      )

      return returnedLists
    })

    logger.info(
      `Updated list ${listId} on Form Definition (draft) for form ID ${formId}`
    )

    return updatedList
  } catch (err) {
    logger.error(
      err,
      `Failed to update list ${listId} on Form Definition (draft) for form ID ${formId}`
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
  logger.info(
    `Removing list ${listId} on Form Definition (draft) for form ID ${formId}`
  )

  const session = client.startSession()

  try {
    await session.withTransaction(async () => {
      // Update the list on the form definition
      await formDefinition.removeList(formId, listId, session)

      const now = new Date()
      await formMetadata.update(
        formId,
        {
          $set: partialAuditFields(now, author)
        },
        session
      )
    })

    logger.info(
      `Removed list ${listId} on Form Definition (draft) for form ID ${formId}`
    )
  } catch (err) {
    logger.error(
      err,
      `Failed to remove list ${listId} on Form Definition (draft) for form ID ${formId}`
    )

    throw err
  } finally {
    await session.endSession()
  }
}

/**
 * @import { FormMetadataAuthor, List, FormDefinition } from '@defra/forms-model'
 */
