import { ObjectId } from 'mongodb'

import * as draftFormDefinition from '~/src/api/forms/draft-form-definition-repository.js'
import {
  InvalidFormDefinitionError,
  ResourceNotFoundError
} from '~/src/api/forms/errors.js'
import * as formMetadata from '~/src/api/forms/form-metadata-repository.js'
import {
  createForm,
  getDraftFormDefinition,
  createLiveFromDraft,
  updateDraftFormDefinition
} from '~/src/api/forms/service.js'
import * as formTemplates from '~/src/api/forms/templates.js'

const authorId = 'f50ceeed-b7a4-47cf-a498-094efc99f8bc'
const authorDisplayName = 'Enrique Chase'

/**
 * @satisfies {FormMetadataAuthor}
 */
const author = { id: authorId, displayName: authorDisplayName }

jest.mock('~/src/api/forms/draft-form-definition-repository.js')
jest.mock('~/src/api/forms/form-metadata-repository.js')
jest.mock('~/src/api/forms/templates.js')

const { empty: actualEmptyForm } = /** @type {typeof formTemplates} */ (
  jest.requireActual('~/src/api/forms/templates.js')
)
describe('createLiveFromDraft', () => {
  /** @type {string} */
  let id

  beforeEach(() => {
    id = '661e4ca5039739ef2902b214'

    const formMetadataOutput = {
      _id: new ObjectId(id),
      slug: 'test-form',
      title: 'Test form',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk',
      draft: {
        createdAt: expect.any(Date),
        createdBy: author,
        updatedAt: expect.any(Date),
        updatedBy: author
      }
    }
    jest.mocked(draftFormDefinition.createLiveFromDraft).mockResolvedValue()
    jest.mocked(formMetadata.update).mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
      matchedCount: 1,
      upsertedCount: 0,
      upsertedId: null
    })
    jest.mocked(formMetadata.get).mockResolvedValue(formMetadataOutput)
  })

  test('should create a live from from draft existing form', async () => {
    await expect(createLiveFromDraft(id, author)).resolves.toBe(true)
  })
})

describe('createForm', () => {
  /** @type {string} */
  let id

  beforeEach(() => {
    id = '661e4ca5039739ef2902b214'

    jest.mocked(draftFormDefinition.create).mockResolvedValue()
    jest.mocked(formTemplates.empty).mockReturnValue(actualEmptyForm())
    jest.mocked(formMetadata.create).mockResolvedValue({
      acknowledged: true,
      insertedId: new ObjectId(id)
    })
  })

  test('should create a new form', async () => {
    const formMetadataInput = {
      title: 'Test form',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk'
    }

    const formMetadataOutput = {
      id,
      slug: 'test-form',
      title: 'Test form',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk',
      draft: {
        createdAt: expect.any(Date),
        createdBy: author,
        updatedAt: expect.any(Date),
        updatedBy: author
      }
    }

    await expect(createForm(formMetadataInput, author)).resolves.toEqual(
      formMetadataOutput
    )
  })

  test('should create a new form without special characters in the name', async () => {
    const formMetadataInput = {
      title: 'A !Super! Duper Form -    from Defra...',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk'
    }

    const formMetadataOutput = {
      id,
      slug: 'a-super-duper-form-from-defra',
      title: 'A !Super! Duper Form -    from Defra...',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk',
      draft: {
        createdAt: expect.any(Date),
        createdBy: author,
        updatedAt: expect.any(Date),
        updatedBy: author
      }
    }

    await expect(createForm(formMetadataInput, author)).resolves.toEqual(
      formMetadataOutput
    )
  })

  it('should throw an error when schema validation fails', async () => {
    // @ts-expect-error - Allow invalid form definition for test
    jest.mocked(formTemplates.empty).mockReturnValueOnce({})

    const formMetadataInput = {
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    await expect(createForm(formMetadataInput, author)).rejects.toThrow(
      InvalidFormDefinitionError
    )
  })

  it('should throw an error when writing for metadata fails', async () => {
    jest.mocked(formMetadata.create).mockRejectedValueOnce(new Error())

    const formMetadataInput = {
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    await expect(createForm(formMetadataInput, author)).rejects.toThrow(Error)
  })

  it('should throw an error when writing form def fails', async () => {
    jest.mocked(draftFormDefinition.create).mockRejectedValueOnce(new Error())

    const formMetadataInput = {
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    await expect(createForm(formMetadataInput, author)).rejects.toThrow(Error)
  })

  it('should return the form definition', async () => {
    const formDef = actualEmptyForm()

    jest.mocked(draftFormDefinition.get).mockResolvedValueOnce(formDef)

    await expect(getDraftFormDefinition('123')).resolves.toMatchObject(
      actualEmptyForm()
    )
  })

  it('should throw an error if the form associated with the definition does not exist', async () => {
    jest.mocked(draftFormDefinition.get).mockRejectedValue(new Error())

    await expect(
      updateDraftFormDefinition('123', actualEmptyForm())
    ).rejects.toThrow(ResourceNotFoundError)
  })
})

/**
 * @typedef {import('@defra/forms-model').FormMetadataAuthor} FormMetadataAuthor
 */
