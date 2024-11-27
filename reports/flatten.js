import fs from 'fs/promises'
import * as url from 'url'

import {
  hasComponents,
  hasConditionField,
  hasConditionGroup,
  hasConditionName,
  hasNext,
  isConditionalType,
  isContentType,
  isFormType
} from '@defra/forms-model'
import { stringify } from 'csv-stringify'

function groupBy(arr, key) {
  return arr.reduce(function (acc, curr) {
    ;(acc[curr[key]] = acc[curr[key]] || []).push(curr)
    return acc
  }, {})
}

function groupSummary(grouped) {
  const keys = Object.keys(grouped)
  return Object.fromEntries(
    Object.keys(grouped).map((item) => [item, grouped[item].length])
  )
}

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const files = await fs.readdir(`${__dirname}forms`)

/**
 * @param {string} filename
 * @returns {Promise<SavedForm>}
 */
const readFile = async (filename) => {
  const json = await fs.readFile(`${__dirname}forms/${filename}`, {
    encoding: 'utf8'
  })

  /**
   * @satisfies {SavedForm}
   */
  const parsed = JSON.parse(json)

  return parsed
}

/**
 * @param {SavedForm[]} saved
 */
function summariseModels(saved) {
  const models = saved.map(summariseModel)
  const summary = {}

  const live = {
    hasFieldCount: 0,
    hasGroupCount: 0,
    hasGroupName: 0,
    components: {}
  }

  models.forEach((model) => {
    if (model.live) {
      live.hasFieldCount += model.live.conditionsSummary.hasFieldCount
      live.hasGroupCount += model.live.conditionsSummary.hasGroupCount
      live.hasGroupName += model.live.conditionsSummary.hasGroupName

      model.live.pages
        .filter((page) => page.componentsSummary.types)
        .forEach((page) => {
          if (page.componentsSummary.types) {
            const types = page.componentsSummary.types
            Object.keys(types).forEach((type) => {
              live.components[type] = live.components[type]
                ? live.components[type] + types[type]
                : types[type]
            })
          }
        })
    }
  })

  const draft = {
    hasFieldCount: 0,
    hasGroupCount: 0,
    hasGroupName: 0,
    components: {}
  }

  models.forEach((model) => {
    if (model.draft) {
      draft.hasFieldCount += model.draft.conditionsSummary.hasFieldCount
      draft.hasGroupCount += model.draft.conditionsSummary.hasGroupCount
      draft.hasGroupName += model.draft.conditionsSummary.hasGroupName

      model.draft.pages
        .filter((page) => page.componentsSummary.types)
        .forEach((page) => {
          if (page.componentsSummary.types) {
            const types = page.componentsSummary.types
            Object.keys(types).forEach((type) => {
              draft.components[type] = draft.components[type]
                ? draft.components[type] + types[type]
                : types[type]
            })
          }
        })
    }
  })

  return { models, liveSummary: live, draftSummary: draft }
}

/**
 * @param {SavedForm} model
 */
function summariseModel(model) {
  const { id, slug, draft, live } = model

  return {
    id,
    slug,
    draft: draft && summariseDefinition(draft),
    live: live && summariseDefinition(live)
  }
}

/**
 * @param {FormDefinition} def
 */
function summariseDefinition(def) {
  const pageCount = def.pages.length
  const listCount = def.lists.length
  const conditionCount = def.conditions.length
  const pages = def.pages.map(flattenPage)
  const conditions = def.conditions.map(summariseConditionWrapper)

  const conditionsSummary = {
    hasFieldCount: conditions
      .flatMap((item) => item.conditions)
      .filter((cond) => cond.hasField).length,
    hasGroupCount: conditions
      .flatMap((item) => item.conditions)
      .filter((cond) => cond.hasGroup).length,
    hasGroupName: conditions
      .flatMap((item) => item.conditions)
      .filter((cond) => cond.hasName).length
  }

  return {
    pageCount,
    pages,
    conditionCount,
    conditions,
    conditionsSummary,
    listCount
  }
}

/**
 * @param {Page} page
 */
function flattenPage(page) {
  const componentCount = hasComponents(page)
    ? page.components.length
    : undefined
  const nextCount = hasNext(page) ? page.next.length : undefined
  const components = hasComponents(page)
    ? page.components.map(summariseComponent)
    : undefined

  const componentsSummary = {
    types: components ? groupSummary(groupBy(components, 'type')) : undefined,
    isForm: components
      ? components.filter((item) => item.isForm).length
      : undefined,
    isContent: components
      ? components.filter((item) => item.isContent).length
      : undefined
  }

  return {
    componentCount,
    components,
    componentsSummary,
    nextCount,
    next: hasNext(page) ? page.next.map(summariseNext) : undefined
  }
}

/**
 * @param {ComponentDef} component
 */
function summariseComponent(component) {
  const type = component.type
  const isForm = isFormType(type)
  const isContent = isContentType(type)
  const isConditional = isConditionalType(type)

  return {
    type,
    isForm,
    isContent,
    isConditional
  }
}

/**
 * @param {Link} next
 */
function summariseNext(next) {
  const hasCondition = !!next.condition
  const hasRedirect = !!next.redirect

  return {
    hasCondition,
    hasRedirect
  }
}

/**
 * @param {ConditionWrapper} condition
 */
function summariseConditionWrapper(condition) {
  const { name } = condition
  const conditions = condition.value.conditions.map(summariseCondition)
  const conditionsCount = conditions.length
  const grouped = groupBy(conditions, 'fieldType')
  const fieldTypeGroup = groupSummary(grouped)

  return {
    name,
    conditionsCount,
    conditions,
    fieldTypeGroup
  }
}

/**
 * @param {ConditionGroupData | ConditionData | ConditionRefData} condition
 */
function summariseCondition(condition) {
  const hasField = hasConditionField(condition)
  const hasGroup = hasConditionGroup(condition)
  const hasName = hasConditionName(condition)
  const field = hasField ? condition.field : undefined
  const fieldCoordinator = hasField ? condition.coordinator : undefined

  return {
    hasField,
    hasGroup,
    hasName,
    fieldCoordinator,
    fieldType: field ? field.type : undefined
  }
}

/**
 * @param {Input} input
 * @returns {Promise<string>}
 */
function createCsv(input) {
  return new Promise((resolve, reject) => {
    stringify(
      input,
      /** @type {Callback} */ function (err, output) {
        if (err) {
          reject(err instanceof Error ? err : new Error('CSV stringify error'))
          return
        }

        resolve(output)
      }
    )
  })
}

const saved = await Promise.all(files.map(readFile))

const headers = [
  'formId',
  'formTitle',
  'state',
  'id',
  'path',
  'title',
  'componentCount'
]

/**
 * @type {Row[]}
 */
const values = []

saved.forEach((savedForm) => {
  if (savedForm.draft) {
    savedForm.draft.pages.forEach((page) => {
      values.push([
        savedForm.id,
        savedForm.metadata.title,
        'draft',
        page.path,
        page.path,
        page.title,
        hasComponents(page) ? page.components.length.toString() : null
      ])
    })
  }

  if (savedForm.live) {
    savedForm.live.pages.forEach((page) => {
      values.push([
        savedForm.id,
        savedForm.metadata.title,
        'live',
        page.path,
        page.path,
        page.title,
        hasComponents(page) ? page.components.length.toString() : null
      ])
    })
  }
})

const csv = await createCsv([headers, ...values])

// console.log(summary)

await fs.writeFile(`${__dirname}pages.csv`, csv, 'utf8')

/**
 * SavedForm
 * @typedef {object} SavedForm
 * @property {string} id - id
 * @property {string} slug - slug
 * @property {FormMetadata} metadata - form metadata
 * @property {FormDefinition} [draft] - draft form definition
 * @property {FormDefinition} [live] - live form definition
 */

/**
 * Summary
 * @typedef {string|null} Value
 * @typedef {Value[]} Row
 */

/**
 * @import { FormMetadata, FormDefinition, Page, ComponentDef, Link, ConditionWrapper, ConditionGroupData, ConditionData, ConditionRefData } from '@defra/forms-model'
 * @import { Input, Callback } from 'csv-stringify'
 */
