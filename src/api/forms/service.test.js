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
  updateDraftFormDefinition
} from '~/src/api/forms/service.js'
import * as formTemplates from '~/src/api/forms/templates.js'

jest.mock('~/src/api/forms/draft-form-definition-repository.js')
jest.mock('~/src/api/forms/form-metadata-repository.js')
jest.mock('~/src/api/forms/templates.js')

const { empty: actualEmptyForm } = /** @type {typeof formTemplates} */ (
  jest.requireActual('~/src/api/forms/templates.js')
)

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
        updatedAt: expect.any(Date)
      }
    }

    await expect(createForm(formMetadataInput)).resolves.toEqual(
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
        updatedAt: expect.any(Date)
      }
    }

    await expect(createForm(formMetadataInput)).resolves.toEqual(
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

    await expect(createForm(formMetadataInput)).rejects.toThrow(
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

    await expect(createForm(formMetadataInput)).rejects.toThrow(Error)
  })

  it('should throw an error when writing form def fails', async () => {
    jest.mocked(draftFormDefinition.create).mockRejectedValueOnce(new Error())

    const formMetadataInput = {
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    await expect(createForm(formMetadataInput)).rejects.toThrow(Error)
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
