import Boom from '@hapi/boom'

import { makeFormLiveErrorMessages } from '~/src/api/forms/constants.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { getForm } from '~/src/api/forms/service/index.js'
import {
  DRAFT,
  logger,
  mapForm,
  partialAuditFields
} from '~/src/api/forms/service/shared.js'
import { client } from '~/src/mongo.js'

/**
 * Retrieves a paginated list of forms with filter options
 * @param {QueryOptions} options - Pagination, sorting, and filtering options
 * @returns {Promise<{ forms: FormMetadata[], totalItems: number, filters: FilterOptions }>}
 */
export async function listForms(options) {
  const { documents, totalItems, filters } = await formMetadata.list(options)
  const forms = documents.map(mapForm)

  return { forms, totalItems, filters }
}

/**
 * Retrieves the form definition content for a given form ID
 * @param {string} formId - the ID of the form
 * @param {State} state - the form state
 * @param {ClientSession | undefined} [session]
 */
export function getFormDefinition(formId, state = DRAFT, session = undefined) {
  // TODO: if form def is v1 and target v2 - use decorator
  return formDefinition.get(formId, state, session)
}

/**
 * @param {string} formId - ID of the form
 * @param {FormDefinition} definition - full form definition
 * @param {FormMetadataAuthor} author - the author details
 */
export async function updateDraftFormDefinition(formId, definition, author) {
  logger.info(`Updating form definition (draft) for form ID ${formId}`)

  try {
    // Get the form metadata from the db
    const form = await getForm(formId)

    if (!form.draft) {
      throw Boom.badRequest(`Form with ID '${formId}' has no draft state`)
    }

    // some definition attributes shouldn't be customised by users, so patch
    // them on every write to prevent imported forms drifting (e.g. JSON upload)
    definition.name = form.title

    const session = client.startSession()

    try {
      await session.withTransaction(async () => {
        // Update the form definition
        await formDefinition.upsert(formId, definition, session)

        logger.info(`Updating form metadata (draft) for form ID ${formId}`)

        // Update the `updatedAt/By` fields of the draft state
        const now = new Date()
        await formMetadata.update(
          formId,
          {
            $set: partialAuditFields(now, author)
          },
          session
        )
      })
    } finally {
      await session.endSession()
    }

    logger.info(`Updated form metadata (draft) for form ID ${formId}`)
  } catch (err) {
    logger.error(
      err,
      `Updating form definition (draft) for form ID ${formId} failed`
    )

    throw err
  }
}

/**
 * Creates the live form from the current draft state
 * @param {string} formId - ID of the form
 * @param {FormMetadataAuthor} author - the author of the new live state
 */
export async function createLiveFromDraft(formId, author) {
  logger.info(`Make draft live for form ID ${formId}`)

  try {
    // Get the form metadata from the db
    const form = await getForm(formId)

    if (!form.draft) {
      logger.error(
        `Form with ID '${formId}' has no draft state so failed deployment to live`
      )

      throw Boom.badRequest(makeFormLiveErrorMessages.missingDraft)
    }

    if (!form.contact) {
      throw Boom.badRequest(makeFormLiveErrorMessages.missingContact)
    }

    if (!form.submissionGuidance) {
      throw Boom.badRequest(makeFormLiveErrorMessages.missingSubmissionGuidance)
    }

    if (!form.privacyNoticeUrl) {
      throw Boom.badRequest(makeFormLiveErrorMessages.missingPrivacyNotice)
    }

    const draftFormDefinition = await formDefinition.get(formId, DRAFT)

    if (!draftFormDefinition.startPage) {
      throw Boom.badRequest(makeFormLiveErrorMessages.missingStartPage)
    }

    if (!draftFormDefinition.outputEmail && !form.notificationEmail) {
      // TODO: remove the form def check once all forms have a notification email
      throw Boom.badRequest(makeFormLiveErrorMessages.missingOutputEmail)
    }

    // Build the live state
    const now = new Date()
    const set = !form.live
      ? {
          // Initialise the live state
          live: {
            updatedAt: now,
            updatedBy: author,
            createdAt: now,
            createdBy: author
          },
          updatedAt: now,
          updatedBy: author
        }
      : partialAuditFields(now, author, 'live') // Partially update the live state fields

    const session = client.startSession()

    try {
      await session.withTransaction(async () => {
        // Copy the draft form definition
        await formDefinition.createLiveFromDraft(formId, session)

        logger.info(`Removing form metadata (draft) for form ID ${formId}`)

        // Update the form with the live state and clear the draft
        await formMetadata.update(
          formId,
          {
            $set: set,
            $unset: { draft: '' }
          },
          session
        )
      })
    } finally {
      await session.endSession()
    }

    logger.info(`Removed form metadata (draft) for form ID ${formId}`)
    logger.info(`Made draft live for form ID ${formId}`)
  } catch (err) {
    logger.error(err, `Make draft live for form ID ${formId} failed`)

    throw err
  }
}

/**
 * Recreates the draft form from the current live state
 * @param {string} formId - ID of the form
 * @param {FormMetadataAuthor} author - the author of the new draft
 */
export async function createDraftFromLive(formId, author) {
  logger.info(`Create draft to edit for form ID ${formId}`)

  try {
    // Get the form metadata from the db
    const form = await getForm(formId)

    if (!form.live) {
      throw Boom.badRequest(`Form with ID '${formId}' has no live state`)
    }

    // Build the draft state
    const now = new Date()
    const set = {
      draft: {
        updatedAt: now,
        updatedBy: author,
        createdAt: now,
        createdBy: author
      },
      updatedAt: now,
      updatedBy: author
    }

    const session = client.startSession()

    try {
      await session.withTransaction(async () => {
        // Copy the draft form definition
        await formDefinition.createDraftFromLive(formId, session)

        logger.info(`Adding form metadata (draft) for form ID ${formId}`)

        // Update the form with the new draft state
        await formMetadata.update(formId, { $set: set }, session)
      })
    } finally {
      await session.endSession()
    }

    logger.info(`Added form metadata (draft) for form ID ${formId}`)
    logger.info(`Created draft to edit for form ID ${formId}`)
  } catch (err) {
    logger.error(err, `Create draft to edit for form ID ${formId} failed`)

    throw err
  }
}

/**
 * @import { FormDefinition, FormMetadataAuthor, FormMetadata, FilterOptions, QueryOptions } from '@defra/forms-model'
 * @import { ClientSession } from 'mongodb'
 * @import { State } from '~/src/api/forms/service/shared.js'
 */
