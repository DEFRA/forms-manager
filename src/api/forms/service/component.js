import Boom from '@hapi/boom'
import { deepEqual } from '@hapi/hoek'
import { v4 as uuidV4 } from 'uuid'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { findComponent } from '~/src/api/forms/repositories/helpers.js'
import { getFormDefinition } from '~/src/api/forms/service/definition.js'
import { getFormDefinitionPage } from '~/src/api/forms/service/page.js'
import {
  DRAFT,
  logger,
  partialAuditFields
} from '~/src/api/forms/service/shared.js'
import { client } from '~/src/mongo.js'

/**
 * Adds id to a component
 * @param {ComponentDef} component
 * @returns {ComponentDef}
 */
const addIdToComponent = (component) =>
  /** @type {ComponentDef} */ ({
    ...component,
    id: uuidV4()
  })

/**
 * Gets a component from a formDefintion page if it exists, throws a Boom.notFound if not
 * @param {string} formId
 * @param {string} pageId
 * @param {string} componentId
 * @param {ClientSession} [session]
 */
export async function getFormDefinitionPageComponent(
  formId,
  pageId,
  componentId,
  session
) {
  logger.info(
    `Getting Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
  )

  const definition = /** @type {FormDefinition} */ await getFormDefinition(
    formId,
    DRAFT,
    session
  )
  const component = findComponent(definition, pageId, componentId)

  if (component === undefined) {
    throw Boom.notFound(
      `Component ID ${componentId} not found on Page ID ${pageId} & Form ID ${formId}`
    )
  }
  logger.info(
    `Got Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
  )

  return component
}

/**
 * Adds a component to the end of page components
 * @param {string} formId
 * @param {string} pageId
 * @param {ComponentDef[]} components
 * @param {FormMetadataAuthor} author
 * @param {boolean} prepend
 */
export async function createComponentOnDraftDefinition(
  formId,
  pageId,
  components,
  author,
  prepend = false
) {
  await getFormDefinitionPage(formId, pageId)

  logger.info(`Adding new component on Page ID ${pageId} on Form ID ${formId}`)

  const session = client.startSession()

  const createdComponents =
    /** @type {ComponentDef[]} */ components.map(addIdToComponent)

  const positionOptions = /** @satisfies {{ position?: number }} */ {}

  if (prepend) {
    positionOptions.position = 0
  }

  try {
    await session.withTransaction(async () => {
      await formDefinition.addComponents(
        formId,
        pageId,
        createdComponents,
        session,
        { state: DRAFT, ...positionOptions }
      )

      // Update the form with the new draft state
      await formMetadata.update(
        formId,
        { $set: partialAuditFields(new Date(), author) },
        session
      )
    })
  } catch (err) {
    logger.error(
      err,
      `Failed to add component on Page ID ${pageId} Form ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(`Added new component on Page ID ${pageId} on Form ID ${formId}`)

  return createdComponents
}

/**
 * Updates a component and throws a Boom.notFound if page or component is not found
 * @param {string} formId
 * @param {string} pageId
 * @param {string} componentId
 * @param {ComponentDef} componentPayload
 * @param {FormMetadataAuthor} author
 */
export async function updateComponentOnDraftDefinition(
  formId,
  pageId,
  componentId,
  componentPayload,
  author
) {
  logger.info(
    `Updating Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
  )

  let updatedFormDefinitionPageComponent = await getFormDefinitionPageComponent(
    formId,
    pageId,
    componentId
  )

  const session = client.startSession()

  try {
    await session.withTransaction(
      async () => {
        await formDefinition.updateComponent(
          formId,
          pageId,
          componentId,
          componentPayload,
          session,
          DRAFT
        )

        updatedFormDefinitionPageComponent =
          await getFormDefinitionPageComponent(
            formId,
            pageId,
            componentId,
            session
          )

        // Check that component has been updated
        if (!deepEqual(updatedFormDefinitionPageComponent, componentPayload)) {
          throw Boom.internal(
            `Component ${componentId} not updated on Page ID ${pageId} and Form ID ${formId}`
          )
        }

        // Update the form with the new draft state
        await formMetadata.update(
          formId,
          { $set: partialAuditFields(new Date(), author) },
          session
        )
      },
      { readPreference: 'primary' }
    )
  } catch (err) {
    logger.error(
      err,
      `Failed to update Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(
    `Updated Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
  )

  return updatedFormDefinitionPageComponent
}

/**
 * Updates a component and throws a Boom.notFound if page or component is not found
 * @param {string} formId
 * @param {string} pageId
 * @param {string} componentId
 * @param {FormMetadataAuthor} author
 */
export async function deleteComponentOnDraftDefinition(
  formId,
  pageId,
  componentId,
  author
) {
  logger.info(
    `Deleting Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
  )

  const session = client.startSession()

  try {
    await session.withTransaction(
      async () => {
        await formDefinition.deleteComponent(
          formId,
          pageId,
          componentId,
          session,
          DRAFT
        )

        const pageReturn = await getFormDefinitionPage(formId, pageId, session)

        // Check that component has been deleted
        const components =
          'components' in pageReturn ? pageReturn.components : []
        if (components.find((x) => x.id === componentId)) {
          throw Boom.internal(
            `Component ${componentId} not deleted on Page ID ${pageId} and Form ID ${formId}`
          )
        }

        // Update the form with the new draft state
        await formMetadata.update(
          formId,
          { $set: partialAuditFields(new Date(), author) },
          session
        )
      },
      { readPreference: 'primary' }
    )
  } catch (err) {
    logger.error(
      err,
      `Failed to delete Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(
    `Deleted Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
  )
}

/**
 * @import { FormDefinition, FormMetadataAuthor, FormMetadata, FilterOptions, QueryOptions, Page, PageSummary, FormStatus, ComponentDef, PatchPageFields } from '@defra/forms-model'
 * @import { WithId, UpdateFilter, ClientSession } from 'mongodb'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
