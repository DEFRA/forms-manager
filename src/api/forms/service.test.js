import { ControllerType } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { MongoServerError, ObjectId } from 'mongodb'
import { pino } from 'pino'

import {
  buildDefinition,
  buildQuestionPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import { makeFormLiveErrorMessages } from '~/src/api/forms/constants.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { MAX_RESULTS } from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  createComponentOnDraftDefinition,
  createDraftFromLive,
  createForm,
  createLiveFromDraft,
  createPageOnDraftDefinition,
  getFormBySlug,
  getFormDefinition,
  getFormDefinitionPage,
  listForms,
  patchFieldsOnDraftDefinitionPage,
  removeForm,
  repositionSummaryPipeline,
  updateDraftFormDefinition,
  updateFormMetadata
} from '~/src/api/forms/service.js'
import * as formTemplates from '~/src/api/forms/templates.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { prepareDb } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/api/forms/templates.js')
jest.mock('~/src/mongo.js', () => {
  let isPrepared = false

  return {
    get client() {
      if (!isPrepared) {
        return undefined
      }

      return {
        startSession: () => ({
          endSession: jest.fn().mockResolvedValue(undefined),
          withTransaction: jest.fn(
            /**
             * Mock transaction handler
             * @param {() => Promise<void>} fn
             */
            async (fn) => fn()
          )
        })
      }
    },

    prepareDb() {
      isPrepared = true
      return Promise.resolve()
    }
  }
})

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))

const { empty: emptyFormWithSummary } = /** @type {typeof formTemplates} */ (
  jest.requireActual('~/src/api/forms/templates.js')
)

const author = getAuthor()
const DRAFT = 'draft'
const summaryPage = buildSummaryPage()

describe('Forms service', () => {
  const id = '661e4ca5039739ef2902b214'
  const slug = 'test-form'
  const dateUsedInFakeTime = new Date('2020-01-01')
  const pageId = 'ffefd409-f3f4-49fe-882e-6e89f44631b1'

  /**
   * @satisfies {FormMetadataInput}
   */
  const formMetadataInput = {
    title: 'Test form',
    organisation: 'Defra',
    teamName: 'Defra Forms',
    teamEmail: 'defraforms@defra.gov.uk',
    contact: {
      phone: '0800 000 1234'
    },
    submissionGuidance: 'We’ll send you an email to let you know the outcome.',
    privacyNoticeUrl: 'https://www.gov.uk/help/privacy-notice',
    notificationEmail: 'defraforms@defra.gov.uk'
  }

  /**
   * @satisfies {FormMetadata}
   */
  const formMetadataOutput = {
    ...formMetadataInput,
    id,
    slug,
    draft: {
      createdAt: expect.any(Date),
      createdBy: author,
      updatedAt: expect.any(Date),
      updatedBy: author
    },
    createdAt: expect.any(Date),
    createdBy: author,
    updatedAt: expect.any(Date),
    updatedBy: author
  }

  /**
   * @satisfies {FormMetadata}
   */
  const formMetadataWithLiveOutput = {
    ...formMetadataInput,
    id,
    slug,
    draft: {
      createdAt: expect.any(Date),
      createdBy: author,
      updatedAt: expect.any(Date),
      updatedBy: author
    },
    live: {
      createdAt: expect.any(Date),
      createdBy: author,
      updatedAt: expect.any(Date),
      updatedBy: author
    },
    createdAt: expect.any(Date),
    createdBy: author,
    updatedAt: expect.any(Date),
    updatedBy: author
  }

  /**
   * @satisfies {WithId<FormMetadataDocument>}
   */
  const formMetadataDocument = {
    ...formMetadataInput,
    _id: new ObjectId(id),
    slug: formMetadataOutput.slug,
    draft: formMetadataOutput.draft,
    createdAt: expect.any(Date),
    createdBy: author,
    updatedAt: expect.any(Date),
    updatedBy: author
  }

  /**
   * @satisfies {WithId<FormMetadataDocument>}
   */
  const formMetadataWithLiveDocument = {
    ...formMetadataInput,
    _id: new ObjectId(id),
    slug: formMetadataWithLiveOutput.slug,
    draft: formMetadataWithLiveOutput.draft,
    live: formMetadataWithLiveOutput.live,
    createdAt: expect.any(Date),
    createdBy: author,
    updatedAt: expect.any(Date),
    updatedBy: author
  }

  /**
   * @satisfies {FilterOptions}
   */
  const mockFilters = {
    authors: ['Joe Bloggs', 'Jane Doe', 'Enrique Chase'],
    organisations: ['Defra', 'Natural England'],
    status: ['live', DRAFT]
  }

  let definition = emptyFormWithSummary()

  beforeAll(async () => {
    await prepareDb(pino())
  })

  beforeEach(() => {
    definition = emptyFormWithSummary()
    jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
  })

  describe('createDraftFromLive', () => {
    beforeEach(() => {
      jest.mocked(formDefinition.createDraftFromLive).mockResolvedValueOnce()
      jest.mocked(formMetadata.update).mockResolvedValueOnce({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null
      })
    })

    it("should throw bad request if there's no live definition", async () => {
      jest.mocked(formMetadata.get).mockResolvedValueOnce(formMetadataDocument)

      await expect(createDraftFromLive(id, author)).rejects.toThrow(
        Boom.badRequest(
          `Form with ID '${formMetadataWithLiveDocument._id.toString()}' has no live state`
        )
      )
    })

    it('should update the form state when creating', async () => {
      jest
        .mocked(formMetadata.get)
        .mockResolvedValue(formMetadataWithLiveDocument)

      const dbSpy = jest.spyOn(formMetadata, 'update')

      await createDraftFromLive(id, author)

      const dbMetadataOperationArgs = dbSpy.mock.calls[0]

      expect(dbSpy).toHaveBeenCalled()
      expect(dbMetadataOperationArgs[0]).toBe(id)
      expect(dbMetadataOperationArgs[1].$set).toMatchObject({
        draft: {
          createdAt: dateUsedInFakeTime,
          createdBy: author,
          updatedAt: dateUsedInFakeTime,
          updatedBy: author
        },
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
    })
  })

  describe('createLiveFromDraft', () => {
    beforeEach(() => {
      jest.mocked(formDefinition.createLiveFromDraft).mockResolvedValue()
      jest.mocked(formMetadata.update).mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null
      })
    })

    it('should create a live state from existing draft form', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce({
        ...definition,
        outputEmail: 'test@defra.gov.uk'
      })
      await expect(createLiveFromDraft(id, author)).resolves.toBeUndefined()
    })

    it('should check if form update DB operation is called with correct form data', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce({
        ...definition,
        outputEmail: 'test@defra.gov.uk'
      })

      const dbSpy = jest.spyOn(formMetadata, 'update')

      await createLiveFromDraft('123', author)

      const dbMetadataOperationArgs = dbSpy.mock.calls[0]

      expect(dbSpy).toHaveBeenCalled()
      expect(dbMetadataOperationArgs[0]).toBe('123')
      expect(dbMetadataOperationArgs[1].$set?.live).toEqual({
        createdAt: dateUsedInFakeTime,
        createdBy: author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
      expect(dbMetadataOperationArgs[1].$set?.updatedAt).toEqual(
        dateUsedInFakeTime
      )
      expect(dbMetadataOperationArgs[1].$set?.updatedBy).toEqual(author)
    })

    it('should fail to create a live state from existing draft form when there is no start page', async () => {
      const draftDefinitionNoStartPage = /** @type {FormDefinition} */ (
        definition
      )
      delete draftDefinitionNoStartPage.startPage

      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(draftDefinitionNoStartPage)

      await expect(createLiveFromDraft(id, author)).rejects.toThrow(
        Boom.badRequest(makeFormLiveErrorMessages.missingStartPage)
      )
    })

    it('should fail to create a live state from existing draft form when there is no output email', async () => {
      const draftDefinitionNoOutputEmail = /** @type {FormDefinition} */ (
        definition
      )
      delete draftDefinitionNoOutputEmail.outputEmail

      const metadataNoNotificationEmail = {
        .../** @type {WithId<FormMetadataDocument>} */ (formMetadataDocument)
      }
      delete metadataNoNotificationEmail.notificationEmail

      jest
        .mocked(formDefinition.get)
        .mockResolvedValue(draftDefinitionNoOutputEmail)

      jest
        .mocked(formMetadata.get)
        .mockResolvedValueOnce(metadataNoNotificationEmail)

      await expect(createLiveFromDraft(id, author)).rejects.toThrow(
        Boom.badRequest(makeFormLiveErrorMessages.missingOutputEmail)
      )
    })

    it('should fail to create a live state from existing draft form when there is no contact', async () => {
      const metadataNoContact = {
        .../** @type {WithId<FormMetadataDocument>} */ (formMetadataDocument)
      }

      delete metadataNoContact.contact
      jest.mocked(formMetadata.get).mockResolvedValue(metadataNoContact)

      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(/** @type {FormDefinition} */ (definition))

      await expect(createLiveFromDraft(id, author)).rejects.toThrow(
        Boom.badRequest(makeFormLiveErrorMessages.missingContact)
      )
    })

    it('should fail to create a live state from existing draft form when there is no submission guidance', async () => {
      const metadataNoSubmissionGuidance = {
        .../** @type {WithId<FormMetadataDocument>} */ (formMetadataDocument)
      }

      delete metadataNoSubmissionGuidance.submissionGuidance
      jest
        .mocked(formMetadata.get)
        .mockResolvedValue(metadataNoSubmissionGuidance)

      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(/** @type {FormDefinition} */ (definition))

      await expect(createLiveFromDraft(id, author)).rejects.toThrow(
        Boom.badRequest(makeFormLiveErrorMessages.missingSubmissionGuidance)
      )
    })

    it('should fail to create a live state from existing draft form when there is no privacy notice url', async () => {
      const metadataNoPrivacyNotice = {
        .../** @type {WithId<FormMetadataDocument>} */ (formMetadataDocument)
      }

      delete metadataNoPrivacyNotice.privacyNoticeUrl
      jest.mocked(formMetadata.get).mockResolvedValue(metadataNoPrivacyNotice)

      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(/** @type {FormDefinition} */ (definition))

      await expect(createLiveFromDraft(id, author)).rejects.toThrow(
        Boom.badRequest(makeFormLiveErrorMessages.missingPrivacyNotice)
      )
    })

    it('should fail to create a live state when there is no draft state', async () => {
      /** @type {WithId<FormMetadataDocument>} */
      const formMetadataWithoutDraft = {
        ...formMetadataDocument,
        draft: undefined
      }

      jest
        .mocked(formMetadata.get)
        .mockResolvedValueOnce(formMetadataWithoutDraft)

      await expect(createLiveFromDraft(id, author)).rejects.toThrow(
        Boom.badRequest(makeFormLiveErrorMessages.missingDraft)
      )
    })
  })

  const slugExamples = [
    {
      input: 'Test form',
      output: 'test-form'
    },
    {
      input: 'A !Super! Duper Form -    from Defra...',
      output: 'a-super-duper-form-from-defra'
    }
  ]

  describe('updateFormMetadata', () => {
    beforeEach(() => {
      jest.mocked(formMetadata.update).mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null
      })
    })

    it.each(slugExamples)(`should return slug '$output'`, async (slugIn) => {
      const input = {
        ...formMetadataInput,
        title: slugIn.input
      }

      await expect(updateFormMetadata(id, input, author)).resolves.toEqual(
        slugIn.output
      )
    })

    it('should update slug and draft.updatedAt/draft.updatedBy when title is updated', async () => {
      const input = {
        title: 'new title'
      }

      jest.mocked(formMetadata.get).mockResolvedValueOnce(formMetadataDocument)

      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'updateName')

      const updatedSlug = await updateFormMetadata(id, input, author)
      expect(updatedSlug).toBe('new-title')

      const dbMetadataOperationArgs = dbMetadataSpy.mock.calls[0]
      const dbDefinitionOperationArgs = dbDefinitionSpy.mock.calls[0]

      // Check metadata was updated
      expect(dbMetadataSpy).toHaveBeenCalled()
      expect(dbMetadataOperationArgs[0]).toBe(id)
      expect(dbMetadataOperationArgs[1]).toMatchObject({
        $set: {
          slug: 'new-title',
          title: input.title,
          updatedAt: dateUsedInFakeTime,
          updatedBy: author,
          'draft.updatedAt': dateUsedInFakeTime,
          'draft.updatedBy': author
        }
      })

      // Check definition was updated
      expect(dbDefinitionSpy).toHaveBeenCalled()
      expect(dbDefinitionOperationArgs[0]).toBe(id)
      expect(dbDefinitionOperationArgs[1]).toBe(input.title)
    })

    it('should not update draft.updatedAt and draft.updatedBy when title is not updated', async () => {
      const input = {
        organisation: 'new organisation'
      }

      jest.mocked(formMetadata.get).mockResolvedValueOnce(formMetadataDocument)

      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'updateName')

      const slugAfterUpdate = await updateFormMetadata(id, input, author)
      expect(slugAfterUpdate).toBe('test-form')

      const dbMetadataOperationArgs = dbMetadataSpy.mock.calls[0]

      expect(dbMetadataSpy).toHaveBeenCalled()
      expect(dbMetadataOperationArgs[0]).toBe(id)
      expect(dbMetadataOperationArgs[1]).toMatchObject({
        $set: {
          organisation: 'new organisation',
          updatedAt: dateUsedInFakeTime,
          updatedBy: author
        }
      })

      expect(
        dbMetadataOperationArgs[1].$set?.['draft.updatedAt']
      ).toBeUndefined()
      expect(
        dbMetadataOperationArgs[1].$set?.['draft.updatedBy']
      ).toBeUndefined()

      expect(dbDefinitionSpy).not.toHaveBeenCalled()
    })

    it('should throw an error when writing for metadata fails', async () => {
      jest.mocked(formMetadata.update).mockRejectedValue(new Error('error'))

      await expect(
        updateFormMetadata(id, formMetadataInput, author)
      ).rejects.toThrow('error')
    })

    it('should throw an error if form does not exist', async () => {
      const error = Boom.notFound("Form with ID '123' not found")

      jest.mocked(formMetadata.get).mockRejectedValue(error)

      await expect(
        updateFormMetadata('123', formMetadataInput, author)
      ).rejects.toThrow(error)
    })

    it('should throw an error if form is live and trying to update title', async () => {
      const error = Boom.badRequest(
        `Form with ID '123' is live so 'title' cannot be updated`
      )

      jest
        .mocked(formMetadata.get)
        .mockResolvedValueOnce(formMetadataWithLiveDocument)

      await expect(
        updateFormMetadata('123', { title: 'new title' }, author)
      ).rejects.toThrow(error)
    })

    it('should throw an error when title already exists', async () => {
      const duplicateError = new MongoServerError({
        message: 'duplicate key error',
        code: 11000
      })
      jest.mocked(formMetadata.update).mockRejectedValue(duplicateError)

      const input = {
        title: 'duplicate title'
      }

      await expect(updateFormMetadata(id, input, author)).rejects.toThrow(
        Boom.badRequest('Form title duplicate title already exists')
      )
    })
  })

  describe('createForm', () => {
    beforeEach(() => {
      jest.mocked(formDefinition.upsert).mockResolvedValue()
      jest.mocked(formTemplates.empty).mockReturnValue(definition)
      jest.mocked(formMetadata.create).mockResolvedValue({
        acknowledged: true,
        insertedId: new ObjectId(id)
      })
    })

    it('should create a new form', async () => {
      await expect(createForm(formMetadataInput, author)).resolves.toEqual(
        formMetadataOutput
      )
    })

    it('should check if form create DB operation is called with correct form data', async () => {
      const dbSpy = jest.spyOn(formMetadata, 'create')

      await createForm(formMetadataInput, author)

      const dbMetadataOperationArgs = dbSpy.mock.calls[0][0]

      expect(dbSpy).toHaveBeenCalled()
      expect(dbMetadataOperationArgs.createdAt).toEqual(dateUsedInFakeTime)
      expect(dbMetadataOperationArgs.createdBy).toEqual(author)
      expect(dbMetadataOperationArgs.updatedBy).toEqual(author)
      expect(dbMetadataOperationArgs.updatedAt).toEqual(dateUsedInFakeTime)
    })

    test.each(slugExamples)(`should return slug '$output'`, async (slugIn) => {
      const input = {
        ...formMetadataInput,
        title: slugIn.input
      }

      expect((await createForm(input, author)).slug).toBe(slugIn.output)
    })

    it('should throw an error when schema validation fails', async () => {
      // @ts-expect-error - Allow invalid form definition for test
      jest.mocked(formTemplates.empty).mockReturnValueOnce({})

      const input = {
        ...formMetadataInput,
        organisation: '',
        teamName: '',
        teamEmail: ''
      }

      await expect(createForm(input, author)).rejects.toThrow(
        InvalidFormDefinitionError
      )
    })

    it('should throw an error when writing for metadata fails', async () => {
      jest.mocked(formMetadata.create).mockRejectedValueOnce(new Error())

      const input = {
        ...formMetadataInput,
        organisation: '',
        teamName: '',
        teamEmail: ''
      }

      await expect(createForm(input, author)).rejects.toThrow()
    })

    it('should throw an error when writing form def fails', async () => {
      jest.mocked(formDefinition.upsert).mockRejectedValueOnce(new Error())

      const input = {
        ...formMetadataInput,
        organisation: '',
        teamName: '',
        teamEmail: ''
      }

      await expect(createForm(input, author)).rejects.toThrow()
    })

    it('should return the form definition', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition)

      await expect(getFormDefinition('123')).resolves.toMatchObject(definition)
    })

    it('should throw an error if the form associated with the definition does not exist', async () => {
      const error = Boom.notFound("Form with ID '123' not found")

      jest.mocked(formMetadata.get).mockRejectedValue(error)

      await expect(
        updateDraftFormDefinition('123', definition, author)
      ).rejects.toThrow(error)
    })
  })

  describe('removeForm', () => {
    it('should succeed if both operations succeed', async () => {
      jest.mocked(formMetadata.remove).mockResolvedValueOnce()
      jest.mocked(formDefinition.remove).mockResolvedValueOnce()

      await expect(removeForm(id)).resolves.toBeUndefined()
    })

    it('should fail if form metadata remove fails', async () => {
      jest.mocked(formMetadata.remove).mockRejectedValueOnce('unknown error')
      jest.mocked(formDefinition.remove).mockResolvedValueOnce()

      await expect(removeForm(id)).rejects.toBeDefined()
    })

    it('should fail if form definition remove fails', async () => {
      jest.mocked(formMetadata.remove).mockResolvedValueOnce()
      jest.mocked(formDefinition.remove).mockRejectedValueOnce('unknown error')

      await expect(removeForm(id)).rejects.toBeDefined()
    })

    it('should fail if the form is live', async () => {
      jest
        .mocked(formMetadata.get)
        .mockResolvedValueOnce(formMetadataWithLiveDocument)

      await expect(removeForm(id)).rejects.toBeDefined()
    })
  })

  describe('listForms', () => {
    const formDate = new Date('2024-01-26T00:00:00Z')
    const liveDate = new Date('2024-02-26T00:00:00Z')
    const draftDate = new Date('2024-03-26T00:00:00Z')
    const defaultDate = new Date('2024-06-25T23:00:00Z')
    const defaultPage = 1
    const defaultPerPage = MAX_RESULTS

    const formAuthor = { displayName: 'Joe Bloggs', id: '1' }
    const liveAuthor = { displayName: 'Jane Doe', id: '2' }
    const draftAuthor = { displayName: 'Enrique Chase', id: '3' }
    const defaultAuthor = { displayName: 'Unknown', id: '-1' }

    /**
     * @type {WithId<Partial<FormMetadataDocument>>}
     */
    const formMetadataBaseDocument = {
      ...formMetadataInput,
      _id: new ObjectId(id),
      slug: formMetadataOutput.slug
    }

    /**
     * @type {WithId<Partial<FormMetadataDocument>>}
     */
    const formMetadataLiveDocument = {
      ...formMetadataBaseDocument,
      live: {
        createdAt: liveDate,
        createdBy: liveAuthor,
        updatedAt: liveDate,
        updatedBy: liveAuthor
      }
    }

    /**
     * @type {WithId<Partial<FormMetadataDocument>>}
     */
    const formMetadataDraftDocument = {
      ...formMetadataLiveDocument,
      draft: {
        createdAt: draftDate,
        createdBy: draftAuthor,
        updatedAt: draftDate,
        updatedBy: draftAuthor
      }
    }

    /**
     * @type {WithId<Partial<FormMetadataDocument>>}
     */
    const formMetadataDraftNoLiveDocument = {
      ...formMetadataBaseDocument,
      draft: {
        createdAt: draftDate,
        createdBy: draftAuthor,
        updatedAt: draftDate,
        updatedBy: draftAuthor
      }
    }

    /**
     * @type {WithId<Partial<FormMetadataDocument>>}
     */
    const formMetadataFullDocument = {
      ...formMetadataDraftDocument,
      createdAt: formDate,
      createdBy: formAuthor,
      updatedAt: formDate,
      updatedBy: formAuthor
    }

    it('should handle the full set of states', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataFullDocument],
        totalItems: 1,
        filters: mockFilters
      })

      const result = await listForms({ page: 1, perPage: 10 })

      expect(result).toEqual({
        forms: [
          expect.objectContaining({
            updatedAt: formDate,
            updatedBy: formAuthor,
            createdAt: formDate,
            createdBy: formAuthor
          })
        ],
        totalItems: 1,
        filters: mockFilters
      })
    })

    it('should handle states when root state info is missing and live is present', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataDraftDocument],
        totalItems: 1,
        filters: mockFilters
      })

      const result = await listForms({ page: 1, perPage: 10 })

      expect(result).toEqual({
        forms: [
          expect.objectContaining({
            updatedAt: draftDate,
            updatedBy: draftAuthor,
            createdAt: liveDate,
            createdBy: liveAuthor
          })
        ],
        totalItems: 1,
        filters: mockFilters
      })
    })

    it('should handle states when draft state info is missing', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataLiveDocument],
        totalItems: 1,
        filters: mockFilters
      })

      const result = await listForms({ page: 1, perPage: 10 })

      expect(result).toEqual({
        forms: [
          expect.objectContaining({
            updatedAt: liveDate,
            updatedBy: liveAuthor,
            createdAt: liveDate,
            createdBy: liveAuthor
          })
        ],
        totalItems: 1,
        filters: mockFilters
      })
    })

    it('should handle states when live state info is missing', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataDraftNoLiveDocument],
        totalItems: 1,
        filters: mockFilters
      })

      const result = await listForms({ page: 1, perPage: 10 })

      expect(result).toEqual({
        forms: [
          expect.objectContaining({
            updatedAt: draftDate,
            updatedBy: draftAuthor,
            createdAt: draftDate,
            createdBy: draftAuthor
          })
        ],
        totalItems: 1,
        filters: mockFilters
      })
    })

    it('should handle states when all states are missing', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataBaseDocument],
        totalItems: 1,
        filters: mockFilters
      })

      const result = await listForms({ page: 1, perPage: 10 })

      expect(result).toEqual({
        forms: [
          expect.objectContaining({
            updatedAt: defaultDate,
            updatedBy: defaultAuthor,
            createdAt: defaultDate,
            createdBy: defaultAuthor
          })
        ],
        totalItems: 1,
        filters: mockFilters
      })
    })

    describe('with sorting', () => {
      it('should pass sorting parameters to repository', async () => {
        const page = 1
        const perPage = 10
        const sortBy = 'title'
        const order = 'asc'
        const title = 'test'
        const totalItems = 3

        const documents = [
          { ...formMetadataFullDocument },
          { ...formMetadataFullDocument },
          { ...formMetadataFullDocument }
        ]

        jest
          .mocked(formMetadata.list)
          .mockResolvedValue({ documents, totalItems, filters: mockFilters })

        const options = { page, perPage, sortBy, order, title }
        const result = await listForms(options)

        expect(formMetadata.list).toHaveBeenCalledWith(options)
        expect(result).toEqual({
          forms: expect.any(Array),
          totalItems,
          filters: mockFilters
        })
      })
    })

    describe('with search', () => {
      it('should pass search parameters to repository', async () => {
        const page = 1
        const perPage = 10
        const title = 'a search'

        jest.mocked(formMetadata.list).mockResolvedValue({
          documents: [formMetadataFullDocument, formMetadataFullDocument],
          totalItems: 2,
          filters: mockFilters
        })

        const result = await listForms({ page, perPage, title })

        expect(formMetadata.list).toHaveBeenCalledWith({
          page,
          perPage,
          title
        })
        expect(result).toEqual({
          forms: expect.any(Array),
          totalItems: 2,
          filters: mockFilters
        })
      })

      it('should return empty results when search finds no matches', async () => {
        const page = 1
        const perPage = 10
        const title = 'Defra Badger Relocation and Tea Party Planning Form'

        jest.mocked(formMetadata.list).mockResolvedValue({
          documents: [],
          totalItems: 0,
          filters: mockFilters
        })

        const result = await listForms({ page, perPage, title })

        expect(formMetadata.list).toHaveBeenCalledWith({
          page,
          perPage,
          title
        })
        expect(result).toEqual({
          forms: [],
          totalItems: 0,
          filters: mockFilters
        })
      })

      it('should use empty string for title when no search parameter is provided', async () => {
        const page = 1
        const perPage = 10

        jest.mocked(formMetadata.list).mockResolvedValue({
          documents: [formMetadataFullDocument],
          totalItems: 1,
          filters: mockFilters
        })

        const result = await listForms({ page, perPage })

        expect(formMetadata.list).toHaveBeenCalledWith({
          page,
          perPage
        })
        expect(result).toEqual({
          forms: expect.any(Array),
          totalItems: 1,
          filters: mockFilters
        })
      })
    })

    it('should handle default pagination parameters', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataFullDocument],
        totalItems: 1,
        filters: mockFilters
      })

      const result = await listForms({
        page: defaultPage,
        perPage: defaultPerPage
      })

      expect(formMetadata.list).toHaveBeenCalledWith({
        page: defaultPage,
        perPage: defaultPerPage
      })
      expect(result).toEqual({
        forms: [
          expect.objectContaining({
            updatedAt: formDate,
            updatedBy: formAuthor,
            createdAt: formDate,
            createdBy: formAuthor
          })
        ],
        totalItems: 1,
        filters: mockFilters
      })
    })

    it('should return correct pagination with MAX_RESULTS', async () => {
      const totalItems = MAX_RESULTS + 1

      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataFullDocument],
        totalItems,
        filters: mockFilters
      })

      const result = await listForms({
        page: defaultPage,
        perPage: defaultPerPage
      })

      expect(result).toEqual({
        forms: [
          expect.objectContaining({
            updatedAt: formDate,
            updatedBy: formAuthor,
            createdAt: formDate,
            createdBy: formAuthor
          })
        ],
        totalItems,
        filters: mockFilters
      })
    })

    it('should handle empty results with MAX_RESULTS', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [],
        totalItems: 0,
        filters: mockFilters
      })

      const result = await listForms({
        page: defaultPage,
        perPage: defaultPerPage
      })

      expect(result).toEqual({
        forms: [],
        totalItems: 0,
        filters: mockFilters
      })
    })

    it('should use default values when no options are provided', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataFullDocument],
        totalItems: 1,
        filters: mockFilters
      })

      const result = await listForms({ page: 1, perPage: MAX_RESULTS })

      expect(formMetadata.list).toHaveBeenCalledWith({
        page: 1,
        perPage: MAX_RESULTS
      })
      expect(result).toEqual({
        forms: [
          expect.objectContaining({
            updatedAt: formDate,
            updatedBy: formAuthor,
            createdAt: formDate,
            createdBy: formAuthor
          })
        ],
        totalItems: 1,
        filters: mockFilters
      })
    })

    describe('with filters', () => {
      it('should return empty filters when no forms exist', async () => {
        const emptyFilters = {
          authors: [],
          organisations: [],
          status: []
        }

        jest.mocked(formMetadata.list).mockResolvedValue({
          documents: [],
          totalItems: 0,
          filters: emptyFilters
        })

        const result = await listForms({ page: 1, perPage: 10 })

        expect(result).toEqual({
          forms: [],
          totalItems: 0,
          filters: emptyFilters
        })
      })

      it('should pass filter parameters to repository', async () => {
        /** @type {QueryOptions} */
        const options = {
          page: 1,
          perPage: 10,
          author: 'Henrique Chase',
          organisations: ['Defra'],
          status: ['live']
        }

        jest.mocked(formMetadata.list).mockResolvedValue({
          documents: [formMetadataFullDocument],
          totalItems: 1,
          filters: mockFilters
        })

        const result = await listForms(options)

        expect(formMetadata.list).toHaveBeenCalledWith(options)
        expect(result).toEqual({
          forms: expect.any(Array),
          totalItems: 1,
          filters: mockFilters
        })
      })

      it('should handle multiple filter parameters', async () => {
        /** @type {QueryOptions} */
        const options = {
          page: 1,
          perPage: 10,
          author: 'Henrique Chase',
          organisations: ['Defra', 'Natural England'],
          status: ['live', DRAFT]
        }

        jest.mocked(formMetadata.list).mockResolvedValue({
          documents: [formMetadataFullDocument, formMetadataFullDocument],
          totalItems: 2,
          filters: mockFilters
        })

        const result = await listForms(options)

        expect(formMetadata.list).toHaveBeenCalledWith(options)
        expect(result).toEqual({
          forms: expect.any(Array),
          totalItems: 2,
          filters: mockFilters
        })
      })
    })
  })

  describe('getFormBySlug', () => {
    it('should return form metadata when form exists', async () => {
      jest
        .mocked(formMetadata.getBySlug)
        .mockResolvedValue(formMetadataDocument)

      const result = await getFormBySlug(slug)

      expect(result).toEqual(formMetadataOutput)
      expect(formMetadata.getBySlug).toHaveBeenCalledWith(slug)
    })

    it('should throw an error if form does not exist', async () => {
      const error = Boom.notFound(`Form with slug '${slug}' not found`)
      jest.mocked(formMetadata.getBySlug).mockRejectedValue(error)

      await expect(getFormBySlug(slug)).rejects.toThrow(error)
    })
  })

  describe('updateDraftFormDefinition', () => {
    const formDefinitionCustomisedTitle = emptyFormWithSummary()
    formDefinitionCustomisedTitle.name =
      "A custom form name that shouldn't be allowed"

    it('should update the draft form definition with required attributes upon creation', async () => {
      const upsertSpy = jest.spyOn(formDefinition, 'upsert')
      const formMetadataGetSpy = jest.spyOn(formMetadata, 'get')

      await updateDraftFormDefinition(
        '123',
        formDefinitionCustomisedTitle,
        author
      )

      expect(upsertSpy).toHaveBeenCalledWith(
        '123',
        {
          ...formDefinitionCustomisedTitle,
          name: formMetadataDocument.title
        },
        expect.anything()
      )

      expect(formMetadataGetSpy).toHaveBeenCalledWith('123')

      expect(formDefinitionCustomisedTitle.name).toBe(
        formMetadataDocument.title
      )
    })

    test('should check if form update DB operation is called with correct form data', async () => {
      const dbSpy = jest.spyOn(formMetadata, 'update')

      await updateDraftFormDefinition(
        '123',
        formDefinitionCustomisedTitle,
        author
      )

      const dbOperationArgs = dbSpy.mock.calls[0]

      expect(dbSpy).toHaveBeenCalled()
      expect(dbOperationArgs[0]).toBe('123')
      expect(dbOperationArgs[1].$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
    })

    it('should throw an error if the form has no draft state', async () => {
      jest.mocked(formMetadata.get).mockResolvedValueOnce({
        ...formMetadataDocument,
        draft: undefined
      })

      const formDefinitionCustomised = emptyFormWithSummary()

      await expect(
        updateDraftFormDefinition('123', formDefinitionCustomised, author)
      ).rejects.toThrow(
        Boom.badRequest(`Form with ID '123' has no draft state`)
      )
    })
  })

  describe('repositionSummaryPipeline', () => {
    const summary = buildSummaryPage()

    it('should reposition summary if it exists but is not at the end', async () => {
      const initialSummary = buildSummaryPage()
      delete initialSummary.id

      const removeMatchingPagesSpy = jest.spyOn(
        formDefinition,
        'removeMatchingPages'
      )
      const addPageAtPositionSpy = jest.spyOn(
        formDefinition,
        'addPageAtPosition'
      )
      const formMetadataUpdateSpy = jest.spyOn(formMetadata, 'update')

      const formDefinition1 = buildDefinition({
        pages: [initialSummary, buildQuestionPage()]
      })

      const returnedSummary = await repositionSummaryPipeline(
        id,
        formDefinition1,
        author
      )

      expect(removeMatchingPagesSpy).toHaveBeenCalled()
      expect(addPageAtPositionSpy).toHaveBeenCalled()
      expect(formMetadataUpdateSpy).toHaveBeenCalled()

      const [formId1, matchCriteria, , state] =
        removeMatchingPagesSpy.mock.calls[0]
      const [formId2, calledSummary, , options] =
        addPageAtPositionSpy.mock.calls[0]
      const [formId3, updateFilter] = formMetadataUpdateSpy.mock.calls[0]

      expect(formId1).toBe(id)
      expect(formId2).toBe(id)
      expect(formId3).toBe(id)
      expect(matchCriteria).toEqual({ controller: ControllerType.Summary })
      expect(calledSummary).toEqual(summary)
      expect(state).toBeUndefined()
      expect(options).toEqual({})
      expect(updateFilter.$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
      expect(returnedSummary.summary).toEqual(summary)
    })

    it('should not reposition the summary if no pages exist', async () => {
      const formDefinition1 = buildDefinition({
        pages: []
      })
      const removeMatchingPagesSpy = jest.spyOn(
        formDefinition,
        'removeMatchingPages'
      )
      const addPageAtPositionSpy = jest.spyOn(
        formDefinition,
        'addPageAtPosition'
      )
      const formMetadataUpdateSpy = jest.spyOn(formMetadata, 'update')
      await repositionSummaryPipeline(id, formDefinition1, author)

      expect(removeMatchingPagesSpy).not.toHaveBeenCalled()
      expect(addPageAtPositionSpy).not.toHaveBeenCalled()
      expect(formMetadataUpdateSpy).not.toHaveBeenCalled()
    })

    it('should not reposition the summary if summary is at the end', async () => {
      const formDefinition1 = buildDefinition({
        pages: [buildQuestionPage(), summaryPage]
      })
      const removeMatchingPagesSpy = jest.spyOn(
        formDefinition,
        'removeMatchingPages'
      )
      const addPageAtPositionSpy = jest.spyOn(
        formDefinition,
        'addPageAtPosition'
      )
      const formMetadataUpdateSpy = jest.spyOn(formMetadata, 'update')
      await repositionSummaryPipeline(id, formDefinition1, author)

      expect(removeMatchingPagesSpy).not.toHaveBeenCalled()
      expect(addPageAtPositionSpy).not.toHaveBeenCalled()
      expect(formMetadataUpdateSpy).not.toHaveBeenCalled()
    })

    it('should not reposition the summary if pages do not contain a summary', async () => {
      const formDefinition1 = buildDefinition({
        pages: [buildQuestionPage()]
      })

      const removeMatchingPagesSpy = jest.spyOn(
        formDefinition,
        'removeMatchingPages'
      )
      const addPageAtPositionSpy = jest.spyOn(
        formDefinition,
        'addPageAtPosition'
      )
      const formMetadataUpdateSpy = jest.spyOn(formMetadata, 'update')
      await repositionSummaryPipeline(id, formDefinition1, author)

      expect(removeMatchingPagesSpy).not.toHaveBeenCalled()
      expect(addPageAtPositionSpy).not.toHaveBeenCalled()
      expect(formMetadataUpdateSpy).not.toHaveBeenCalled()
    })

    it('should surface errors correctly', async () => {
      jest
        .mocked(formDefinition.addPageAtPosition)
        .mockRejectedValueOnce(Boom.badRequest('Error'))

      const formDefinition1 = buildDefinition({
        pages: [summary, buildQuestionPage()]
      })
      await expect(
        repositionSummaryPipeline('123', formDefinition1, author)
      ).rejects.toThrow(Boom.badRequest('Error'))
    })
  })

  describe('getFormDefinitionPage', () => {
    it('should get a page if it exists', async () => {
      const questionPageId = 'd9c99072-d25d-4688-ab7d-3822cffe802b'
      const questionPage = buildQuestionPage({
        id: questionPageId
      })

      const definition2 = buildDefinition({
        pages: [questionPage, summaryPage]
      })

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition2)

      const foundPage = await getFormDefinitionPage('123', questionPageId)

      expect(foundPage).toEqual(questionPage)
    })

    it('should fail is page does not exist', async () => {
      const definition2 = buildDefinition(definition)

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition2)

      await expect(
        getFormDefinitionPage('123', 'bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d')
      ).rejects.toThrow(
        Boom.notFound(
          'Page ID bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d not found on Form ID 123'
        )
      )
    })
  })

  describe('createPageOnDraftDefinition', () => {
    it('should create a new page when a summary page exists', async () => {
      const formDefinitionPageCustomisedTitle = buildQuestionPage({
        title: 'A new form page',
        path: '/a-new-form-page'
      })

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition)

      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'addPageAtPosition')

      const page = await createPageOnDraftDefinition(
        id,
        formDefinitionPageCustomisedTitle,
        author
      )
      const dbOperationArgs = dbMetadataSpy.mock.calls[0]
      const [formId1, page1, , options] = dbDefinitionSpy.mock.calls[0]

      expect(formId1).toBe(id)
      expect(page1).toMatchObject({
        ...formDefinitionPageCustomisedTitle,
        id: expect.any(String)
      })
      expect(options).toEqual({ position: -1 })
      expect(dbOperationArgs[0]).toBe(id)
      expect(dbOperationArgs[1].$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
      expect(page).toMatchObject({
        ...formDefinitionPageCustomisedTitle,
        id: expect.any(String)
      })
    })

    it('should create a new page when a summary page does not exist', async () => {
      const formDefinitionPageCustomisedTitle = buildQuestionPage({
        title: 'A new form page',
        path: '/a-new-form-page'
      })
      const definitionWithoutSummary = buildDefinition({
        pages: []
      })

      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(definitionWithoutSummary)

      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'addPageAtPosition')

      await createPageOnDraftDefinition(
        id,
        formDefinitionPageCustomisedTitle,
        author
      )
      const dbOperationArgs = dbMetadataSpy.mock.calls[0]

      expect(dbDefinitionSpy).toHaveBeenCalledWith(
        id,
        {
          ...formDefinitionPageCustomisedTitle,
          id: expect.any(String)
        },
        expect.anything(),
        {}
      )
      expect(dbOperationArgs[0]).toBe(id)
      expect(dbOperationArgs[1].$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
    })

    it('should fail if path is duplicate', async () => {
      const pageOne = buildQuestionPage({
        path: '/page-one'
      })
      const pageOneDuplicate = buildQuestionPage({
        title: 'Page One Duplicate',
        path: '/page-one'
      })
      const definition1 = buildDefinition({
        ...definition,
        pages: [pageOne]
      })

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)

      await expect(
        createPageOnDraftDefinition('123', pageOneDuplicate, author)
      ).rejects.toThrow(Boom.conflict('Duplicate page path on Form ID 123'))
    })

    it('should fail if no draft definition exists', async () => {
      jest
        .mocked(formDefinition.get)
        .mockRejectedValueOnce(Boom.notFound('Error'))

      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')

      await expect(
        createPageOnDraftDefinition('123', buildQuestionPage({}), author)
      ).rejects.toThrow(Boom.notFound('Error'))
      expect(dbMetadataSpy).not.toHaveBeenCalled()
    })

    it('should surface errors correctly', async () => {
      jest
        .mocked(formDefinition.addPageAtPosition)
        .mockRejectedValueOnce(Boom.badRequest('Error'))
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition)
      await expect(
        createPageOnDraftDefinition('123', buildQuestionPage({}), author)
      ).rejects.toThrow(Boom.badRequest('Error'))
    })
  })

  describe('createComponentOnDraftDefinition', () => {
    const pageId = 'bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d'
    const questionPage = buildQuestionPage({
      id: pageId
    })
    const definition1 = buildDefinition({
      ...definition,
      pages: [questionPage, ...definition.pages]
    })
    const textFieldComponent = buildTextFieldComponent()

    it('should add a component to the end of a DraftDefinition page', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)
      const [createdComponent] = await createComponentOnDraftDefinition(
        '123',
        pageId,
        [textFieldComponent],
        author
      )
      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'addComponents')

      expect(dbDefinitionSpy).toHaveBeenCalled()
      expect(dbMetadataSpy).toHaveBeenCalled()
      const [metaFormId, metaUpdateOperations] = dbMetadataSpy.mock.calls[0]
      const [formId, calledPageId, components, , state] =
        dbDefinitionSpy.mock.calls[0]

      expect(formId).toBe('123')
      expect(calledPageId).toBe(pageId)
      expect(components).toEqual([
        { ...textFieldComponent, id: expect.any(String) }
      ])
      expect(state).toEqual({ state: DRAFT })

      expect(metaFormId).toBe('123')

      expect(metaUpdateOperations.$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
      expect(createdComponent).toMatchObject({
        ...createdComponent,
        id: expect.any(String)
      })
    })

    it('should add a component to the start of a DraftDefinition page if called with prepend=true', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)
      await createComponentOnDraftDefinition(
        '123',
        pageId,
        [textFieldComponent],
        author,
        true
      )
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'addComponents')

      const [, , , , options] = dbDefinitionSpy.mock.calls[0]

      expect(options).toEqual({ state: DRAFT, position: 0 })
    })

    it('should fail if page does not exist', async () => {
      const textFieldComponent = buildTextFieldComponent()
      const definition2 = buildDefinition(definition)

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition2)

      await expect(
        createComponentOnDraftDefinition(
          '123',
          'bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d',
          [textFieldComponent],
          author
        )
      ).rejects.toThrow(
        Boom.notFound(
          'Page ID bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d not found on Form ID 123'
        )
      )
    })
    it('should surface errors correctly', async () => {
      jest
        .mocked(formDefinition.addComponents)
        .mockRejectedValueOnce(Boom.badRequest('Error'))
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)
      await expect(
        createComponentOnDraftDefinition(
          '123',
          'bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d',
          [textFieldComponent],
          author
        )
      ).rejects.toThrow(Boom.badRequest('Error'))
    })
  })

  describe('patchFieldsOnDraftDefinitionPage', () => {
    const initialPage = buildQuestionPage()
    const pageFields = /** @satisfies {PatchPageFields} */ {
      title: 'Updated Title',
      path: '/updated-title'
    }
    const initialDefinition = buildDefinition({
      pages: [initialPage, summaryPage]
    })

    it('should update page fields', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce(initialDefinition)
      const expectedPage = buildQuestionPage({
        ...pageFields
      })
      jest.mocked(formDefinition.get).mockResolvedValueOnce(
        buildDefinition({
          pages: [expectedPage, summaryPage]
        })
      )
      const page = await patchFieldsOnDraftDefinitionPage(
        '123',
        pageId,
        pageFields,
        author
      )

      expect(page).toEqual(expectedPage)
      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'updatePageFields')

      expect(dbMetadataSpy).toHaveBeenCalled()
      const [metaFormId, metaUpdateOperations] = dbMetadataSpy.mock.calls[0]
      expect(metaFormId).toBe('123')

      expect(metaUpdateOperations.$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })

      expect(dbDefinitionSpy).toHaveBeenCalled()
      const [formId, calledPageId, pageFieldsToUpdate, , state] =
        dbDefinitionSpy.mock.calls[0]

      expect(formId).toBe('123')
      expect(calledPageId).toBe(pageId)
      expect(pageFieldsToUpdate).toEqual(pageFields)
      expect(state).toBe(DRAFT)
    })

    it('should fail if the fields were unsuccessfully updated', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce(initialDefinition)
      jest.mocked(formDefinition.get).mockResolvedValueOnce(
        buildDefinition({
          pages: [buildQuestionPage({}), summaryPage]
        })
      )

      await expect(
        patchFieldsOnDraftDefinitionPage('123', pageId, pageFields, author)
      ).rejects.toThrow(
        Boom.internal(
          'Failed to patch fields title,path on Page ID ffefd409-f3f4-49fe-882e-6e89f44631b1 Form ID 123'
        )
      )
    })
  })
})

/**
 * @import { FormDefinition, FormMetadata, FormMetadataAuthor, FormMetadataDocument, FormMetadataInput, FilterOptions, QueryOptions, PatchPageFields } from '@defra/forms-model'
 * @import { WithId } from 'mongodb'
 */
