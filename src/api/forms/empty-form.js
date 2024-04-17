/**
 * Function to return an empty form
 * @returns {object} - the empty form
 */
export function emptyForm() {
  return {
    name: '',
    startPage: '/page-one',
    pages: [
      {
        path: '/page-one',
        title: 'Page one',
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
    sections: [],
    lists: []
  }
}
