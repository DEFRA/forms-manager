import { ControllerPath, ControllerType } from '@defra/forms-model'

import { empty, emptyPage } from '~/src/api/forms/templates.js'

/**
 * @param {Partial<Page>} partialPage
 * @returns {Page}
 */
export function buildPage(partialPage) {
  return /** @satisfies {Page} */ {
    ...emptyPage(),
    ...partialPage
  }
}

/**
 * Creates a page array with a summary at the end
 * @param {Page} pages
 * @returns {Page[]}
 */
export function buildPages(...pages) {
  return /** @satisfies {Page[]} */ [
    ...pages,
    {
      id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
      title: 'Summary',
      path: ControllerPath.Summary,
      controller: ControllerType.Summary
    }
  ]
}

/**
 * @param {Partial<PageSummary>} partialSummaryPage
 * @returns {PageSummary}
 */
export function buildSummaryPage(partialSummaryPage) {
  return /** @satisfies {PageSummary} */ {
    id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
    title: 'Summary',
    path: ControllerPath.Summary,
    controller: ControllerType.Summary,
    ...partialSummaryPage
  }
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
 * @import { FormDefinition, Page, PageSummary } from '@defra/forms-model'
 * @import { WithId } from 'mongodb'
 */
