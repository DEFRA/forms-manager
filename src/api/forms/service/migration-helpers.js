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
  hasFormField,
  hasListField,
  hasNext,
  isConditionWrapper
} from '@defra/forms-model'

import {
  convertConditionDataToV2,
  isConditionData
} from '~/src/api/forms/service/condition-migration-helpers.js'
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
 * @param {ComponentDef} component - ** fn may mutate component **
 */
export function mapComponent(definition, component) {
  let updatedComponent = component
  if (hasFormField(component)) {
    if (hasListField(component)) {
      const list = definition.lists.find((x) => x.id === component.list)
      if (list?.id) {
        updatedComponent = {
          ...component,
          list: list.id
        }
      }
    }

    return {
      ...updatedComponent,
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

  let declarationComponent

  if (definition.declaration) {
    declarationComponent = /** @type {MarkdownComponent} */ (
      getComponentDefaults({ type: ComponentType.Markdown })
    )
    declarationComponent.content = definition.declaration
  }

  if (summaryPage && declarationComponent) {
    summaryPage.components = summaryPage.components ?? []
    summaryPage.components.unshift(declarationComponent)
  } else if (!summaryPage && declarationComponent) {
    definition.pages.push({
      title: 'Check your answers',
      controller: ControllerType.Summary,
      path: '/summary',
      components: [declarationComponent]
    })
  } else if (summaryPage && !declarationComponent) {
    summaryPage.components = summaryPage.components ?? []
  } else {
    definition.pages.push({
      title: 'Check your answers',
      controller: ControllerType.Summary,
      path: '/summary',
      components: []
    })
  }

  delete definition.declaration

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
 * Populates component ids for all pages in the form definition.
 * If a component does not have an id, it generates a new one.
 * @param {FormDefinition} definition
 * @returns {FormDefinition}
 */
export function addComponentIdsToDefinition(definition) {
  const pagesWithIds = definition.pages.map((page) =>
    populateComponentIds(page)
  )

  return {
    ...definition,
    pages: pagesWithIds
  }
}

/**
 * Converts a form from using list names to using list ids.
 * For each component on each page, if the component has a "list" property referencing a list by name,
 * it replaces it with the corresponding list's id.
 * @param {FormDefinition} definition
 * @returns {FormDefinition}
 */
export function convertListNamesToIds(definition) {
  // Ensure all lists have an id
  const lists = definition.lists.map((list) => {
    if (list.id) {
      return list
    }

    return {
      ...list,
      id: randomUUID()
    }
  })

  // Build a map from list name to id
  const nameToId = new Map(lists.map((list) => [list.name, list.id]))

  // Update components on each page to use list id instead of name
  const pages = definition.pages.map((page) => {
    if (!('components' in page) || !Array.isArray(page.components)) {
      return page
    }

    const components = page.components.map((component) => {
      if ('list' in component && component.list) {
        const newListReference = nameToId.get(component.list)

        if (!newListReference) {
          throw new Error(
            `List name "${component.list}" not found in definition lists - cannot migrate`
          )
        }

        return {
          ...component,
          list: newListReference
        }
      }
      return component
    })
    return {
      ...page,
      components
    }
  })

  return {
    ...definition,
    pages,
    lists
  }
}

/**
 *
 * @param {FormDefinition} definition
 * @returns {Map<string, string>}
 */
function getComponentNameToIdMap(definition) {
  // Build a map from field name to component id for all components in all pages
  const fieldNameToComponentId = new Map()
  for (const page of definition.pages) {
    if ('components' in page && Array.isArray(page.components)) {
      for (const component of page.components) {
        if (
          typeof component.name === 'string' &&
          typeof component.id === 'string'
        ) {
          fieldNameToComponentId.set(component.name, component.id)
        }
      }
    }
  }
  return fieldNameToComponentId
}

/**
 * Converts conditions in the condition from schema v1 to v2.
 * @param {FormDefinition} definition
 */
export function convertConditions(definition) {
  const fieldNameToComponentId = getComponentNameToIdMap(definition)

  const conditionsInUse = new Set(
    definition.pages.flatMap((page) => {
      if (hasNext(page)) {
        return page.next
          .map((next) => next.condition)
          .filter((condition) => condition !== undefined)
      }
      return []
    })
  )

  /**
   * @type {FormDefinition['conditions']}
   */
  const newConditions = definition.conditions.map((oldCond) => {
    if (isConditionWrapper(oldCond)) {
      const coordinators = new Set()

      const items = oldCond.value.conditions
        .map((oldItem) => {
          if (!isConditionData(oldItem)) {
            throw new Error(`Unsupported condition type found`)
          }

          if (oldItem.coordinator) {
            coordinators.add(oldItem.coordinator)
          }

          return convertConditionDataToV2(
            oldItem,
            fieldNameToComponentId,
            conditionsInUse
          )
        })
        .filter((condition) => condition !== null)

      /**
       * @type {import('@defra/forms-model').ConditionWrapperV2}
       */
      const condition = {
        id: randomUUID(),
        displayName: oldCond.displayName,
        items
      }

      if (items.length > 1 && coordinators.size > 1) {
        throw new Error(
          'Different unique coordinators found in condition items. Manual intervention is required.'
        )
      } else if (coordinators.size === 1) {
        condition.coordinator = coordinators.values().next().value
      }

      return condition
    }
    // Already in new format, return as is
    return oldCond
  })

  return {
    ...definition,
    conditions: newConditions
  }
}

const migrationSteps = [
  repositionSummary,
  applyPageTitles,
  migrateComponentFields,
  convertDeclaration,
  convertListNamesToIds,
  addComponentIdsToDefinition,
  convertConditions
]

/**
 * Apply transformations to FormDefinition
 * @param {FormDefinition} definition
 * @returns {FormDefinition} definition
 */
function applyMigrationSteps(definition) {
  return migrationSteps.reduce((acc, transformation) => {
    return transformation(acc)
  }, definition)
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
 * @import { ComponentDef, FormDefinition, MarkdownComponent, Page, PageSummary, ConditionGroupData, ConditionData, ConditionRefData } from '@defra/forms-model'
 */
