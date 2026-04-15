import { ControllerType } from '@defra/forms-model'
import {
  buildCheckboxComponent,
  buildDeclarationFieldComponent,
  buildFileUploadPage,
  buildPaymentComponent,
  buildRadioComponent
} from '@defra/forms-model/stubs'

import {
  buildDefinition,
  buildQuestionPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import {
  daysBetween,
  getFeatureList,
  getUniqueComponentTypes,
  isSameDay
} from '~/src/api/forms/service/report.js'

describe('report', () => {
  describe('daysBetween', () => {
    it('should calc the days between', () => {
      expect(daysBetween(new Date(2025, 1, 1), new Date(2025, 2, 2))).toBe(29)
    })
  })

  describe('isSameDay', () => {
    it('should return true if dates are the same day irrespective of time', () => {
      expect(
        isSameDay(
          new Date(2025, 10, 24, 11, 5, 3),
          new Date(2025, 10, 24, 3, 7, 9)
        )
      ).toBe(true)
    })

    it('should return false if dates are different days irrespective of time', () => {
      expect(
        isSameDay(
          new Date(2025, 10, 23, 11, 5, 3),
          new Date(2025, 10, 24, 3, 7, 9)
        )
      ).toBe(false)
    })
  })

  describe('getUniqueComponentTypes', () => {
    it('should return empty list', () => {
      const summaryPage = buildSummaryPage()
      const questionPageId = 'd9c99072-d25d-4688-ab7d-3822cffe802b'
      const questionPage = buildQuestionPage({
        id: questionPageId
      })

      const definition = buildDefinition({
        pages: [questionPage, summaryPage]
      })
      expect(getUniqueComponentTypes(definition)).toEqual(new Set())
    })

    it('should return unique list', () => {
      const summaryPage = buildSummaryPage()
      const questionPageId = 'd9c99072-d25d-4688-ab7d-3822cffe802b'
      const questionPage = buildQuestionPage({
        id: questionPageId,
        components: [
          buildTextFieldComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildRadioComponent()
        ]
      })

      const definition = buildDefinition({
        pages: [questionPage, summaryPage]
      })
      expect(getUniqueComponentTypes(definition)).toEqual(
        new Set(['CheckboxesField', 'RadiosField', 'TextField'])
      )
    })
  })

  describe('getFeatureList', () => {
    it('should return empty list', () => {
      const summaryPage = buildSummaryPage()
      const questionPageId = 'd9c99072-d25d-4688-ab7d-3822cffe802b'
      const questionPage = buildQuestionPage({
        id: questionPageId
      })

      const definition = buildDefinition({
        pages: [questionPage, summaryPage]
      })
      expect(getFeatureList(definition)).toEqual([])
    })

    it('should return unique list', () => {
      const summaryPage = buildSummaryPage({
        // @ts-expect-error - forcing the controller type
        controller: ControllerType.SummaryWithConfirmationEmail
      })
      const questionPageId = 'd9c99072-d25d-4688-ab7d-3822cffe802b'
      const questionPage = buildQuestionPage({
        id: questionPageId,
        components: [
          buildTextFieldComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildRadioComponent(),
          buildDeclarationFieldComponent()
        ]
      })
      const fileUploadPage = buildFileUploadPage()
      const paymentPage = buildQuestionPage({
        components: [buildPaymentComponent()]
      })

      const definition = buildDefinition({
        pages: [questionPage, fileUploadPage, paymentPage, summaryPage]
      })
      expect(getFeatureList(definition)).toEqual([
        'File upload',
        'Email confirmation',
        'GOV.UK Pay',
        'Declarations'
      ])
    })
  })
})
