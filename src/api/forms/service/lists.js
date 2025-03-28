import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import { callSessionTransaction } from '~/src/api/forms/service/callSessionTransaction.js'

/**
 * Add a list of new lists to the draft form definition
 * @param {string} formId
 * @param {List[]} lists
 * @param {FormMetadataAuthor} author
 */
export async function addListsToDraftFormDefinition(formId, lists, author) {
  const listStr = lists.map((list) => list.name).join(', ')
  return callSessionTransaction(
    formId,
    (session) => formDefinition.addLists(formId, lists, session),
    author,
    {
      start: `Adding lists ${listStr} on Form Definition (draft) for form ID ${formId}`,
      end: `Added lists ${listStr} on Form Definition (draft) for form ID ${formId}`,
      fail: `Failed to add lists ${listStr} on Form Definition (draft) for form ID ${formId}`
    }
  )
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
  return callSessionTransaction(
    formId,
    (session) => formDefinition.updateList(formId, listId, list, session),
    author,
    {
      start: `Updating list ${listId} on Form Definition (draft) for form ID ${formId}`,
      end: `Updated list ${listId} on Form Definition (draft) for form ID ${formId}`,
      fail: `Failed to update list ${listId} on Form Definition (draft) for form ID ${formId}`
    }
  )
}

/**
 * Remove a list from the draft form definition
 * @param {string} formId
 * @param {string} listId
 * @param {FormMetadataAuthor} author
 */
export async function removeListOnDraftFormDefinition(formId, listId, author) {
  await callSessionTransaction(
    formId,
    (session) => formDefinition.removeList(formId, listId, session),
    author,
    {
      start: `Removing list ${listId} on Form Definition (draft) for form ID ${formId}`,
      end: `Removed list ${listId} on Form Definition (draft) for form ID ${formId}`,
      fail: `Failed to remove list ${listId} on Form Definition (draft) for form ID ${formId}`
    }
  )
}

/**
 * @import { FormMetadataAuthor, List } from '@defra/forms-model'
 * @import { ClientSession } from 'mongodb'
 */
