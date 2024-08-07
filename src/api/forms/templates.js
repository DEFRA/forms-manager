import { ComponentType } from '@defra/forms-model'

/**
 * Function to return an empty form
 */
export function empty() {
  return /** @satisfies {FormDefinition} */ ({
    name: '',
    startPage: '/page-one',
    pages: [
      {
        path: '/page-one',
        title: 'Page one',
        section: 'section',
        components: [
          {
            type: ComponentType.TextField,
            name: 'textField',
            title: 'This is your first field',
            hint: 'Help text',
            options: {},
            schema: {}
          }
        ],
        next: [{ path: '/summary' }]
      },
      {
        title: 'Summary',
        path: '/summary',
        controller: 'SummaryPageController',
        components: []
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
