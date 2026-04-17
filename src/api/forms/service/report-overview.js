import {
  ComponentType,
  ControllerType,
  FormMetricType,
  FormStatus,
  getErrorMessage,
  hasComponentsEvenIfNoNext,
  hasPaymentQuestionInForm,
  hasSpecificQuestionTypeInForm
} from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import { getMetadataCursorOfAllForms } from '~/src/api/forms/repositories/form-metadata-repository.js'
import { mapMetadata } from '~/src/api/forms/service/helpers/mapper.js'
import { logger } from '~/src/api/forms/service/shared.js'
import { client } from '~/src/mongo.js'

/**
 * Generates a set of overview metrics for each form
 */
export async function generateReportOverview() {
  logger.info('Generating overview report')

  const session = client.startSession()

  const metrics = {
    draftMetrics: new Map(),
    liveMetrics: new Map()
  }

  try {
    await session.withTransaction(async () => {
      const metadataCursor = getMetadataCursorOfAllForms(session)

      for await (const metadata of metadataCursor) {
        const strictMetadata = mapMetadata(metadata)

        // Gather overview metrics for draft form
        if (strictMetadata.draft) {
          await processDefinition(
            FormStatus.Draft,
            strictMetadata,
            metrics.draftMetrics,
            session
          )
        }

        // Gather overview metrics for live form
        if (strictMetadata.live) {
          await processDefinition(
            FormStatus.Live,
            strictMetadata,
            metrics.liveMetrics,
            session
          )
        }
      }
    })
  } catch (err) {
    logger.error(
      err,
      `[report] Failed to generate overview report - ${getErrorMessage(err)}`
    )

    throw err
  } finally {
    await session.endSession()
  }

  logger.info('Generated overview report')

  return {
    live: Object.fromEntries(metrics.liveMetrics),
    draft: Object.fromEntries(metrics.draftMetrics)
  }
}

/**
 * @param {FormStatus} definitionType
 * @param {FormMetadata} metadata
 * @param {Map<string, any>} metrics
 * @param {ClientSession} session
 */
export async function processDefinition(
  definitionType,
  metadata,
  metrics,
  session
) {
  const definition = await getDefinitionIfExists(
    metadata.id,
    definitionType,
    session
  )
  if (definition) {
    metrics.set(
      metadata.id,
      collectOverviewMetrics(metadata, definition, definitionType)
    )
  }
}

/**
 * @param {string} formId
 * @param {FormStatus} status
 * @param {ClientSession} session
 */
export async function getDefinitionIfExists(formId, status, session) {
  try {
    return await formDefinition.get(formId, status, session)
  } catch (err) {
    const error =
      /** @type {{ isBoom?: boolean, output?: { statusCode?: number }}} */ (err)
    if (error.isBoom && error.output?.statusCode === StatusCodes.NOT_FOUND) {
      return undefined
    }
    throw err
  }
}

/**
 * Collect overview metrics
 * @param {Partial<FormMetadata>} metadata
 * @param {FormDefinition} definition
 * @param {FormStatus} definitionType
 */
export function collectOverviewMetrics(metadata, definition, definitionType) {
  return {
    type: FormMetricType.OverviewMetric,
    formId: metadata.id,
    formStatus: metadata.live ? FormStatus.Live : FormStatus.Draft,
    summaryMetrics: calcSummaryMetrics(metadata, definition, definitionType),
    featureCounts: {},
    submissionsCount: 0,
    updatedAt: new Date()
  }
}

/**
 *
 * @param {Partial<FormMetadata>} metadata
 * @param {FormDefinition} definition
 * @param {FormStatus} definitionType
 */
export function calcSummaryMetrics(metadata, definition, definitionType) {
  return /** @type { Record<string, number | string | string[]> } */ ({
    name: metadata.title,
    slug: metadata.slug,
    organisation: metadata.organisation,
    status: definitionType,
    pages: definition.pages.length,
    questionTypes: getUniqueComponentTypes(definition).size,
    conditions: definition.conditions.length,
    sections: definition.sections.length,
    features: getFeatureList(definition)
  })
}

/**
 * @param {FormDefinition} definition
 */
export function getFeatureList(definition) {
  const features = []
  if (
    definition.pages.some((p) => p.controller === ControllerType.FileUpload)
  ) {
    features.push('File upload')
  }
  if (
    definition.pages.some(
      (p) => p.controller === ControllerType.SummaryWithConfirmationEmail
    )
  ) {
    features.push('Email confirmation')
  }
  if (hasPaymentQuestionInForm(definition)) {
    features.push('GOV.UK Pay')
  }
  if (
    hasSpecificQuestionTypeInForm(definition, ComponentType.DeclarationField)
  ) {
    features.push('Declarations')
  }
  return features
}

/**
 *
 * @param {FormDefinition} definition
 */
export function getUniqueComponentTypes(definition) {
  const componentTypes = new Set()
  for (const page of definition.pages) {
    if (hasComponentsEvenIfNoNext(page)) {
      page.components.forEach((comp) => componentTypes.add(comp.type))
    }
  }
  return componentTypes
}

/**
 * @import { ClientSession } from 'mongodb'
 * @import { FormDefinition, FormMetadata } from '@defra/forms-model'
 */
