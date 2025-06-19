import Boom from '@hapi/boom'
import { MongoServerError, ObjectId } from 'mongodb'
import { pino } from 'pino'

import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  formMetadataDocument,
  formMetadataInput,
  formMetadataOutput,
  formMetadataWithLiveDocument
} from '~/src/api/forms/service/__stubs__/service.js'
import {
  getFormDefinition,
  updateDraftFormDefinition
} from '~/src/api/forms/service/definition.js'
import {
  createForm,
  getFormBySlug,
  removeForm,
  updateFormMetadata
} from '~/src/api/forms/service/index.js'
import * as formTemplates from '~/src/api/forms/templates.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { prepareDb } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/api/forms/templates.js')
jest.mock('~/src/mongo.js')

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))

const { empty: emptyFormWithSummary } = /** @type {typeof formTemplates} */ (
  jest.requireActual('~/src/api/forms/templates.js')
)
const { emptyV2: emptyFormWithSummaryV2 } =
  /** @type {typeof formTemplates} */ (
    jest.requireActual('~/src/api/forms/templates.js')
  )
const author = getAuthor()

describe('Forms service', () => {
  const id = '661e4ca5039739ef2902b214'
  const slug = 'test-form'
  const dateUsedInFakeTime = new Date('2020-01-01')

  let definition = emptyFormWithSummary()
  const definitionV2 = emptyFormWithSummaryV2()

  beforeAll(async () => {
    await prepareDb(pino())
  })

  beforeEach(() => {
    definition = emptyFormWithSummary()
    jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
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

  describe('createForm', () => {
    beforeEach(() => {
      jest.mocked(formDefinition.update).mockResolvedValue()
      jest.mocked(formTemplates.emptyV2).mockReturnValue(definitionV2)
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
      jest.mocked(formTemplates.emptyV2).mockReturnValueOnce({})

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
      jest.mocked(formDefinition.update).mockRejectedValueOnce(new Error())

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

  describe('updateFormMetadata', () => {
    beforeEach(() => {
      jest.mocked(formMetadata.update).mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null
      })
      jest.mocked(formDefinition.get).mockResolvedValue(definition)
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

  describe('updateFormMetadataV2', () => {
    beforeEach(() => {
      jest.mocked(formMetadata.update).mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null
      })
      jest.mocked(formDefinition.get).mockResolvedValue(definitionV2)
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
})
