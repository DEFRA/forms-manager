import {
  buildDefinition,
  buildQuestionPage,
  buildSummaryPage
} from '~/src/api/forms/__stubs__/definition.js'
import {
  createOrder,
  reorderPages
} from '~/src/api/forms/service/helpers/definition.js'

describe('page helpers', () => {
  const pageOneId = '181c5e0a-9c68-44f9-a731-9699d915e5a3'
  const pageTwoId = '37734ec9-508d-416a-9fc5-0fbb5fdd6abc'
  const pageThreeId = '082ad4bb-fd75-457d-bf6a-c721cd7f26cc'
  const summaryPageId = 'c5118caa-b133-4672-a616-c385a05426e8'

  describe('createOrder', () => {
    it('should create an object with orders', () => {
      const orderDictionary = {
        '181c5e0a-9c68-44f9-a731-9699d915e5a3': -2,
        '37734ec9-508d-416a-9fc5-0fbb5fdd6abc': -1,
        '082ad4bb-fd75-457d-bf6a-c721cd7f26cc': -0
      }

      expect(
        createOrder([
          '181c5e0a-9c68-44f9-a731-9699d915e5a3',
          '37734ec9-508d-416a-9fc5-0fbb5fdd6abc',
          '082ad4bb-fd75-457d-bf6a-c721cd7f26cc'
        ])
      ).toEqual(orderDictionary)
    })
  })

  describe('reorderPages', () => {
    const pageOne = buildQuestionPage({
      title: 'Page One',
      id: pageOneId
    })
    const pageTwo = buildQuestionPage({
      title: 'Page Two',
      id: pageTwoId
    })
    const pageThree = buildQuestionPage({
      title: 'Page Three',
      id: pageThreeId
    })
    const summaryPage = buildSummaryPage({
      title: 'Summary Page',
      id: summaryPageId
    })

    it('should reorder pages', () => {
      const definition = buildDefinition({
        pages: [pageTwo, pageThree, pageOne, summaryPage]
      })
      const expectedDefinition = buildDefinition({
        ...definition,
        pages: [pageOne, pageTwo, pageThree, summaryPage]
      })
      const pageOrder = [pageOneId, pageTwoId, pageThreeId]

      expect(reorderPages(definition, pageOrder)).toEqual(expectedDefinition)
    })

    it('should do nothing if there are no pages', () => {
      const definition = buildDefinition({
        pages: []
      })
      expect(reorderPages(definition, [])).toEqual(definition)
    })

    it('should handle undefined and summary pages', () => {
      const summaryWithoutId = buildSummaryPage({
        ...summaryPage,
        id: undefined
      })
      const pageWithoutId = buildQuestionPage({
        id: undefined
      })
      const page2WithoutId = buildQuestionPage({
        id: undefined
      })
      const definition = buildDefinition({
        pages: [pageWithoutId, page2WithoutId, summaryWithoutId]
      })
      expect(reorderPages(definition, [])).toEqual(definition)
    })
  })
})
