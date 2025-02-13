import { ControllerPath, ControllerType } from '@defra/forms-model'

/**
 * Function to return an empty form
 */
export function empty() {
  return /** @satisfies {FormDefinition} */ ({
    name: '',
    startPage: '/page-one',
    pages: [
      {
        title: 'Summary',
        path: ControllerPath.Summary,
        controller: ControllerType.Summary
      }
    ],
    conditions: [],
    sections: [
      {
        name: 'section',
        title: 'Section title'
      }
    ],
    lists: []
  })
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
