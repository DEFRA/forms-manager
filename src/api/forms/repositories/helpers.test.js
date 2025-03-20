import {
  buildDefinition,
  buildQuestionPage,
  buildStatusPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import {
  findComponent,
  findPage
} from '~/src/api/forms/repositories/helpers.js'

describe('repository helpers', () => {
  const pageId = '0d174e6c-6131-4588-80bc-684238e13096'
  const summaryPageId = '449a45f6-4541-4a46-91bd-8b8931b07b50'
  const statusPageId = '38a2946b-78d9-4b94-9a31-4aa979ce2a89'
  const componentId = '62559680-e45e-4178-acdc-68f6b65d42bb'

  const component = buildTextFieldComponent({
    id: componentId
  })
  const summary = buildSummaryPage()

  const questionPageWithComponent = buildQuestionPage({
    id: pageId,
    components: [component]
  })
  const questionPageWithoutComponent = buildQuestionPage({
    id: pageId
  })
  const summaryPageWithoutComponents = buildSummaryPage({
    id: summaryPageId
  })
  const statusPage = buildStatusPage({})

  const componentWithoutAnId = buildTextFieldComponent({
    name: 'Ghcbmw'
  })
  delete componentWithoutAnId.id

  describe('findPage', () => {
    it('should find page if page exists in definition', () => {
      const definition = buildDefinition({
        pages: [questionPageWithoutComponent, summary]
      })
      expect(findPage(definition, pageId)).toEqual(questionPageWithoutComponent)
    })

    it('should return undefined if page is not found', () => {
      const definition = buildDefinition({
        pages: [summaryPageWithoutComponents]
      })
      expect(findPage(definition, 'incorrect-id')).toBeUndefined()
    })
  })

  describe('findComponent', () => {
    it('should return undefined if page is not found', () => {
      const definition = buildDefinition({
        pages: [summary]
      })
      expect(findComponent(definition, 'abc', 'def')).toBeUndefined()
    })

    it('should return undefined if page is a summary page', () => {
      const definition = buildDefinition({
        pages: [summaryPageWithoutComponents]
      })
      expect(findComponent(definition, summaryPageId, 'abc')).toBeUndefined()
    })

    it('should return undefined if page is a status page', () => {
      const definition = buildDefinition({
        pages: [statusPage]
      })
      expect(findComponent(definition, statusPageId, 'abc')).toBeUndefined()
    })

    it('should return component if component is found', () => {
      const definition = buildDefinition({
        pages: [questionPageWithComponent]
      })
      expect(findComponent(definition, pageId, componentId)).toEqual(component)
    })
  })
})
