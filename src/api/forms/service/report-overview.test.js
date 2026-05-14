import { ComponentType, ControllerType, FormStatus } from '@defra/forms-model'
import {
  buildCheckboxComponent,
  buildDeclarationFieldComponent,
  buildFileUploadPage,
  buildMarkdownComponent,
  buildPaymentComponent,
  buildRadioComponent,
  buildUkAddressFieldComponent
} from '@defra/forms-model/stubs'
import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

import {
  buildDefinition,
  buildQuestionPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import { buildMetadataDocument } from '~/src/api/forms/__stubs__/metadata.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import { getMetadataCursorOfAllForms } from '~/src/api/forms/repositories/form-metadata-repository.js'
import { getExpectedOverviewMetrics } from '~/src/api/forms/service/__stubs__/metrics.js'
import {
  calcFeatureMetrics,
  generateReportOverview,
  getComponentUsageFeatureMetrics,
  getDefinitionIfExists,
  getFeatureList,
  getQuestionTypeCounts,
  getUniqueAssignedConditions,
  getUniqueAssignedSections,
  getUniqueComponentTypes
} from '~/src/api/forms/service/report-overview.js'
import { client } from '~/src/mongo.js'

jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')

jest.mock('~/src/mongo.js', () => ({
  client: {
    startSession: jest.fn()
  },
  db: {},
  METADATA_COLLECTION_NAME: 'form-metadata',
  DEFINITION_COLLECTION_NAME: 'form-definition'
}))

describe('report-overview', () => {
  describe('generateReportOverview', () => {
    /** @type {any} */
    const mockSession = {
      withTransaction: jest.fn(),
      endSession: jest.fn()
    }
    const now = new Date()

    beforeEach(() => {
      jest.clearAllMocks()
      jest.useFakeTimers().setSystemTime(now)

      mockSession.withTransaction = jest
        .fn()
        .mockImplementation(
          async (/** @type {() => Promise<any>} */ callback) => {
            return await callback()
          }
        )
      mockSession.endSession = jest.fn().mockResolvedValue(undefined)
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    const form1Id = '449a699bcc9946a6a6d925de'
    const form2Id = '0dae1c832b8e4a89963a7825'
    const form3Id = '9fb48bd350a64e908c9ea92e'

    it('should gather metrics for all forms', async () => {
      const allMetadata = [
        buildMetadataDocument({
          title: 'Form 1 title',
          slug: 'form-1-title',
          _id: new ObjectId(form1Id)
        }),
        buildMetadataDocument({
          title: 'Form 2 title',
          slug: 'form-2-title',
          _id: new ObjectId(form2Id),
          live: {
            createdAt: new Date('2025-08-08T09:10:21.035Z'),
            createdBy: {
              id: '84305e4e-1f52-43d0-a123-9c873b0abb35',
              displayName: 'Internal User'
            },
            updatedAt: new Date('2025-08-08T09:10:21.035Z'),
            updatedBy: {
              id: '84305e4e-1f52-43d0-a123-9c873b0abb35',
              displayName: 'Internal User'
            }
          }
        }),
        buildMetadataDocument({
          title: 'Form 3 title',
          slug: 'form-3-title',
          _id: new ObjectId(form3Id)
        })
      ]
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: function* () {
          for (const metadata of allMetadata) {
            yield metadata
          }
        }
      }

      jest
        .mocked(getMetadataCursorOfAllForms)
        // @ts-expect-error - resolves to an async iterator like FindCursor<FormMetadataDocument>
        .mockReturnValueOnce(mockAsyncIterator)

      const pageWithSection = /** @type {FormDefinition} */ ({
        pages: [{ section: 'abc' }]
      })

      // Form 1 - draft and no live
      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(buildDefinition(pageWithSection))

      // Form 2 - draft and live
      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(buildDefinition(pageWithSection))
      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(buildDefinition(pageWithSection))

      // Form 3 - draft and no live
      jest.mocked(formDefinition.get).mockResolvedValueOnce(buildDefinition({}))

      const mockNewSession = /** @type {any} */ ({
        withTransaction: jest.fn().mockImplementation(async (callback) => {
          return await callback()
        }),
        endSession: jest.fn().mockResolvedValue(undefined)
      })
      jest.mocked(client.startSession).mockReturnValue(mockNewSession)

      const metrics = await generateReportOverview()

      expect(metrics).toEqual(getExpectedOverviewMetrics(new Date()))
    })

    it('should handle error and still close session', async () => {
      jest.mocked(getMetadataCursorOfAllForms).mockImplementationOnce(() => {
        throw new Error('report error')
      })

      const mockEndSession = jest.fn().mockResolvedValue(undefined)
      const mockNewSession = /** @type {any} */ ({
        withTransaction: jest.fn().mockImplementation(async (callback) => {
          return await callback()
        }),
        endSession: mockEndSession
      })
      jest.mocked(client.startSession).mockReturnValue(mockNewSession)

      await expect(() => generateReportOverview()).rejects.toThrow(
        'report error'
      )

      expect(mockEndSession).toHaveBeenCalled()
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

  describe('getUniqueAssignedConditions', () => {
    it('should return empty list', () => {
      const summaryPage = buildSummaryPage()
      const questionPageId = 'd9c99072-d25d-4688-ab7d-3822cffe802b'
      const questionPage = buildQuestionPage({
        id: questionPageId
      })

      const definition = buildDefinition({
        pages: [questionPage, summaryPage]
      })
      expect(getUniqueAssignedConditions(definition)).toEqual(new Set())
    })

    it('should return unique list', () => {
      const summaryPage = buildSummaryPage()
      const questionPageId = 'd9c99072-d25d-4688-ab7d-3822cffe802b'
      const questionPage1 = buildQuestionPage({
        id: questionPageId,
        components: [
          buildTextFieldComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildRadioComponent()
        ],
        condition: 'cond1'
      })
      const questionPage2 = buildQuestionPage({
        id: questionPageId,
        components: [
          buildTextFieldComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildRadioComponent()
        ],
        condition: 'cond1'
      })
      const questionPage3 = buildQuestionPage({
        id: questionPageId,
        components: [buildTextFieldComponent(), buildTextFieldComponent()],
        condition: 'cond2'
      })

      const definition = buildDefinition({
        pages: [questionPage1, questionPage2, questionPage3, summaryPage]
      })
      expect(getUniqueAssignedConditions(definition)).toEqual(
        new Set(['cond1', 'cond2'])
      )
    })
  })

  describe('getUniqueAssignedSections', () => {
    it('should return empty list', () => {
      const summaryPage = buildSummaryPage()
      const questionPageId = 'd9c99072-d25d-4688-ab7d-3822cffe802b'
      const questionPage = buildQuestionPage({
        id: questionPageId
      })

      const definition = buildDefinition({
        pages: [questionPage, summaryPage]
      })
      expect(getUniqueAssignedSections(definition)).toEqual(new Set())
    })

    it('should return unique list', () => {
      const summaryPage = buildSummaryPage()
      const questionPageId = 'd9c99072-d25d-4688-ab7d-3822cffe802b'
      const questionPage1 = buildQuestionPage({
        id: questionPageId,
        components: [
          buildTextFieldComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildRadioComponent()
        ],
        section: 'sect1'
      })
      const questionPage2 = buildQuestionPage({
        id: questionPageId,
        components: [
          buildTextFieldComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildTextFieldComponent(),
          buildCheckboxComponent(),
          buildRadioComponent()
        ],
        section: 'sect2'
      })
      const questionPage3 = buildQuestionPage({
        id: questionPageId,
        components: [buildTextFieldComponent(), buildTextFieldComponent()],
        section: 'sect2'
      })

      const definition = buildDefinition({
        pages: [questionPage1, questionPage2, questionPage3, summaryPage]
      })
      expect(getUniqueAssignedSections(definition)).toEqual(
        new Set(['sect1', 'sect2'])
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
        controller: ControllerType.SummaryWithConfirmationEmail,
        components: [buildMarkdownComponent()]
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
        pages: [questionPage, fileUploadPage, paymentPage, summaryPage],
        options: { showReferenceNumber: true }
      })
      expect(getFeatureList(definition)).toEqual([
        'File upload',
        'Email confirmation',
        'GOV.UK Pay',
        'Declaration field',
        'Declaration in CYA',
        'Reference number'
      ])
    })
  })

  describe('calcFeatureMetrics', () => {
    it('should return calculated metrics', () => {
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
      const sectionPage1 = buildQuestionPage({
        section: 'some-section-id1'
      })
      const sectionPage2 = buildQuestionPage({
        section: 'some-section-id2'
      })

      const definition = buildDefinition({
        pages: [
          questionPage,
          fileUploadPage,
          sectionPage1,
          sectionPage2,
          paymentPage,
          summaryPage
        ]
      })
      expect(calcFeatureMetrics(definition)).toEqual({
        features: {
          'File upload': 1,
          'Email confirmation': 1,
          'GOV.UK Pay': 1,
          'Declaration field': 1,
          Sections: 1
        },
        formStructure: {
          conditions: 0,
          pages: 6,
          questionTypes: 6,
          questions: 9,
          sections: 2
        },
        questionTypes: {
          CheckboxesField: 2,
          DeclarationField: 1,
          FileUploadField: 1,
          PaymentField: 1,
          RadiosField: 1,
          TextField: 3
        }
      })
    })

    it('should handle declaration in CYA page', () => {
      const summaryPage = buildSummaryPage({
        // @ts-expect-error - forcing the controller type
        controller: ControllerType.SummaryWithConfirmationEmail,
        components: [
          {
            type: ComponentType.Markdown,
            content: 'My declaration',
            title: 'Declaration',
            name: 'decl',
            options: {}
          }
        ]
      })
      const questionPageId = 'd9c99072-d25d-4688-ab7d-3822cffe802b'
      const questionPage = buildQuestionPage({
        id: questionPageId,
        components: [
          buildTextFieldComponent(),
          buildTextFieldComponent(),
          buildMarkdownComponent(),
          buildMarkdownComponent(),
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
      const sectionPage1 = buildQuestionPage({
        section: 'some-section-id1'
      })
      const sectionPage2 = buildQuestionPage({
        section: 'some-section-id2'
      })

      const definition = buildDefinition({
        pages: [
          questionPage,
          fileUploadPage,
          sectionPage1,
          sectionPage2,
          paymentPage,
          summaryPage
        ]
      })
      expect(calcFeatureMetrics(definition)).toEqual({
        features: {
          'File upload': 1,
          'Email confirmation': 1,
          'GOV.UK Pay': 1,
          'Declaration field': 1,
          'Declaration in CYA': 1,
          Sections: 1
        },
        formStructure: {
          conditions: 0,
          pages: 6,
          questionTypes: 8,
          questions: 12,
          sections: 2
        },
        questionTypes: {
          CheckboxesField: 2,
          DeclarationField: 1,
          DeclarationInCYA: 1,
          FileUploadField: 1,
          Markdown: 2,
          PaymentField: 1,
          RadiosField: 1,
          TextField: 3
        }
      })
    })
  })

  describe('getQuestionTypeCounts', () => {
    it('should return counts', () => {
      const components = [
        buildTextFieldComponent(),
        buildTextFieldComponent(),
        buildCheckboxComponent(),
        buildTextFieldComponent(),
        buildRadioComponent(),
        buildCheckboxComponent(),
        buildTextFieldComponent(),
        buildRadioComponent(),
        buildCheckboxComponent(),
        buildTextFieldComponent(),
        buildDeclarationFieldComponent()
      ]
      expect(Object.fromEntries(getQuestionTypeCounts(components))).toEqual({
        CheckboxesField: 3,
        DeclarationField: 1,
        RadiosField: 2,
        TextField: 5
      })
    })
  })

  describe('get component usage features', () => {
    it('should return list of features', () => {
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
      const conditionPage = buildQuestionPage({
        condition: 'some-condition-id'
      })
      const sectionPage = buildQuestionPage({
        section: 'some-section-id'
      })
      const postcodeLookupPage = buildQuestionPage({
        components: [
          buildUkAddressFieldComponent({ options: { usePostcodeLookup: true } })
        ]
      })

      const definition = buildDefinition({
        pages: [
          questionPage,
          fileUploadPage,
          paymentPage,
          postcodeLookupPage,
          conditionPage,
          sectionPage,
          summaryPage
        ]
      })
      expect(getComponentUsageFeatureMetrics(definition)).toEqual({
        'File upload': 1,
        'Email confirmation': 1,
        'GOV.UK Pay': 1,
        'Declaration field': 1,
        Sections: 1,
        'Conditional logic': 1,
        'Postcode lookup': 1
      })
    })
  })

  describe('getDefinitionIfExists', () => {
    it('should not throw if error is NOT_FOUND', async () => {
      jest.mocked(formDefinition.get).mockImplementationOnce(() => {
        throw Boom.notFound()
      })

      // @ts-expect-error - mock session not implemented
      const res = await getDefinitionIfExists('formId', FormStatus.Draft, {})

      expect(res).toBeUndefined()
    })

    it('should throw if error is not NOT_FOUND', async () => {
      jest.mocked(formDefinition.get).mockImplementationOnce(() => {
        throw new Error('Not a boom NOT FOUND')
      })
      await expect(() =>
        // @ts-expect-error - mock session not implemented
        getDefinitionIfExists('formId', FormStatus.Draft, {})
      ).rejects.toThrow('Not a boom NOT FOUND')
    })
  })
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
