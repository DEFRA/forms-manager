import { ControllerPath, ControllerType } from '@defra/forms-model'

/**
 * Function to return an empty form
 */
export function empty() {
  return /** @satisfies {FormDefinition} */ ({
    name: '',
    engine: undefined,
    startPage: ControllerPath.Summary,
    pages: [
      {
        id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
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
