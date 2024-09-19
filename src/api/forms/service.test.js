import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'
import { pino } from 'pino'

import { makeFormLiveErrorMessages } from '~/src/api/forms/constants.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  createForm,
  getFormDefinition,
  createLiveFromDraft,
  createDraftFromLive,
  updateDraftFormDefinition,
  removeForm,
  updateFormMetadata,
  listForms
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

    test("should throw bad request if there's no live definition", async () => {
      jest.mocked(formMetadata.get).mockResolvedValueOnce(formMetadataDocument)

      await expect(createDraftFromLive(id, author)).rejects.toThrow(
        Boom.badRequest(
          `Form with ID '${formMetadataWithLiveDocument._id.toString()}' has no live state`
        )
      )
    })

    test('should update the form state when creating', async () => {
      jest
        .mocked(formMetadata.get)
        .mockResolvedValue(formMetadataWithLiveDocument)

      const dbSpy = jest.spyOn(formMetadata, 'update')

      await createDraftFromLive(id, author)

      const dbOperationArgs = dbSpy.mock.calls[0]

      expect(dbSpy).toHaveBeenCalled()
      expect(dbOperationArgs[0]).toBe(id)
      expect(dbOperationArgs[1].$set).toMatchObject({
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

    test('should create a live state from existing draft form', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce({
        ...definition,
        outputEmail: 'test@defra.gov.uk'
      })
      await expect(createLiveFromDraft(id, author)).resolves.toBeUndefined()
    })

    test('should check if form update DB operation is called with correct form data', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce({
        ...definition,
        outputEmail: 'test@defra.gov.uk'
      })

      const dbSpy = jest.spyOn(formMetadata, 'update')

      await createLiveFromDraft('123', author)

      const dbOperationArgs = dbSpy.mock.calls[0]

      expect(dbSpy).toHaveBeenCalled()
      expect(dbOperationArgs[0]).toBe('123')
      expect(dbOperationArgs[1].$set?.live).toEqual({
        createdAt: dateUsedInFakeTime,
        createdBy: author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
      expect(dbOperationArgs[1].$set?.updatedAt).toEqual(dateUsedInFakeTime)
      expect(dbOperationArgs[1].$set?.updatedBy).toEqual(author)
    })

    test('should fail to create a live state from existing draft form when there is no start page', async () => {
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

    test('should fail to create a live state from existing draft form when there is no output email', async () => {
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

    test('should fail to create a live state from existing draft form when there is no contact', async () => {
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

    test('should fail to create a live state from existing draft form when there is no submission guidance', async () => {
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

    test('should fail to create a live state from existing draft form when there is no privacy notice url', async () => {
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

    test.each(slugExamples)(`should return slug '$output'`, async (slugIn) => {
      const input = {
        ...formMetadataInput,
        title: slugIn.input
      }

      await expect(updateFormMetadata(id, input, author)).resolves.toEqual(
        slugIn.output
      )
    })

    test('should update slug when title is updated', async () => {
      const input = {
        title: 'new title'
      }

      jest.mocked(formMetadata.get).mockResolvedValueOnce(formMetadataDocument)

      const dbSpy = jest.spyOn(formMetadata, 'update')

      const updatedSlug = await updateFormMetadata(id, input, author)
      expect(updatedSlug).toBe('new-title')

      const dbOperationArgs = dbSpy.mock.calls[0]

      expect(dbSpy).toHaveBeenCalled()
      expect(dbOperationArgs[0]).toBe('661e4ca5039739ef2902b214')
      expect(dbOperationArgs[1].$set?.slug).toBe('new-title')
      expect(dbOperationArgs[1].$set?.updatedBy).toEqual(author)
      expect(dbOperationArgs[1].$set?.updatedAt).toEqual(dateUsedInFakeTime)
    })

    test('should update organisation and return existing slug', async () => {
      const input = {
        organisation: 'new organisation'
      }

      jest.mocked(formMetadata.get).mockResolvedValueOnce(formMetadataDocument)

      const slugAfterUpdate = await updateFormMetadata(id, input, author)
      expect(slugAfterUpdate).toBe('test-form')
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
      const error = Boom.notFound(
        `Form with ID '123' is live so 'title' cannot be updated`
      )

      jest
        .mocked(formMetadata.get)
        .mockResolvedValueOnce(formMetadataWithLiveDocument)

      await expect(
        updateFormMetadata('123', formMetadataInput, author)
      ).rejects.toThrow(error)
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

    test('should create a new form', async () => {
      await expect(createForm(formMetadataInput, author)).resolves.toEqual(
        formMetadataOutput
      )
    })

    test('should check if form create DB operation is called with correct form data', async () => {
      const dbSpy = jest.spyOn(formMetadata, 'create')

      await createForm(formMetadataInput, author)

      const dbOperationArgs = dbSpy.mock.calls[0][0]

      expect(dbSpy).toHaveBeenCalled()
      expect(dbOperationArgs.createdAt).toEqual(dateUsedInFakeTime)
      expect(dbOperationArgs.createdBy).toEqual(author)
      expect(dbOperationArgs.updatedBy).toEqual(author)
      expect(dbOperationArgs.updatedAt).toEqual(dateUsedInFakeTime)
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

  describe('updateDraftFormDefinition', () => {
    const formDefinitionCustomisedTitle = actualEmptyForm()
    formDefinitionCustomisedTitle.name =
      "A custom form name that shouldn't be allowed"

    it('should update the draft form definition with required attributes upon creation', async () => {
      await updateDraftFormDefinition(
        '123',
        formDefinitionCustomisedTitle,
        author
      )

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
  })

  describe('removeForm', () => {
    test('should succeed if both operations succeed', async () => {
      jest.mocked(formMetadata.remove).mockResolvedValueOnce()
      jest.mocked(formDefinition.remove).mockResolvedValueOnce()

      await expect(removeForm(id)).resolves.toBeUndefined()
    })

    test('should fail if form metadata remove fails', async () => {
      jest.mocked(formMetadata.remove).mockRejectedValueOnce('unknown error')
      jest.mocked(formDefinition.remove).mockResolvedValueOnce()

      await expect(removeForm(id)).rejects.toBeDefined()
    })

    test('should fail if form definition remove fails', async () => {
      jest.mocked(formMetadata.remove).mockResolvedValueOnce()
      jest.mocked(formDefinition.remove).mockRejectedValueOnce('unknown error')

      await expect(removeForm(id)).rejects.toBeDefined()
    })

    test('should fail if the form is live but not being force deleted', async () => {
      jest
        .mocked(formMetadata.get)
        .mockResolvedValueOnce(formMetadataWithLiveDocument)

      await expect(removeForm(id)).rejects.toBeDefined()
    })

    test('should succeed if the form is live and being force deleted', async () => {
      jest
        .mocked(formMetadata.get)
        .mockResolvedValueOnce(formMetadataWithLiveDocument)

      await expect(removeForm(id, true)).resolves.toBeUndefined()
    })

    test('should succeed if form definition deletion fails and the form is being force deleted', async () => {
      jest
        .mocked(formMetadata.get)
        .mockResolvedValueOnce(formMetadataWithLiveDocument)

      jest.mocked(formDefinition.remove).mockRejectedValueOnce('unknown error')

      await expect(removeForm(id, true)).resolves.toBeUndefined()
    })
  })

  describe('listForms', () => {
    const formDate = new Date('2024-01-26T00:00:00Z')
    const liveDate = new Date('2024-02-26T00:00:00Z')
    const draftDate = new Date('2024-03-26T00:00:00Z')
    const defaultDate = new Date('2024-06-25T23:00:00Z')

    const formAuthor = { displayName: 'Joe Bloggs', id: '1' }
    const liveAuthor = { displayName: 'Jane Doe', id: '2' }
    const draftAuthor = { displayName: 'Enrique Chase', id: '3' }
    const defaultAuthor = { displayName: 'Unknown', id: '-1' }

    /**
     * @satisfies {WithId<Partial<FormMetadataDocument>>}
     */
    const formMetadataBaseDocument = {
      ...formMetadataInput,
      _id: new ObjectId(id),
      slug: formMetadataOutput.slug
    }

    /**
     * @satisfies {WithId<Partial<FormMetadataDocument>>}
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
     * @satisfies {WithId<Partial<FormMetadataDocument>>}
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
     * @satisfies {WithId<Partial<FormMetadataDocument>>}
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
     * @satisfies {WithId<Partial<FormMetadataDocument>>}
     */
    const formMetadataFullDocument = {
      ...formMetadataDraftDocument,
      createdAt: formDate,
      createdBy: formAuthor,
      updatedAt: formDate,
      updatedBy: formAuthor
    }

    test('should handle the full set of states', async () => {
      jest
        .mocked(formMetadata.list)
        .mockResolvedValue([formMetadataFullDocument])

      await expect(listForms()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            updatedAt: formDate,
            updatedBy: formAuthor,
            createdAt: formDate,
            createdBy: formAuthor
          })
        ])
      )
    })

    test('should handle states when root state info is missing and live is present', async () => {
      jest
        .mocked(formMetadata.list)
        .mockResolvedValue([formMetadataDraftDocument])

      await expect(listForms()).resolves.toEqual(
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

    test('should handle states when draft state info is missing', async () => {
      jest
        .mocked(formMetadata.list)
        .mockResolvedValue([formMetadataLiveDocument])

      await expect(listForms()).resolves.toEqual(
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

    test('should handle states when live state info is missing', async () => {
      jest
        .mocked(formMetadata.list)
        .mockResolvedValue([formMetadataDraftNoLiveDocument])

      await expect(listForms()).resolves.toEqual(
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

    test('should handle states when all states are missing', async () => {
      jest
        .mocked(formMetadata.list)
        .mockResolvedValue([formMetadataBaseDocument])

      await expect(listForms()).resolves.toEqual(
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

    test('throws if forms are malformed', async () => {
      jest.mocked(formMetadata.list).mockResolvedValue([
        {
          _id: new ObjectId(id)
          // skip required attributes. This should never happen.
        }
      ])

      await expect(listForms()).rejects.toThrow(
        'Form is malformed in the database. Expected fields are missing.'
      )
    })
  })
})

/**
 * @import { FormDefinition, FormMetadata, FormMetadataAuthor, FormMetadataDocument, FormMetadataInput } from '@defra/forms-model'
 * @import { WithId } from 'mongodb'
 */
