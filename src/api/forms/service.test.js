import Boom from '@hapi/boom'
import { MongoServerError, ObjectId } from 'mongodb'
import { pino } from 'pino'

import { makeFormLiveErrorMessages } from '~/src/api/forms/constants.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import { MAX_RESULTS } from '~/src/api/forms/repositories/form-metadata-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  createDraftFromLive,
  createForm,
  createLiveFromDraft,
  getFormBySlug,
  getFormDefinition,
  listForms,
  removeForm,
  updateDraftFormDefinition,
  updateFormMetadata
} from '~/src/api/forms/service.js'
import * as formTemplates from '~/src/api/forms/templates.js'
import { prepareDb } from '~/src/mongo.js'

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

const { empty: actualEmptyForm } = /** @type {typeof formTemplates} */ (
  jest.requireActual('~/src/api/forms/templates.js')
)

describe('Forms service', () => {
  const id = '661e4ca5039739ef2902b214'
  const slug = 'test-form'
  const dateUsedInFakeTime = new Date('2020-01-01')

  /**
   * @satisfies {FormMetadataAuthor}
   */
  const author = {
    id: 'f50ceeed-b7a4-47cf-a498-094efc99f8bc',
    displayName: 'Enrique Chase'
  }

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

  let definition = actualEmptyForm()

  beforeAll(async () => {
    await prepareDb(pino())
  })

  beforeEach(() => {
    definition = actualEmptyForm()
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
        totalItems: 1
      })

      const result = await listForms({ page: 1, perPage: 10 })

      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            updatedAt: formDate,
            updatedBy: formAuthor,
            createdAt: formDate,
            createdBy: formAuthor
          })
        ])
      )
      expect(result.meta).toEqual({
        pagination: {
          page: 1,
          perPage: 10,
          totalItems: 1,
          totalPages: 1
        },
        sorting: {
          sortBy: 'updatedAt',
          order: 'desc'
        }
      })
    })

    it('should handle states when root state info is missing and live is present', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataDraftDocument],
        totalItems: 1
      })

      const result = await listForms({ page: 1, perPage: 10 })

      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            updatedAt: draftDate,
            updatedBy: draftAuthor,
            createdAt: liveDate,
            createdBy: liveAuthor
          })
        ])
      )
    })

    it('should handle states when draft state info is missing', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataLiveDocument],
        totalItems: 1
      })

      const result = await listForms({ page: 1, perPage: 10 })

      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            updatedAt: liveDate,
            updatedBy: liveAuthor,
            createdAt: liveDate,
            createdBy: liveAuthor
          })
        ])
      )
    })

    it('should handle states when live state info is missing', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataDraftNoLiveDocument],
        totalItems: 1
      })

      const result = await listForms({ page: 1, perPage: 10 })

      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            updatedAt: draftDate,
            updatedBy: draftAuthor,
            createdAt: draftDate,
            createdBy: draftAuthor
          })
        ])
      )
    })

    it('should handle states when all states are missing', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataBaseDocument],
        totalItems: 1
      })

      const result = await listForms({ page: 1, perPage: 10 })

      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            updatedAt: defaultDate,
            updatedBy: defaultAuthor,
            createdAt: defaultDate,
            createdBy: defaultAuthor
          })
        ])
      )
    })

    it('should throw an error if forms are malformed', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [
          {
            _id: new ObjectId(id)
            // Missing required attributes
          }
        ],
        totalItems: 1
      })

      await expect(listForms({ page: 1, perPage: 10 })).rejects.toThrow(
        'Form is malformed in the database. Expected fields are missing.'
      )
    })

    describe('with pagination', () => {
      it('should return paginated results with correct pagination metadata', async () => {
        const page = 1
        const perPage = 2
        const totalItems = 5

        /** @type {WithId<Partial<FormMetadataDocument>>[]} */
        const documents = [formMetadataFullDocument, formMetadataDraftDocument]

        jest
          .mocked(formMetadata.list)
          .mockResolvedValue({ documents, totalItems })

        const result = await listForms({ page, perPage })

        expect(formMetadata.list).toHaveBeenCalledWith({
          page,
          perPage,
          sortBy: 'updatedAt',
          order: 'desc'
        })
        expect(result).toEqual({
          data: expect.any(Array),
          meta: {
            pagination: {
              page,
              perPage,
              totalItems,
              totalPages: Math.ceil(totalItems / perPage)
            },
            sorting: {
              sortBy: 'updatedAt',
              order: 'desc'
            }
          }
        })
        expect(result.data).toHaveLength(documents.length)
      })

      it('should return empty data when there are no forms', async () => {
        const page = 1
        const perPage = 10
        const totalItems = 0

        /** @type {WithId<Partial<FormMetadataDocument>>[]} */
        const documents = []

        jest
          .mocked(formMetadata.list)
          .mockResolvedValue({ documents, totalItems })

        const result = await listForms({ page, perPage })

        expect(formMetadata.list).toHaveBeenCalledWith({
          page,
          perPage,
          sortBy: 'updatedAt',
          order: 'desc'
        })
        expect(result).toEqual({
          data: [],
          meta: {
            pagination: {
              page,
              perPage,
              totalItems,
              totalPages: 0
            },
            sorting: {
              sortBy: 'updatedAt',
              order: 'desc'
            }
          }
        })
      })

      it('should return correct totalPages when totalItems is not divisible by perPage', async () => {
        const page = 1
        const perPage = 3
        const totalItems = 10

        const documents = [
          formMetadataFullDocument,
          formMetadataDraftDocument,
          formMetadataLiveDocument
        ]

        jest
          .mocked(formMetadata.list)
          .mockResolvedValue({ documents, totalItems })

        const result = await listForms({ page, perPage })

        expect(result.meta.pagination?.totalPages).toBe(4) // 10 items with 3 per page => 4 pages
      })

      it('should handle page numbers greater than total pages', async () => {
        const page = 5
        const perPage = 2
        const totalItems = 5

        /** @type {WithId<Partial<FormMetadataDocument>>[]} */
        const documents = []

        jest
          .mocked(formMetadata.list)
          .mockResolvedValue({ documents, totalItems })

        const result = await listForms({ page, perPage })

        expect(formMetadata.list).toHaveBeenCalledWith({
          page,
          perPage,
          sortBy: 'updatedAt',
          order: 'desc'
        })
        expect(result).toEqual({
          data: [],
          meta: {
            pagination: {
              page,
              perPage,
              totalItems,
              totalPages: 3 // 5 items with 2 per page => 3 pages
            },
            sorting: {
              sortBy: 'updatedAt',
              order: 'desc'
            }
          }
        })
      })
    })

    describe('with sorting', () => {
      it('should call formMetadata.list with provided sorting parameters', async () => {
        const page = 1
        const perPage = 10
        const sortBy = 'title'
        const order = 'asc'
        const totalItems = 3

        const documents = [
          { ...formMetadataFullDocument },
          { ...formMetadataFullDocument },
          { ...formMetadataFullDocument }
        ]

        jest
          .mocked(formMetadata.list)
          .mockResolvedValue({ documents, totalItems })

        const result = await listForms({ page, perPage, sortBy, order })

        expect(formMetadata.list).toHaveBeenCalledWith({
          page,
          perPage,
          sortBy,
          order
        })

        expect(result.data).toEqual(expect.any(Array))
        expect(result.meta.sorting).toEqual({ sortBy, order })
      })

      it('should use default sorting parameters when none are provided', async () => {
        const page = 1
        const perPage = 10
        const totalItems = 1

        const documents = [{ ...formMetadataFullDocument }]

        jest
          .mocked(formMetadata.list)
          .mockResolvedValue({ documents, totalItems })

        const result = await listForms({ page, perPage })

        expect(formMetadata.list).toHaveBeenCalledWith({
          page,
          perPage,
          sortBy: 'updatedAt',
          order: 'desc'
        })

        expect(result.data).toEqual(expect.any(Array))
        expect(result.meta.sorting).toEqual({
          sortBy: 'updatedAt',
          order: 'desc'
        })
      })
    })

    it('should handle default pagination parameters', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataFullDocument],
        totalItems: 1
      })

      const result = await listForms({
        page: defaultPage,
        perPage: defaultPerPage
      })

      expect(formMetadata.list).toHaveBeenCalledWith({
        page: defaultPage,
        perPage: defaultPerPage,
        sortBy: 'updatedAt',
        order: 'desc'
      })
      expect(result.meta.pagination).toEqual({
        page: defaultPage,
        perPage: defaultPerPage,
        totalItems: 1,
        totalPages: 1
      })
    })

    it('should return correct pagination with MAX_RESULTS', async () => {
      const totalItems = MAX_RESULTS + 1

      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataFullDocument],
        totalItems
      })

      const result = await listForms({
        page: defaultPage,
        perPage: defaultPerPage
      })

      expect(result.meta.pagination).toEqual({
        page: defaultPage,
        perPage: defaultPerPage,
        totalItems,
        totalPages: 2
      })
    })

    it('should handle empty results with MAX_RESULTS', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [],
        totalItems: 0
      })

      const result = await listForms({
        page: defaultPage,
        perPage: defaultPerPage
      })

      expect(result.meta.pagination).toEqual({
        page: defaultPage,
        perPage: defaultPerPage,
        totalItems: 0,
        totalPages: 0
      })
    })

    it('should use default values when no options are provided', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue({
        documents: [formMetadataFullDocument],
        totalItems: 1
      })

      const result = await listForms({ page: 1, perPage: MAX_RESULTS })

      expect(formMetadata.list).toHaveBeenCalledWith({
        page: defaultPage,
        perPage: defaultPerPage,
        sortBy: 'updatedAt',
        order: 'desc'
      })
      expect(result.meta.pagination).toEqual({
        page: defaultPage,
        perPage: defaultPerPage,
        totalItems: 1,
        totalPages: 1
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
    const formDefinitionCustomisedTitle = actualEmptyForm()
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

      const formDefinitionCustomised = actualEmptyForm()

      await expect(
        updateDraftFormDefinition('123', formDefinitionCustomised, author)
      ).rejects.toThrow(
        Boom.badRequest(`Form with ID '123' has no draft state`)
      )
    })
  })
})

/**
 * @import { FormDefinition, FormMetadata, FormMetadataAuthor, FormMetadataDocument, FormMetadataInput, QueryResult } from '@defra/forms-model'
 * @import { WithId } from 'mongodb'
 */
