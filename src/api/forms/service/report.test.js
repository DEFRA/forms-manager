import { ControllerType, FormStatus } from '@defra/forms-model'
import {
  buildCheckboxComponent,
  buildDeclarationFieldComponent,
  buildFileUploadPage,
  buildPaymentComponent,
  buildRadioComponent
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
import { getMetadataOfAllForms } from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  getExpectedAllDaysMetrics,
  getExpectedSingleDayMetrics
} from '~/src/api/forms/service/__stubs__/metrics.js'
import {
  daysBetween,
  generateReport,
  getDefinitionIfExists,
  getFeatureList,
  getUniqueComponentTypes,
  isSameDay
} from '~/src/api/forms/service/report.js'
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

describe('report', () => {
  describe('generateReport', () => {
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

    it('should gather metrics for all forms, for all dates', async () => {
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
      jest.mocked(getMetadataOfAllForms).mockResolvedValueOnce(allMetadata)

      // Form 1 - draft and no live
      jest.mocked(formDefinition.get).mockResolvedValueOnce(buildDefinition({}))
      jest.mocked(formDefinition.get).mockImplementationOnce(() => {
        throw Boom.notFound()
      })

      // Form 2 - draft and live
      jest.mocked(formDefinition.get).mockResolvedValueOnce(buildDefinition({}))
      jest.mocked(formDefinition.get).mockResolvedValueOnce(buildDefinition({}))

      // Form 3 - draft and no live
      jest.mocked(formDefinition.get).mockResolvedValueOnce(buildDefinition({}))
      // @ts-expect-error - force not def to be returned
      jest.mocked(formDefinition.get).mockResolvedValueOnce(undefined)

      const mockNewSession = /** @type {any} */ ({
        withTransaction: jest.fn().mockImplementation(async (callback) => {
          return await callback()
        }),
        endSession: jest.fn().mockResolvedValue(undefined)
      })
      jest.mocked(client.startSession).mockReturnValue(mockNewSession)

      const metrics = await generateReport()

      expect(metrics).toEqual(getExpectedAllDaysMetrics(new Date()))
    })

    it('should gather metrics for all forms, for a specific date', async () => {
      const allMetadata = [
        buildMetadataDocument({
          title: 'Form 1 title',
          slug: 'form-1-title',
          _id: new ObjectId(form1Id),
          updatedAt: new Date('2025-05-20T09:10:21.035Z')
        }),
        buildMetadataDocument({
          title: 'Form 2 title',
          slug: 'form-2-title',
          _id: new ObjectId(form2Id),
          live: {
            createdAt: new Date('2025-05-07T09:10:21.035Z'),
            createdBy: {
              id: '84305e4e-1f52-43d0-a123-9c873b0abb35',
              displayName: 'Internal User'
            },
            updatedAt: new Date('2025-05-07T09:10:21.035Z'),
            updatedBy: {
              id: '84305e4e-1f52-43d0-a123-9c873b0abb35',
              displayName: 'Internal User'
            }
          },
          updatedAt: new Date('2025-05-07T09:10:21.035Z')
        }),
        buildMetadataDocument({
          title: 'Form 3 title',
          slug: 'form-3-title',
          _id: new ObjectId(form3Id),
          updatedAt: new Date('2025-05-20T09:10:21.035Z')
        })
      ]
      jest.mocked(getMetadataOfAllForms).mockResolvedValueOnce(allMetadata)

      // Form 1 - draft and no live
      jest.mocked(formDefinition.get).mockResolvedValueOnce(buildDefinition({}))
      // @ts-expect-error - force not def to be returned
      jest.mocked(formDefinition.get).mockResolvedValueOnce(undefined)

      // Form 2 - draft and live
      jest.mocked(formDefinition.get).mockResolvedValueOnce(buildDefinition({}))
      jest.mocked(formDefinition.get).mockResolvedValueOnce(buildDefinition({}))

      // Form 3 - draft and no live
      jest.mocked(formDefinition.get).mockResolvedValueOnce(buildDefinition({}))
      // @ts-expect-error - force not def to be returned
      jest.mocked(formDefinition.get).mockResolvedValueOnce(undefined)

      const mockNewSession = /** @type {any} */ ({
        withTransaction: jest.fn().mockImplementation(async (callback) => {
          return await callback()
        }),
        endSession: jest.fn().mockResolvedValue(undefined)
      })
      jest.mocked(client.startSession).mockReturnValue(mockNewSession)

      const metrics = await generateReport(new Date(2025, 4, 7))

      expect(metrics).toEqual(getExpectedSingleDayMetrics(new Date()))
    })

    it('should handle error and still close session', async () => {
      jest.mocked(getMetadataOfAllForms).mockImplementationOnce(() => {
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

      await expect(() => generateReport()).rejects.toThrow('report error')

      expect(mockEndSession).toHaveBeenCalled()
    })
  })
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

    it('should return false if either date is undefined', () => {
      expect(isSameDay(undefined, new Date(2025, 10, 24, 3, 7, 9))).toBe(false)
      expect(isSameDay(new Date(2025, 10, 24, 3, 7, 9), undefined)).toBe(false)
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

  describe('getDefinitionIfExists', () => {
    it('should throw if error is not NOT_FOUND', async () => {
      jest.mocked(formDefinition.get).mockImplementationOnce(() => {
        throw new Error('Not a boom NOT FOUND')
      })
      // @ts-expect-error - mock session not implemented
      await expect(() =>
        getDefinitionIfExists('formId', FormStatus.Draft, {})
      ).rejects.toThrow('Not a boom NOT FOUND')
    })
  })
})
