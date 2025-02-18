import {
  buildDefinition,
  buildPage,
  buildSummaryPage
} from '~/src/api/forms/__stubs__/definition.js'
import { summaryHelper } from '~/src/api/forms/repositories/helpers.js'

describe('repository helpers', () => {
  describe('shouldPushSummaryToEnd', () => {
    const summary = buildSummaryPage({})

    it('should push the summary to the end if it not in the correct place', () => {
      const definition = buildDefinition({
        pages: [summary, buildPage({})]
      })
      expect(summaryHelper(definition)).toEqual({
        shouldPush: true,
        exists: true,
        summary
      })
    })

    it('should not push summary to the end if it is in the correct place', () => {
      const definition = buildDefinition({
        pages: [buildPage({}), summary]
      })
      expect(summaryHelper(definition)).toEqual({
        shouldPush: false,
        exists: true,
        summary
      })
    })

    it('should not push summary to the end if no summary exists', () => {
      const definition = buildDefinition({
        pages: []
      })
      expect(summaryHelper(definition)).toEqual({
        shouldPush: false,
        exists: false,
        summary: undefined
      })
    })
  })
})
