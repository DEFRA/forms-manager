import { FormStatus, formDefinitionV2Schema, slugify } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { MongoServerError } from 'mongodb'

import { removeFormErrorMessages } from '~/src/api/forms/constants.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  getValidationSchema,
  validate
} from '~/src/api/forms/service/helpers/definition.js'
import {
  MongoError,
  logger,
  mapForm,
  partialAuditFields
} from '~/src/api/forms/service/shared.js'
import * as formTemplates from '~/src/api/forms/templates.js'
import { getErrorMessage } from '~/src/helpers/error-message.js'
import { publishFormCreatedEvent } from '~/src/helpers/publish.js'
import { client } from '~/src/mongo.js'

/**
 * Creates a new empty form
 * @param {FormMetadataInput} metadataInput - the form metadata to save
 * @param {FormMetadataAuthor} author - the author details
 */
export async function createForm(metadataInput, author) {
  const { title } = metadataInput

  // Create a blank form definition with the title set
  const definition = { ...formTemplates.emptyV2(), name: title }

  // Validate the form definition
  validate(definition, formDefinitionV2Schema)

  // Create the slug
  const slug = slugify(title)
  const now = new Date()

  /**
   * Create the metadata document
   * @satisfies {FormMetadataDocument}
   */
  const document = {
    ...metadataInput,
    slug,
    draft: {
      createdAt: now,
      createdBy: author,
      updatedAt: now,
      updatedBy: author
    },
    createdAt: now,
    createdBy: author,
    updatedAt: now,
    updatedBy: author
  }

  const session = client.startSession()

  /** @type {FormMetadata | undefined} */
  let metadata

  try {
    await session.withTransaction(async () => {
      // Create the metadata document
      const { insertedId: _id } = await formMetadata.create(document, session)
      metadata = mapForm({ ...document, _id })

      // Create the draft form definition
      await formDefinition.insert(
        metadata.id,
        definition,
        session,
        formDefinitionV2Schema
      )

      await publishFormCreatedEvent(metadata)
    })
  } finally {
    await session.endSession()
  }

  if (!metadata) {
    throw Boom.badRequest('No metadata created in the transaction')
  }

  return metadata
}

/**
 * Retrieves form metadata by ID
 * @param {string} formId - ID of the form
 */
export async function getForm(formId) {
  const document = await formMetadata.get(formId)

  return mapForm(document)
}

/**
 * Retrieves form metadata by slug
 * @param {string} slug - The slug of the form
 */
export async function getFormBySlug(slug) {
  const document = await formMetadata.getBySlug(slug)

  return mapForm(document)
}

/**
 * Updates the form metadata.
 * Note: If the 'title' is updated, this method also updates the form definition's 'name' to keep them in sync.
 * @param {string} formId - ID of the form
 * @param {Partial<FormMetadataInput>} formUpdate - full form definition
 * @param {FormMetadataAuthor} author - the author details
 * @returns {Promise<string>}
 */
export async function updateFormMetadata(formId, formUpdate, author) {
  logger.info(`Updating form metadata for form ID ${formId}`)

  try {
    // Get the form metadata from the db
    const form = await getForm(formId)

    if (form.live && 'title' in formUpdate) {
      throw Boom.badRequest(
        `Form with ID '${formId}' is live so 'title' cannot be updated`
      )
    }

    const now = new Date()

    const { updatedAt, updatedBy, ...draftAuditFields } = partialAuditFields(
      now,
      author
    )

    /** @type {PartialFormMetadataDocument} */
    let updatedForm = {
      ...formUpdate,
      updatedAt,
      updatedBy
    }

    if (formUpdate.title) {
      updatedForm = {
        ...updatedForm,
        slug: slugify(formUpdate.title),
        ...draftAuditFields
      }
    }

    const session = client.startSession()

    await session.withTransaction(async () => {
      await formMetadata.update(formId, { $set: updatedForm }, session)

      if (formUpdate.title) {
        const definition = await formDefinition.get(
          formId,
          FormStatus.Draft,
          session
        )
        const schema = getValidationSchema(definition)

        // Also update the form definition's name to keep them in sync
        await formDefinition.updateName(
          formId,
          formUpdate.title,
          session,
          schema
        )
      }
    })

    logger.info(`Updated form metadata for form ID ${formId}`)

    return updatedForm.slug ?? form.slug
  } catch (err) {
    if (
      err instanceof MongoServerError &&
      err.code === MongoError.DuplicateKey
    ) {
      logger.info(
        `[duplicateFormTitle] Form title ${formUpdate.title} already exists - validation failed`
      )
      throw Boom.badRequest(`Form title ${formUpdate.title} already exists`)
    }
    logger.error(
      `[updateFormMetadata] Updating form metadata for form ID ${formId} failed - ${getErrorMessage(err)}`
    )
    throw err
  }
}

/**
 * Removes a form (metadata and definition)
 * @param {string} formId
 */
export async function removeForm(formId) {
  logger.info(`Removing form with ID ${formId}`)

  const form = await getForm(formId)

  if (form.live) {
    throw Boom.badRequest(removeFormErrorMessages.formIsAlreadyLive)
  }

  const session = client.startSession()

  try {
    await session.withTransaction(async () => {
      await formMetadata.remove(formId, session)
      await formDefinition.remove(formId, session)
    })
  } finally {
    await session.endSession()
  }

  logger.info(`Removed form with ID ${formId}`)
}

/**
 * @import { FormMetadataAuthor, FormMetadataDocument, FormMetadataInput, FormMetadata } from '@defra/forms-model'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
