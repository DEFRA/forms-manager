import { randomUUID } from 'crypto'

import {
  ControllerType,
  Engine,
  formDefinitionV2PayloadSchema,
  hasComponents
} from '@defra/forms-model'

/**
 * @param {FormDefinition} definition
 * @returns {{
 *  readonly summary: PageSummary | undefined;
 *  shouldRepositionSummary: boolean;
 *  summaryExists: boolean;
 *  indexOf: number;
 * }}
 */
export function summaryHelper(definition) {
  const lastIndex = definition.pages.length - 1
  const summaryIndex = definition.pages.findIndex(
    (page) => page.controller === ControllerType.Summary
  )
  const summaryExists = summaryIndex >= 0
  const shouldRepositionSummary = summaryExists && summaryIndex !== lastIndex

  return {
    summaryExists,
    shouldRepositionSummary,
    get summary() {
      const summaryPage = /** @type {PageSummary | undefined} */ (
        definition.pages[summaryIndex]
      )
      return summaryPage
    },
    indexOf: summaryIndex
  }
}

/**
 * @param {Page[]} pages
 * @param {number} indexOf
 * @returns {Page[]}
 */
function removeSummary(pages, indexOf) {
  return /** @type {Page[]} */ (pages.toSpliced(indexOf, 1))
}

/**
 * Repositions summary to the end of the pages
 * @param {FormDefinition} definition
 */
export function repositionSummary(definition) {
  const summaryHelperOutput = summaryHelper(definition)
  const { shouldRepositionSummary } = summaryHelperOutput

  if (shouldRepositionSummary) {
    const { summary, indexOf } =
      /** @type {{ summary: PageSummary, indexOf: number}} */ (
        summaryHelperOutput
      )

    const pagesWithoutSummary = removeSummary(definition.pages, indexOf)

    return {
      ...definition,
      pages: [...pagesWithoutSummary, summary]
    }
  }

  return definition
}

/**
 * @param {Page} pageWithoutComponentIds
 */
export function populateComponentIds(pageWithoutComponentIds) {
  if (!hasComponents(pageWithoutComponentIds)) {
    return pageWithoutComponentIds
  }

  return {
    ...pageWithoutComponentIds,
    components: pageWithoutComponentIds.components.map((component) => {
      if (Object.hasOwn(component, 'id')) {
        return component
      }
      return {
        ...component,
        id: randomUUID()
      }
    })
  }
}

/**
 * Adds ids to all the pages and components where they are missing
 * @param {FormDefinition} definition
 */
export function populateDefinitionIds(definition) {
  const validatedFormDefinition =
    /** @type {{ error?: ValidationError; value: FormDefinition }} */
    (formDefinitionV2PayloadSchema.validate(definition))
  const { error, value } = validatedFormDefinition

  if (error) {
    throw error
  }

  return value
}

/**
 * Helper function to set the engine to v2 - use only in migrateToV2
 * @param {FormDefinition} definition
 * @returns {FormDefinition}
 */
function setEngineToV2(definition) {
  return {
    ...definition,
    engine: Engine.V2
  }
}

/**
 * Migrates a v1 definition to v2
 * @param {FormDefinition} definition
 */
export function migrateToV2(definition) {
  return setEngineToV2(populateDefinitionIds(repositionSummary(definition)))
}

/**
 * @import { FormDefinition, Page, PageSummary } from '@defra/forms-model'
 * @import { ValidationError } from 'joi'
 */
