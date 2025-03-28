import fs from 'fs/promises'
import * as url from 'url'

import {
  ConditionType,
  hasComponents,
  hasConditionField,
  hasConditionGroup,
  hasConditionName,
  hasContentField,
  hasFormField,
  hasListField,
  isListType
} from '@defra/forms-model'
import { stringify } from 'csv-stringify'

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

/**
 * Create Pages CSV
 */
async function createPages() {
  const headers = [
    'formId',
    'slug',
    'formTitle',
    'state',
    'id',
    'path',
    'title',
    'componentCount',
    'formComponentCount',
    'contentComponentCount'
  ]

  /**
   * @type {Row[]}
   */
  const values = []

  saved.forEach((savedForm) => {
    const { id, metadata } = savedForm
    const { slug } = metadata

    /**
     * @param {Page} page
     * @param {'draft' | 'live'} state
     */
    function addPage(page, state) {
      const { title } = page

      values.push([
        id,
        slug,
        title,
        state,
        page.path,
        page.path,
        page.title,
        hasComponents(page) ? page.components.length.toString() : null,
        hasComponents(page)
          ? page.components.filter(hasFormField).length.toString()
          : null,
        hasComponents(page)
          ? page.components.filter(hasContentField).length.toString()
          : null
      ])
    }

    if (savedForm.draft) {
      savedForm.draft.pages.forEach((page) => {
        addPage(page, 'draft')
      })
    }

    if (savedForm.live) {
      savedForm.live.pages.forEach((page) => {
        addPage(page, 'live')
      })
    }
  })

  const csv = await createCsv([headers, ...values])

  await fs.writeFile(`${__dirname}pages.csv`, csv, 'utf8')
}

await createPages()

/**
 * Create Components CSV
 */
async function createComponents() {
  const headers = [
    'formId',
    'formTitle',
    'state',
    'name',
    'title',
    'type',
    'list'
  ]

  /**
   * @type {Row[]}
   */
  const values = []

  saved.forEach((savedForm) => {
    const { id, metadata } = savedForm
    const { title: formTitle } = metadata

    /**
     * @param {ComponentDef} component
     * @param {'draft' | 'live'} state
     */
    function addComponent(component, state) {
      const { name, title, type } = component

      if (hasListField(component)) {
        const list = component.list
        values.push([id, formTitle, state, name, title, type, list])
      } else {
        values.push([id, formTitle, state, name, title, type, ''])
      }
    }

    if (savedForm.draft) {
      savedForm.draft.pages.forEach((page) => {
        if (hasComponents(page)) {
          page.components.forEach((component) => {
            addComponent(component, 'draft')
          })
        }
      })
    }

    if (savedForm.live) {
      savedForm.live.pages.forEach((page) => {
        if (hasComponents(page)) {
          page.components.forEach((component) => {
            addComponent(component, 'live')
          })
        }
      })
    }
  })

  const csv = await createCsv([headers, ...values])

  await fs.writeFile(`${__dirname}components.csv`, csv, 'utf8')
}

await createComponents()

/**
 * Create Lists CSV
 */
async function createLists() {
  const headers = [
    'formId',
    'formTitle',
    'state',
    'name',
    'title',
    'type',
    'itemCount',
    'itemConditionCount'
  ]

  /**
   * @type {Row[]}
   */
  const values = []

  saved.forEach((savedForm) => {
    const { id, metadata } = savedForm
    const { title: formTitle } = metadata

    /**
     * @param {List} list
     * @param {'draft' | 'live'} state
     */
    function addList(list, state) {
      const { name, title, type, items } = list

      values.push([
        id,
        formTitle,
        state,
        name,
        title,
        type,
        items.length.toString(),
        items.filter((item) => item.condition).length.toString()
      ])
    }

    if (savedForm.draft) {
      savedForm.draft.lists.forEach((list) => {
        addList(list, 'draft')
      })
    }

    if (savedForm.live) {
      savedForm.live.lists.forEach((list) => {
        addList(list, 'live')
      })
    }
  })

  const csv = await createCsv([headers, ...values])

  await fs.writeFile(`${__dirname}lists.csv`, csv, 'utf8')
}

await createLists()

/**
 * Create Conditions CSV
 */
async function createConditions() {
  const headers = [
    'formId',
    'formTitle',
    'state',
    'wrapperName',
    'wrapperDisplayName',
    'coordinator',
    'operator',
    'conditionType',
    'conditionValue',
    'conditionDisplay',
    'conditionDirection',
    'conditionUnit',
    'conditionPeriod',
    'fieldDisplay',
    'fieldName',
    'fieldType',
    'fieldTypeIsListType'
  ]

  /**
   * @type {Row[]}
   */
  const values = []

  saved.forEach((savedForm) => {
    const { id, metadata } = savedForm
    const { title: formTitle } = metadata

    /**
     * @param {FormDefinition} definition
     * @param {ConditionWrapper} wrapper
     * @param {'draft' | 'live'} state
     */
    function addConditionWrapper(definition, wrapper, state) {
      const {
        name: wrapperName,
        displayName: wrapperDisplayName,
        value
      } = wrapper

      // const components = definition.pages.flatMap((page) =>
      //   hasComponents(page) ? page.components : []
      // )
      // const componentsMap = new Map(
      //   components.map((component) => [component.name, component])
      // )

      value.conditions.forEach((condition) => {
        if (hasConditionGroup(condition)) {
          // throw new Error('Not implemented')
        } else if (hasConditionName(condition)) {
          // throw new Error('Not implemented')
        } else if (hasConditionField(condition)) {
          const { coordinator, field, operator, value } = condition
          const {
            display: fieldDisplay,
            name: fieldName,
            type: fieldType
          } = field

          const conditionType = value.type
          let conditionValue = ''
          let conditionDisplay = ''
          let conditionDirection = ''
          let conditionUnit = ''
          let conditionPeriod = ''
          if (value.type === ConditionType.Value) {
            conditionValue = value.value
            conditionDisplay = value.display
          } else {
            conditionDirection = value.direction
            conditionUnit = value.unit
            conditionPeriod = value.period
          }

          const fieldTypeIsListType = isListType(fieldType)

          values.push([
            id,
            formTitle,
            state,
            wrapperName,
            wrapperDisplayName,
            coordinator ? coordinator.toString() : '',
            operator,
            conditionType,
            conditionValue,
            conditionDisplay,
            conditionDirection,
            conditionUnit,
            conditionPeriod,
            fieldDisplay,
            fieldName,
            fieldType,
            fieldTypeIsListType.toString()
          ])
        }
      })
    }

    if (savedForm.draft) {
      const definition = savedForm.draft
      savedForm.draft.conditions.forEach((wrapper) => {
        addConditionWrapper(definition, wrapper, 'draft')
      })
    }

    if (savedForm.live) {
      const definition = savedForm.live
      savedForm.live.conditions.forEach((wrapper) => {
        addConditionWrapper(definition, wrapper, 'live')
      })
    }
  })

  const csv = await createCsv([headers, ...values])

  await fs.writeFile(`${__dirname}conditions.csv`, csv, 'utf8')
}

await createConditions()

/**
 * SavedForm
 * @typedef {object} SavedForm
 * @property {string} id - id
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
 * @import { FormMetadata, FormDefinition, List, Page, ComponentDef, Link, ConditionWrapper, ConditionsModelData, ConditionGroupData, ConditionData, ConditionRefData } from '@defra/forms-model'
 * @import { Input, Callback } from 'csv-stringify'
 */
