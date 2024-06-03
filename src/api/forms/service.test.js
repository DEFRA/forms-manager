import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

import * as draftFormDefinition from '~/src/api/forms/draft-form-definition-repository.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formMetadata from '~/src/api/forms/form-metadata-repository.js'
import {
  createForm,
  getFormDefinition,
  createLiveFromDraft,
  updateDraftFormDefinition
} from '~/src/api/forms/service.js'
import * as formTemplates from '~/src/api/forms/templates.js'

jest.mock('~/src/api/forms/draft-form-definition-repository.js')
jest.mock('~/src/api/forms/form-metadata-repository.js')
jest.mock('~/src/api/forms/templates.js')

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
    }
  }

  /**
   * @satisfies {WithId<FormMetadataDocument>}
   */
  const formMetadataDocument = {
    ...formMetadataInput,
    _id: new ObjectId(id),
    slug: formMetadataOutput.slug,
    draft: formMetadataOutput.draft
  }

  const formDefinition = actualEmptyForm()

  beforeEach(() => {
    jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
  })

  describe('createLiveFromDraft', () => {
    beforeEach(() => {
      jest.mocked(draftFormDefinition.createLiveFromDraft).mockResolvedValue()
      jest.mocked(formMetadata.update).mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null
      })
    })

    test('should create a live state from existing draft form', async () => {
      await expect(createLiveFromDraft(id, author)).resolves.toBeUndefined()
    })
  })

  describe('createForm', () => {
    beforeEach(() => {
      jest.mocked(draftFormDefinition.create).mockResolvedValue()
      jest.mocked(formTemplates.empty).mockReturnValue(formDefinition)
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

    test('should create a new form without special characters in the name', async () => {
      const input = {
        ...formMetadataInput,
        title: 'A !Super! Duper Form -    from Defra...'
      }

      const output = {
        ...formMetadataOutput,
        slug: 'a-super-duper-form-from-defra',
        title: 'A !Super! Duper Form -    from Defra...'
      }

      await expect(createForm(input, author)).resolves.toEqual(output)
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
      jest.mocked(draftFormDefinition.create).mockRejectedValueOnce(new Error())

      const input = {
        ...formMetadataInput,
        organisation: '',
        teamName: '',
        teamEmail: ''
      }

      await expect(createForm(input, author)).rejects.toThrow()
    })

    it('should return the form definition', async () => {
      jest.mocked(draftFormDefinition.get).mockResolvedValueOnce(formDefinition)

      await expect(getFormDefinition('123')).resolves.toMatchObject(
        formDefinition
      )
    })

    it('should throw an error if the form associated with the definition does not exist', async () => {
      jest.mocked(draftFormDefinition.get).mockRejectedValue(new Error())

      await expect(
        updateDraftFormDefinition('123', formDefinition, author)
      ).rejects.toThrow(Boom.notFound("Form with ID '123' not found"))
    })
  })
})

/**
 * @typedef {import('@defra/forms-model').FormMetadata} FormMetadata
 * @typedef {import('@defra/forms-model').FormMetadataAuthor} FormMetadataAuthor
 * @typedef {import('@defra/forms-model').FormMetadataDocument} FormMetadataDocument
 * @typedef {import('@defra/forms-model').FormMetadataInput} FormMetadataInput
 */

/**
 * @template {object} Schema
 * @typedef {import('mongodb').WithId<Schema>} WithId
 */
