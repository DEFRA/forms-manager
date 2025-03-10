import {
  ComponentType,
  ControllerPath,
  ControllerType
} from '@defra/forms-model'

import { empty } from '~/src/api/forms/templates.js'

/**
 * @param {Partial<PageQuestion>} [partialPage]
 * @returns {PageQuestion}
 */
export function buildQuestionPage(partialPage = {}) {
  return {
    id: 'ffefd409-f3f4-49fe-882e-6e89f44631b1',
    title: 'Page One',
    path: '/page-one',
    next: [],
    components: [],
    ...partialPage
  }
}

/**
 * @param {Partial<PageSummary>} [partialSummaryPage]
 */
export function buildSummaryPage(partialSummaryPage = {}) {
  /** @type {PageSummary} */
  const page = /** @satisfies {PageSummary} */ {
    id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
    title: 'Summary',
    path: ControllerPath.Summary,
    controller: ControllerType.Summary,
    ...partialSummaryPage
  }
  return page
}

/**
 * @param {Partial<PageStatus>} partialStatusPage
 */
export function buildStatusPage(partialStatusPage) {
  return /** @type {PageStatus} */ ({
    title: 'Status',
    path: ControllerPath.Status,
    controller: ControllerType.Status,
    ...partialStatusPage
  })
}

/**
 * Builds a form definition
 * @param {Partial<FormDefinition>} partialDefinition
 * @returns {FormDefinition}
 */
export function buildDefinition(partialDefinition) {
  const emptyDefinition = empty()
  return /** @satisfies {FormDefinition} */ {
    ...emptyDefinition,
    ...partialDefinition
  }
}

/**
 * @param {Partial<TextFieldComponent>} partialTextField
 * @returns {TextFieldComponent}
 */
export function buildTextFieldComponent(partialTextField = {}) {
  return /** @satisfies {TextFieldComponent} */ {
    id: '407dd0d7-cce9-4f43-8e1f-7d89cb698875',
    name: 'TextField',
    title: 'Text field',
    type: ComponentType.TextField,
    hint: '',
    options: {},
    schema: {},
    ...partialTextField
  }
}
/**
 * @import { FormDefinition, PageSummary, PageQuestion, PageStatus, TextFieldComponent } from '@defra/forms-model'
 */
