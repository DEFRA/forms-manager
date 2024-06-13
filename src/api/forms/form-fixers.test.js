import { getStartPage } from './form-fixers.js'

describe('getStartPage', () => {
  it('should return the start page when there is only one', () => {
    const formDefinition = /** @type {FormDefinition} */ ({
      startPage: 'old-page',
      pages: [
        { path: 'page1', next: [{ path: 'page2' }] },
        { path: 'page2', next: [{ path: 'page3' }] },
        { path: 'page3', next: [] }
      ]
    })

    const result = getStartPage(formDefinition)

    expect(result).toBe('page1')
  })

  it('should return the start page when there are multiple start pages', () => {
    const formDefinition = /** @type {FormDefinition} */ ({
      startPage: 'my-original-start-page',
      pages: [
        { path: 'page1', next: [{ path: 'page3' }] },
        { path: 'page2', next: [{ path: 'page3' }] },
        { path: 'page3', next: [] }
      ]
    })

    const result = getStartPage(formDefinition)

    expect(result).toBe('my-original-start-page')
  })
})

/**
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 */
