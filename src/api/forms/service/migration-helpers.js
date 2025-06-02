import { randomUUID } from 'crypto'

import {
  ComponentType,
  ControllerType,
  Engine,
  SchemaVersion,
  formDefinitionV2Schema,
  getComponentDefaults,
  hasComponents,
  hasComponentsEvenIfNoNext,
  hasFormField
} from '@defra/forms-model'

import { validate } from '~/src/api/forms/service/helpers/definition.js'

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
 * Applies page titles if they are missing
 * @param {FormDefinition} definition
 */
export function applyPageTitles(definition) {
  const changedPages = definition.pages.map((page) => {
    if (page.controller !== ControllerType.Summary && !page.title) {
      return {
        ...page,
        title: hasComponents(page) ? page.components[0].title : ''
      }
    }

    return page
  })

  return {
    ...definition,
    pages: changedPages
  }
}

/**
 * @param {FormDefinition} definition
 * @param {ComponentDef} component
 */
export function mapComponent(definition, component) {
  let listDef = {}

  if (hasFormField(component)) {
    if ('list' in component) {
      const list = definition.lists.find((x) => x.name === component.list)
      if (list) {
        listDef = { list: list.id }
      }
    }

    return {
      ...component,
      ...listDef,
      shortDescription: component.title
    }
  }

  return component
}

/**
 * Migrates component fields
 * @param {FormDefinition} definition
 */
export function migrateComponentFields(definition) {
  const changedPages = definition.pages.map((page) => {
    if (!hasComponentsEvenIfNoNext(page)) {
      return page
    }

    const changeComponents = page.components.map((comp) => {
      return mapComponent(definition, comp)
    })

    return {
      ...page,
      components: changeComponents
    }
  })

  return {
    ...definition,
    pages: changedPages
  }
}

/**
 * Converts declaration text to a guidance component
 * @param {FormDefinition} originalDefinition
 */
export function convertDeclaration(originalDefinition) {
  const definition = structuredClone(originalDefinition)

  const summaryPage = definition.pages.find(
    (p) => p.controller === ControllerType.Summary
  )

  if (!summaryPage && definition.declaration) {
    throw new Error('Cannot migrate declaration as unable to find Summary Page')
  }

  if (summaryPage) {
    summaryPage.components = summaryPage.components ?? []

    if (definition.declaration) {
      const declaration = /** @type {MarkdownComponent} */ (
        getComponentDefaults({ type: ComponentType.Markdown })
      )
      declaration.content = definition.declaration
      summaryPage.components.unshift(declaration)
      delete definition.declaration
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

const migrationSteps = [
  repositionSummary,
  applyPageTitles,
  migrateComponentFields,
  convertDeclaration
]

/**
 * Apply transformations to FormDefinition
 * @param {FormDefinition} definition
 * @returns {FormDefinition} definition
 */
function applyMigrationSteps(definition) {
  return migrationSteps.reduce(
    (acc, transformation) => transformation(acc),
    definition
  )
}

/**
 * Migrates a v1 definition to v2
 * @param {FormDefinition} definition
 * @returns {FormDefinition}
 */
export function migrateToV2(definition) {
  const migratedDefinition = applyMigrationSteps(definition)

  migratedDefinition.engine = Engine.V2
  migratedDefinition.schema = SchemaVersion.V2

  const value = validate(migratedDefinition, formDefinitionV2Schema)

  return value
}

/**
 * @import { ComponentDef, FormDefinition, MarkdownComponent, Page, PageSummary } from '@defra/forms-model'
 */
