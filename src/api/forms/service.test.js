import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'
import { pino } from 'pino'

import { makeFormLiveErrorMessages } from './constants.js'

import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  createForm,
  getFormDefinition,
  createLiveFromDraft,
  updateDraftFormDefinition,
  removeForm,
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

const { empty: actualEmptyForm } = /** @type {typeof formTemplates} */ (
  jest.requireActual('~/src/api/forms/templates.js')
)

describe('Forms service', () => {
  const id = '661e4ca5039739ef2902b214'
  const slug = 'test-form'

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
    teamEmail: 'defraforms@defra.gov.uk'
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
      const draftDefinitionNoStartPage = /** @type {FormDefinition} */ (
        definition
      )
      delete draftDefinitionNoStartPage.outputEmail

      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(draftDefinitionNoStartPage)

      await expect(createLiveFromDraft(id, author)).rejects.toThrow(
        Boom.badRequest(makeFormLiveErrorMessages.missingOutputEmail)
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

      await expect(updateFormMetadata(id, input)).resolves.toEqual(
        slugIn.output
      )
    })

    test('should update slug when title is updated', async () => {
      const input = {
        title: 'new title'
      }

      jest.mocked(formMetadata.get).mockResolvedValueOnce(formMetadataDocument)

      const updatedSlug = await updateFormMetadata(id, input)
      expect(updatedSlug).toBe('new-title')
    })

    test('should update organisation and return existing slug', async () => {
      const input = {
        organisation: 'new organisation'
      }

      jest.mocked(formMetadata.get).mockResolvedValueOnce(formMetadataDocument)

      const slugAfterUpdate = await updateFormMetadata(id, input)
      expect(slugAfterUpdate).toBe('test-form')
    })

    it('should throw an error when writing for metadata fails', async () => {
      jest.mocked(formMetadata.update).mockRejectedValue(new Error('error'))

      await expect(updateFormMetadata(id, formMetadataInput)).rejects.toThrow(
        'error'
      )
    })

    it('should throw an error if form does not exist', async () => {
      const error = Boom.notFound("Form with ID '123' not found")

      jest.mocked(formMetadata.get).mockRejectedValue(error)

      await expect(
        updateFormMetadata('123', formMetadataInput)
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
        updateFormMetadata('123', formMetadataInput)
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

    test.each(slugExamples)(`should return slug '$output'`, async (slugIn) => {
      const input = {
        ...formMetadataInput,
        title: slugIn.input
      }

      await expect(updateFormMetadata(id, input)).resolves.toEqual(
        slugIn.output
      )
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

    it('should update the draft form definition with required attributes upon creation', async () => {
      const formDefinitionCustomisedTitle = actualEmptyForm()
      formDefinitionCustomisedTitle.name =
        "A custom form name that shouldn't be allowed"

      await updateDraftFormDefinition(
        '123',
        formDefinitionCustomisedTitle,
        author
      )

      expect(formDefinitionCustomisedTitle.name).toBe(
        formMetadataDocument.title
      )
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
})

/**
 * @typedef {import('@defra/forms-model').FormMetadata} FormMetadata
 * @typedef {import('@defra/forms-model').FormMetadataAuthor} FormMetadataAuthor
 * @typedef {import('@defra/forms-model').FormMetadataDocument} FormMetadataDocument
 * @typedef {import('@defra/forms-model').FormMetadataInput} FormMetadataInput
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 */

/**
 * @template {object} Schema
 * @typedef {import('mongodb').WithId<Schema>} WithId
 */
