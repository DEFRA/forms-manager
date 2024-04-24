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
        controller: './pages/summary.js',
        section: 'section',
        components: [
          {
            type: 'TextField',
            name: 'textField',
            title: 'This is your first field',
            hint: 'Help text',
            options: {},
            schema: {}
          }
        ]
      }
    ],
    conditions: [],
    sections: [
      {
        name: 'section',
        title: 'Section title',
        hideTitle: false
      }
    ],
    lists: [],
    feeOptions: {
      maxAttempts: 1,
      showPaymentSkippedWarningPage: false,
      allowSubmissionWithoutPayment: true
    },
    fees: [],
    outputs: []
  })
}

/**
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 */
