import { FormStatus } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

import {
  findComponent,
  removeById
} from '~/src/api/forms/repositories/helpers.js'
import { validate } from '~/src/api/forms/service/helpers/definition.js'
import { populateComponentIds } from '~/src/api/forms/service/migration-helpers.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { DEFINITION_COLLECTION_NAME, db } from '~/src/mongo.js'

const logger = createLogger()

/**
 * Updates a draft form definition
 * @param {string | Filter<{ draft: FormDefinition }>} filter - the query filter
 * @param {UpdateFilter<{ draft: FormDefinition }>} updateFilter - the update filter
 * @param {ClientSession} session - the mongo transaction session
 * @param {string} operation - the operation description
 * @param {Document[]} [arrayFilters] - the array filters
 */
async function updateDraft(
  filter,
  updateFilter,
  session,
  operation,
  arrayFilters
) {
  const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )

  if (typeof filter === 'string') {
    filter = { _id: new ObjectId(filter) }
  }

  const updateResult = await coll.findOneAndUpdate(filter, updateFilter, {
    session,
    returnDocument: 'after',
    arrayFilters
  })

  if (!updateResult) {
    throw Boom.notFound(
      `Unexpected empty result from 'findOneAndUpdate' in '${operation}'`
    )
  }

  // Validate form definition
  validate(updateResult.draft)

  return updateResult
}

/**
 * Adds a form to the Form Store
 * @param {string} id - id
 * @param {FormDefinition} formDefinition - form definition (JSON object)
 * @param {ClientSession} session - mongo transaction session
 */
export async function upsert(id, formDefinition, session) {
  logger.info(`Creating form definition (draft) for form ID ${id}`)

  await updateDraft(
    id,
    {
      $set: { draft: formDefinition }
    },
    session,
    'upsert'
  )

  logger.info(`Created form definition (draft) for form ID ${id}`)
}

/**
 * Copy the draft form to live in the Form Store
 * @param {string} id - id
 * @param {ClientSession} session - mongo transaction session
 */
export async function createLiveFromDraft(id, session) {
  logger.info(`Copying form definition (draft to live) for form ID ${id}`)

  const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )

  await coll.updateOne(
    { _id: new ObjectId(id) },
    [{ $set: { live: '$draft' } }],
    { session }
  )

  logger.info(`Copied form definition (draft to live) for form ID ${id}`)
}

/**
 * Copy the live form to draft in the Form Store
 * @param {string} id - id
 * @param {ClientSession} session - mongo transaction session
 */
export async function createDraftFromLive(id, session) {
  logger.info(`Copying form definition (live to draft) for form ID ${id}`)

  try {
    const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
      db.collection(DEFINITION_COLLECTION_NAME)
    )

    await coll.updateOne(
      { _id: new ObjectId(id) },
      [{ $set: { draft: '$live' } }],
      { session }
    )
  } catch (error) {
    logger.error(
      error,
      `Copying form definition (live to draft) for form ID ${id} failed`
    )

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }

  logger.info(`Copied form definition (live to draft) for form ID ${id}`)
}

/**
 * Retrieves the form definition for a given form ID
 * @param {string} formId - the ID of the form
 * @param {FormStatus} state - the form state
 * @param {ClientSession | undefined} [session]
 * @returns {Promise<FormDefinition>}
 */
export async function get(
  formId,
  state = FormStatus.Draft,
  session = undefined
) {
  logger.info(`Getting form definition (${state}) for form ID ${formId}`)

  const coll =
    /** @satisfies {Collection<{draft?: FormDefinition, live?: FormDefinition}>} */ (
      db.collection(DEFINITION_COLLECTION_NAME)
    )
  const sessionOptions = /** @type {FindOptions} */ session && { session }
  const options = /** @type {FindOptions} */ ({
    projection: { [state]: 1 },
    ...sessionOptions
  })

  try {
    const result = await coll.findOne({ _id: new ObjectId(formId) }, options)

    if (!result?.[state]) {
      throw Boom.notFound(`Form definition with ID '${formId}' not found`)
    }

    const definition = /** @type {FormDefinition} */ result[state]

    logger.info(`Form definition (${state}) for form ID ${formId} found`)

    return definition
  } catch (error) {
    logger.error(
      error,
      `Getting form definition (${state}) for form ID ${formId} failed`
    )

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }
}

/**
 * Removes a form definition
 * @param {string} formId - the ID of the form
 * @param {ClientSession} session
 */
export async function remove(formId, session) {
  logger.info(`Removing form definition with ID ${formId}`)

  await removeById(session, DEFINITION_COLLECTION_NAME, formId)

  logger.info(`Removed form definition with ID ${formId}`)
}

/**
 * Updates the engine version of a draft form definition
 * @param {string} formId - the ID of the form
 * @param {Engine} engineVersion - the engine version e.g. 'V1' or 'V2'
 * @param {FormDefinition} definition - the form definition
 * @param {ClientSession} session
 */
export async function setEngineVersion(
  formId,
  engineVersion,
  definition,
  session
) {
  if (definition.engine === engineVersion) {
    return
  }

  logger.info(
    `Updating engine version to ${engineVersion} for form ID ${formId}`
  )

  await updateDraft(
    formId,
    { $set: { 'draft.engine': engineVersion } },
    session,
    'setEngineVersion'
  )

  logger.info(
    `Updated engine version to ${engineVersion} for form ID ${formId}`
  )
}

/**
 * Updates the name of a draft form definition
 * @param {string} formId - the ID of the form
 * @param {string} name - new name for the form
 * @param {ClientSession} session
 */
export async function updateName(formId, name, session) {
  logger.info(`Updating form name for form ID ${formId}`)

  await updateDraft(
    formId,
    { $set: { 'draft.name': name } },
    session,
    'setEngineVersion'
  )

  logger.info(`Updated form name for form ID ${formId}`)
}

/**
 * Removes pages that match the matchCriteria
 * @param {string} formId - the ID of the form
 * @param {{ controller: ControllerType.Summary }} matchCriteria - new name for the form
 * @param {ClientSession} session
 */
export async function removeMatchingPages(formId, matchCriteria, session) {
  logger.info(`Removing page on ${formId}`)

  await updateDraft(
    formId,
    { $pull: { 'draft.pages': matchCriteria } },
    session,
    'removeMatchingPages'
  )

  logger.info(`Removed page on ${formId}`)
}

/**
 * Add a page at the position number - defaults to the last page
 * @param {string} formId - the ID of the form
 * @param {Page} page - new name for the form
 * @param {ClientSession} session
 * @param {number|undefined} [position]
 */
export async function addPageAtPosition(formId, page, session, position) {
  logger.info(`Adding page on Form ID ${formId}`)

  const positionOptions = /** @satisfies {{ $position?: number }} */ {}

  if (position !== undefined) {
    positionOptions.$position = position
  }

  const newPage = populateComponentIds(page)

  await updateDraft(
    formId,
    {
      $push: {
        'draft.pages': { $each: [newPage], ...positionOptions }
      }
    },
    session,
    'addPageAtPosition'
  )

  logger.info(`Added page on Form ID ${formId}`)
}

/**
 * Updates a page with specific page id on forms
 * @param {string} formId
 * @param {string} pageId
 * @param {Page} page
 * @param {ClientSession} session
 * @returns {Promise<void>}
 */
export async function updatePage(formId, pageId, page, session) {
  logger.info(`Updating page ID ${pageId} on form ID ${formId}`)

  await updateDraft(
    { _id: new ObjectId(formId), 'draft.pages.id': pageId },
    { $set: { 'draft.pages.$': page } },
    session,
    'updatePage'
  )

  logger.info(`Updated page ID ${pageId} on form ID ${formId}`)
}

/**
 * Adds a new component to the end of a page components array
 * @param {string} formId
 * @param {string} pageId
 * @param {ComponentDef[]} components
 * @param {ClientSession} session
 * @param {{ position?: number }} [options]
 * @returns {Promise<void>}
 */
export async function addComponents(
  formId,
  pageId,
  components,
  session,
  { position } = {}
) {
  logger.info(`Adding a new component to form ID ${formId}`)

  const positionOptions = /** @satisfies {{ $position?: number }} */ {}

  if (position !== undefined) {
    positionOptions.$position = position
  }

  await updateDraft(
    { _id: new ObjectId(formId), 'draft.pages.id': pageId },
    {
      $push: {
        'draft.pages.$.components': {
          $each: components,
          ...positionOptions
        }
      }
    },
    session,
    'addComponents'
  )

  logger.info(`Added a new component to form ID ${formId}`)
}

/**
 * Updates a component with component id
 * @param {string} formId
 * @param {string} pageId
 * @param {string} componentId
 * @param {ComponentDef} component
 * @param {ClientSession} session
 */
export async function updateComponent(
  formId,
  pageId,
  componentId,
  component,
  session
) {
  logger.info(
    `Updating component ID ${componentId} on page ID ${pageId} and form ID ${formId}`
  )

  const updateResult = await updateDraft(
    {
      _id: new ObjectId(formId),
      'draft.pages.id': pageId,
      'draft.pages.components.id': componentId
    },
    {
      $set: {
        'draft.pages.$[pageId].components.$[component]': component
      }
    },
    session,
    'updateComponent',
    [{ 'pageId.id': pageId }, { 'component.id': componentId }]
  )

  logger.info(
    `Updated component ID ${componentId} on page ID ${pageId} and form ID ${formId}`
  )

  return findComponent(updateResult.draft, pageId, componentId)
}

/**
 * Updates a component with component id
 * @param {string} formId
 * @param {string} pageId
 * @param {string} componentId
 * @param {ClientSession} session
 */
export async function deleteComponent(formId, pageId, componentId, session) {
  logger.info(
    `Deleting component ID ${componentId} on page ID ${pageId} and form ID ${formId}`
  )

  await updateDraft(
    { _id: new ObjectId(formId), 'draft.pages.id': pageId },
    {
      $pull: {
        'draft.pages.$.components': {
          id: componentId
        }
      }
    },
    session,
    'deleteComponent'
  )

  logger.info(
    `Deleted component ID ${componentId} on page ID ${pageId} and form ID ${formId}`
  )
}

/**
 * Repository method to patch fields on a page - such as title
 * @param {string} formId
 * @param {string} pageId
 * @param {PatchPageFields} pageFields
 * @param {ClientSession} session
 */
export async function updatePageFields(formId, pageId, pageFields, session) {
  const pageFieldKeys = Object.keys(pageFields)

  logger.info(
    `Updating page fields ${pageFieldKeys.toString()} on page ID ${pageId} and form ID ${formId}`
  )

  /**
   * @type {{ 'draft.pages.$.title'?: string; 'draft.pages.$.path'?: string, 'draft.pages.$.controller'?: string, 'draft.pages.$.repeat'?: Repeat }}
   */
  const fieldsToSet = {}

  /**
   * @type {{ 'draft.pages.$.controller'?: '', 'draft.pages.$.repeat'?: '' }}
   */
  const fieldsToUnSet = {}

  const { title, path, controller, repeat } =
    /** @type {{ title: string | undefined, path: string | undefined, controller: ControllerType | undefined | null, repeat: Repeat | undefined | null }} */ (
      pageFields
    )

  if (title || title === '') {
    fieldsToSet['draft.pages.$.title'] = title
  }
  if (path) {
    fieldsToSet['draft.pages.$.path'] = path
  }
  if (controller) {
    fieldsToSet['draft.pages.$.controller'] = controller
  }
  if (controller === null) {
    fieldsToUnSet['draft.pages.$.controller'] = ''
  }

  // Repeater
  if (repeat) {
    fieldsToSet['draft.pages.$.repeat'] = repeat
  }
  if (repeat === null) {
    fieldsToUnSet['draft.pages.$.repeat'] = ''
  }

  await updateDraft(
    {
      _id: new ObjectId(formId),
      'draft.pages.id': pageId
    },
    {
      $set: fieldsToSet,
      $unset: fieldsToUnSet
    },
    session,
    'updatePageFields'
  )

  logger.info(
    `Updated page fields ${pageFieldKeys.toString()} on page ID ${pageId} and form ID ${formId}`
  )
}

/**
 * Updates a component with component id
 * @param {string} formId
 * @param {string} pageId
 * @param {ClientSession} session
 */
export async function removePage(formId, pageId, session) {
  logger.info(`Deleting page ID ${pageId} on form ID ${formId}`)

  await updateDraft(
    { _id: new ObjectId(formId), 'draft.pages.id': pageId },
    {
      $pull: {
        'draft.pages': { id: pageId }
      }
    },
    session,
    'removePage'
  )

  logger.info(`Deleted page ID ${pageId} on form ID ${formId}`)
}

/**
 * Pushes a list to the end of the draft definition list array
 * @param {string} formId
 * @param {List[]} lists
 * @param {ClientSession} session
 */
export async function addLists(formId, lists, session) {
  logger.info(`Adding new lists to form ID ${formId}`)

  await updateDraft(
    formId,
    {
      $push: {
        'draft.lists': {
          $each: lists
        }
      }
    },
    session,
    'addLists'
  )

  logger.info(`Added new lists to form ID ${formId}`)

  return lists
}

/**
 * Updates a Draft Form list by id
 * @param {string} formId
 * @param {string} listId
 * @param {List} listItem
 * @param {ClientSession} session
 * @returns {Promise<List>}
 */
export async function updateList(formId, listId, listItem, session) {
  logger.info(`Updating list with id ${listId} on form ID ${formId}`)

  await updateDraft(
    {
      _id: new ObjectId(formId),
      'draft.lists.id': listId
    },
    {
      $set: {
        'draft.lists.$': listItem
      }
    },
    session,
    'updateList'
  )

  logger.info(`Updated list with id ${listId} on form ID ${formId}`)

  return listItem
}

/**
 * Updates a component with component id
 * @param {string} formId
 * @param {string} listId
 * @param {ClientSession} session
 */
export async function removeList(formId, listId, session) {
  logger.info(`Deleting list ID ${listId} on form ID ${formId}`)

  await updateDraft(
    { _id: new ObjectId(formId), 'draft.lists.id': listId },
    {
      $pull: {
        'draft.lists': {
          id: listId
        }
      }
    },
    session,
    'removeList'
  )

  logger.info(`Deleted list ID ${listId} on form ID ${formId}`)
}

/**
 * @import { FormDefinition, Page, Repeat, ComponentDef, ControllerType, PatchPageFields, List, Engine } from '@defra/forms-model'
 * @import { ClientSession, Collection, FindOptions, UpdateFilter, Filter, Document } from 'mongodb'
 */
