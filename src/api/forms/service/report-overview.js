import {
  ComponentType,
  ControllerType,
  FormMetricType,
  FormStatus,
  getErrorMessage,
  hasComponentsEvenIfNoNext,
  hasPaymentQuestionInForm,
  hasPostcodeLookupInForm,
  hasSpecificQuestionTypeInForm,
  isSummaryPage
} from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import { getMetadataCursorOfAllForms } from '~/src/api/forms/repositories/form-metadata-repository.js'
import { mapMetadata } from '~/src/api/forms/service/helpers/mapper.js'
import { logger } from '~/src/helpers/logging/logger.js'
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
    featureMetrics: calcFeatureMetrics(definition),
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
    conditions: getUniqueAssignedConditions(definition).size,
    sections: getUniqueAssignedSections(definition).size,
    features: getFeatureList(definition)
  })
}

/**
 * @param {FormDefinition} definition
 */
export function calcFeatureMetrics(definition) {
  const allComponents = /** @type {ComponentDef[]} */ ([])
  for (const page of definition.pages) {
    if (hasComponentsEvenIfNoNext(page)) {
      allComponents.push(...page.components)
    }
    // Special case - if declaration in CYA page, remove the Markdown component,
    // and add 'Declaration in CYA' component to totals
    if (isSummaryPage(page)) {
      if (hasDeclarationInCYA(definition)) {
        const markdownPos = allComponents.findIndex(
          (comp) => comp.type === ComponentType.Markdown
        )
        if (markdownPos > -1) {
          allComponents.splice(markdownPos, 1)
          // @ts-expect-error - 'DeclarationInCYA' is not strictly in the enum of ComponentType
          // but we want a separate value for metrics display purposes
          allComponents.push({ type: 'DeclarationInCYA' })
        }
      }
    }
  }

  const questionTypes = getQuestionTypeCounts(allComponents)
  return {
    questionTypes: Object.fromEntries(questionTypes),
    features: getComponentUsageFeatureMetrics(definition),
    formStructure: getFormStructureCounts(definition, questionTypes)
  }
}

/**
 * @param {ComponentDef[]} components
 */
export function getQuestionTypeCounts(components) {
  const componentCounts = /** @type {Map<string, number>} */ (new Map())
  for (const component of components) {
    const count = componentCounts.get(component.type) ?? 0
    componentCounts.set(component.type, count + 1)
  }
  return componentCounts
}

/**
 * @param {FormDefinition} definition
 */
export function getComponentUsageFeatureMetrics(definition) {
  const features = getFeatureList(definition)
  if (getUniqueAssignedSections(definition).size) {
    features.push('Sections')
  }
  if (getUniqueAssignedConditions(definition).size) {
    features.push('Conditional logic')
  }
  const featureResult = /** @type {Record<string, number>} */ ({})
  features.forEach((f) => {
    featureResult[f] = 1
  })
  return featureResult
}

/**
 * @param {FormDefinition} definition
 * @param {Map<string, number>} questionTypes
 */
export function getFormStructureCounts(definition, questionTypes) {
  let numOfQuestions = 0
  questionTypes.forEach((value) => {
    numOfQuestions += value
  })

  return {
    pages: definition.pages.length,
    questions: numOfQuestions,
    sections: getUniqueAssignedSections(definition).size,
    conditions: getUniqueAssignedConditions(definition).size,
    questionTypes: questionTypes.size
  }
}

/**
 * @param {FormDefinition} definition
 */
export function hasDeclarationInCYA(definition) {
  const summaryPage = definition.pages.find((pg) => isSummaryPage(pg))
  const markdown = hasComponentsEvenIfNoNext(summaryPage)
    ? summaryPage.components.find(
        (comp, idx) => comp.type === ComponentType.Markdown && idx === 0
      )
    : undefined
  return markdown !== undefined
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
    features.push('Declaration field')
  }
  if (hasDeclarationInCYA(definition)) {
    features.push('Declaration in CYA')
  }
  if (hasPostcodeLookupInForm(definition)) {
    features.push('Postcode lookup')
  }
  if (definition.options?.showReferenceNumber) {
    features.push('Reference number')
  }
  return features
}

/**
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
 * @param {FormDefinition} definition
 */
export function getUniqueAssignedConditions(definition) {
  const conditions = new Set()
  definition.pages
    .filter((p) => p.condition)
    .forEach((p2) => conditions.add(p2.condition))
  return conditions
}

/**
 * @param {FormDefinition} definition
 */
export function getUniqueAssignedSections(definition) {
  const sections = new Set()
  definition.pages
    .filter((p) => p.section)
    .forEach((p2) => sections.add(p2.section))
  return sections
}

/**
 * @import { ClientSession } from 'mongodb'
 * @import { ComponentDef, FormDefinition, FormMetadata } from '@defra/forms-model'
 */
