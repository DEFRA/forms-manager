import { FormStatus, formDefinitionSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { logger, partialAuditFields } from '~/src/api/forms/service/shared.js'
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
 * @param {List[]} lists
 * @param {FormMetadataAuthor} author
 */
export async function addListsToDraftFormDefinition(formId, lists, author) {
  logger.info(
    `Adding lists ${lists.map((list) => list.name).join(', ')} on Form Definition (draft) for form ID ${formId}`
  )

  const session = client.startSession()

  try {
    const newForm = await session.withTransaction(
      async () => {
        // Add the lists to the form definition
        const returnedLists = await formDefinition.addLists(
          formId,
          lists,
          session
        )

        await duplicateListGuard(formId, session)

        const now = new Date()
        await formMetadata.update(
          formId,
          {
            $set: partialAuditFields(now, author)
          },
          session
        )

        return returnedLists
      },
      { readPreference: 'primary' }
    )

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
    const updatedList = await session.withTransaction(
      async () => {
        // Update the list on the form definition
        const returnedLists = await formDefinition.updateList(
          formId,
          listId,
          list,
          session
        )

        await duplicateListGuard(formId, session)

        const now = new Date()
        await formMetadata.update(
          formId,
          {
            $set: partialAuditFields(now, author)
          },
          session
        )

        return returnedLists
      },
      { readPreference: 'primary' }
    )

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
 * @import { ClientSession } from 'mongodb'
 */
