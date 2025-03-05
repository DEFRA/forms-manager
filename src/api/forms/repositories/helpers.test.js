import {
  buildDefinition,
  buildQuestionPage,
  buildStatusPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import {
  definitionHasComponentWithoutId,
  findComponent,
  findComponentsWithoutIds,
  findPage,
  findPageComponentsWithoutIds,
  pageHasComponentWithoutId,
  populateComponentIds,
  summaryHelper
} from '~/src/api/forms/repositories/helpers.js'

describe('repository helpers', () => {
  const pageId = '0d174e6c-6131-4588-80bc-684238e13096'
  const summaryPageId = '449a45f6-4541-4a46-91bd-8b8931b07b50'
  const statusPageId = '38a2946b-78d9-4b94-9a31-4aa979ce2a89'
  const componentId = '62559680-e45e-4178-acdc-68f6b65d42bb'

  const component = buildTextFieldComponent({
    id: componentId
  })
  const questionPage = buildQuestionPage()
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
    name: 'CwAid'
  })
  delete componentWithoutAnId.id

  describe('summaryHelper', () => {
    it('should push the summary to the end if it not in the correct place', () => {
      const definition = buildDefinition({
        pages: [summary, questionPage]
      })
      expect(summaryHelper(definition)).toEqual({
        shouldRepositionSummary: true,
        summaryExists: true,
        summary
      })
    })

    it('should not push summary to the end if it is in the correct place', () => {
      const definition = buildDefinition({
        pages: [questionPage, summary]
      })
      expect(summaryHelper(definition)).toEqual({
        shouldRepositionSummary: false,
        summaryExists: true,
        summary
      })
    })

    it('should not push summary to the end if no pages', () => {
      const definition = buildDefinition({
        pages: []
      })
      expect(summaryHelper(definition)).toEqual({
        shouldRepositionSummary: false,
        summaryExists: false,
        summary: undefined
      })
    })

    it('should not push summary to the end if summary page does not exist', () => {
      const definition = buildDefinition({
        pages: [questionPage]
      })
      expect(summaryHelper(definition)).toEqual({
        shouldRepositionSummary: false,
        summaryExists: false,
        summary: undefined
      })
    })
  })

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

  describe('populateComponentIds', () => {
    it('should return unchanged if no components in page', () => {
      const testPage = buildQuestionPage()
      const page = populateComponentIds(testPage)
      expect(page).toEqual(testPage)
    })

    it('should return unchanged if page is not one with components', () => {
      const testPage = buildStatusPage({})
      const page = populateComponentIds(testPage)
      expect(page).toEqual(testPage)
    })

    it('should return unchanged if page has a component but component already has id', () => {
      const testPage = buildQuestionPage({
        components: [
          buildTextFieldComponent({
            id: 'f0449907-e3fe-4c9e-a954-dc4f8ae778f8'
          })
        ]
      })
      const page = populateComponentIds(testPage)
      expect(page).toEqual(testPage)
    })

    it('should return populated if page has a component where component has no id', () => {
      const testPage = buildQuestionPage({
        components: [componentWithoutAnId]
      })
      expect(testPage.components[0].id).toBeUndefined()
      const page = /** @type {PageQuestion} */ (populateComponentIds(testPage))
      expect(page.components[0].id).toBeDefined()
    })
  })

  describe('component checks', () => {
    const componentWithoutAnId2 = buildTextFieldComponent({
      id: undefined,
      name: 'CwAid2'
    })
    const componentWithAnId = buildTextFieldComponent()
    const componentWithAnId2 = buildTextFieldComponent({ id: '123' })
    const componentWithAnId3 = buildTextFieldComponent({ id: '123' })
    const componentListWithoutAnId = [
      componentWithAnId,
      componentWithAnId2,
      componentWithAnId3,
      componentWithoutAnId
    ]
    const componentListWithoutAnId2 = [
      componentWithAnId,
      componentWithoutAnId2,
      componentWithAnId3,
      componentWithoutAnId
    ]
    const componentListWithIds = [
      componentWithAnId,
      componentWithAnId2,
      componentWithAnId3
    ]
    const pageWithComponentIds = buildQuestionPage({
      components: componentListWithIds
    })
    const pageWithoutAComponentId = buildQuestionPage({
      id: 'pageIds1',
      components: componentListWithoutAnId2
    })
    const pageWithoutAComponentId2 = buildQuestionPage({
      id: 'pageIds2',
      components: [componentWithoutAnId]
    })
    const pagesWithoutAComponentId = [
      pageWithComponentIds,
      pageWithComponentIds,
      pageWithComponentIds,
      pageWithoutAComponentId
    ]
    const pagesWithComponentIds = [
      pageWithComponentIds,
      pageWithComponentIds,
      pageWithComponentIds,
      summaryPageWithoutComponents
    ]

    describe('pageHasComponentWithoutId', () => {
      it('should return true if a component is found without an id', () => {
        expect(
          pageHasComponentWithoutId(
            buildQuestionPage({ components: componentListWithoutAnId })
          )
        ).toBe(true)
      })
      it('should return false if no component is found without an id', () => {
        expect(
          pageHasComponentWithoutId(buildQuestionPage({ components: [] }))
        ).toBe(false)
        expect(pageHasComponentWithoutId(buildSummaryPage())).toBe(false)
        expect(pageHasComponentWithoutId(pageWithComponentIds)).toBe(false)
      })
    })

    describe('definitionHasComponentWithoutId', () => {
      it('should return true if component is found without an id', () => {
        expect(
          definitionHasComponentWithoutId(
            buildDefinition({ pages: pagesWithoutAComponentId })
          )
        ).toBe(true)
      })
      it('should return false if component is not found without an id', () => {
        expect(
          definitionHasComponentWithoutId(
            buildDefinition({ pages: pagesWithComponentIds })
          )
        ).toBe(false)
      })
    })

    describe('findPageComponentsWithoutIds', () => {
      it('should return a list of components if they are found', () => {
        expect(
          findPageComponentsWithoutIds(pageWithoutAComponentId, 'abc-123')
        ).toEqual([
          { pageId: 'abc-123', componentName: 'CwAid' },
          { pageId: 'abc-123', componentName: 'CwAid2' }
        ])
      })

      it('should return an empty list if none are found', () => {
        expect(
          findPageComponentsWithoutIds(summaryPageWithoutComponents, 'abc-123')
        ).toEqual([])
        expect(
          findPageComponentsWithoutIds(pageWithComponentIds, 'abc-123')
        ).toEqual([])
      })
    })

    describe('recursivelyFindComponentsWithoutIds', () => {
      it('should return list of components without an id', () => {
        const definitionWithoutComponentIds = buildDefinition({
          pages: [
            ...pagesWithComponentIds,
            ...pagesWithoutAComponentId,
            pageWithoutAComponentId2
          ]
        })
        expect(findComponentsWithoutIds(definitionWithoutComponentIds)).toEqual(
          [
            { pageId: 'pageIds1', componentName: 'CwAid' },
            { pageId: 'pageIds1', componentName: 'CwAid2' },
            { pageId: 'pageIds2', componentName: 'CwAid' }
          ]
        )
      })
      it('should return empty array if all components have ids', () => {
        const pageWithMissingId = buildQuestionPage()
        delete pageWithMissingId.id

        const pageWithUndefinedId = buildQuestionPage({ id: undefined })

        const definitionWithComponentIds = buildDefinition({
          pages: [
            ...pagesWithComponentIds,
            pageWithMissingId,
            pageWithUndefinedId
          ]
        })
        expect(findComponentsWithoutIds(definitionWithComponentIds)).toEqual([])
      })
    })
  })
})

/**
 * @import { PageQuestion } from '@defra/forms-model'
 */
