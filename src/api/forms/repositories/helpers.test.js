import {
  buildDefinition,
  buildQuestionPage,
  buildSummaryPage
} from '~/src/api/forms/__stubs__/definition.js'
import {
  findPage,
  summaryHelper
} from '~/src/api/forms/repositories/helpers.js'

describe('repository helpers', () => {
  describe('summaryHelper', () => {
    const summary = buildSummaryPage({})

    it('should push the summary to the end if it not in the correct place', () => {
      const definition = buildDefinition({
        pages: [summary, buildQuestionPage({})]
      })
      expect(summaryHelper(definition)).toEqual({
        shouldRepositionSummary: true,
        summaryExists: true,
        summary
      })
    })

    it('should not push summary to the end if it is in the correct place', () => {
      const definition = buildDefinition({
        pages: [buildQuestionPage({}), summary]
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
        pages: [buildQuestionPage()]
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
      const questionPage = buildQuestionPage({
        id: '0d174e6c-6131-4588-80bc-684238e13096'
      })
      const definition = buildDefinition({
        pages: [questionPage, buildSummaryPage()]
      })
      expect(
        findPage(definition, '0d174e6c-6131-4588-80bc-684238e13096')
      ).toEqual(questionPage)
    })

    it('should return undefined if page is not found', () => {
      const definition = buildDefinition({
        pages: [buildSummaryPage()]
      })
      expect(
        findPage(definition, '0d174e6c-6131-4588-80bc-684238e13096')
      ).toBeUndefined()
    })
  })
})
