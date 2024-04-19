import { ObjectId } from 'mongodb'

import { emptyForm } from '~/src/api/forms/empty-form.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import { create as formDefinitionCreate } from '~/src/api/forms/form-definition-repository.js'
import { create as formMetadataCreate } from '~/src/api/forms/form-metadata-repository.js'
import { createForm } from '~/src/api/forms/service.js'

jest.mock('~/src/api/forms/form-definition-repository.js')
jest.mock('~/src/api/forms/form-metadata-repository.js')
jest.mock('~/src/api/forms/empty-form.js')

const id = '661e4ca5039739ef2902b214'
const actualEmptyForm = jest.requireActual('~/src/api/forms/empty-form.js')
const mockFormMetadataImpl = (/** @type {FormConfigurationInput} */ input) => {
  const objId = new ObjectId(id)

  // Assign an _id property to the
  // input like the MongoClient would
  Object.assign(input, { _id: id })

  return Promise.resolve({
    acknowledged: true,
    insertedId: objId
  })
}

beforeEach(() => {
  jest.resetAllMocks()
})

/**
 * Creates a new test form
 * @param {FormConfigurationInput} formConfigurationInput - the input request
 * @returns {Promise<FormConfiguration>} - the output form
 */
async function runFormCreationTest(formConfigurationInput) {
  jest.mocked(emptyForm).mockReturnValueOnce(actualEmptyForm.emptyForm())
  jest.mocked(formMetadataCreate).mockImplementationOnce(mockFormMetadataImpl)

  // @ts-expect-error unused response type so ignore type for now
  jest.mocked(formDefinitionCreate).mockResolvedValueOnce(Promise.resolve())

  return createForm(formConfigurationInput)
}

describe('createForm', () => {
  test('should create a new form', async () => {
    const formConfigurationInput = {
      title: 'Test form',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk'
    }

    const expectedFormConfigurationOutput = {
      id,
      linkIdentifier: 'test-form',
      title: 'Test form',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk'
    }

    const result = await runFormCreationTest(formConfigurationInput)

    expect(result).toEqual(expectedFormConfigurationOutput)
  })

  test('should create a new form without special characters in the name', async () => {
    const formConfigurationInput = {
      title: 'A !Super! Duper Form -    from Defra...',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk'
    }

    const expectedFormConfigurationOutput = {
      id,
      linkIdentifier: 'a-super-duper-form-from-defra',
      title: 'A !Super! Duper Form -    from Defra...',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk'
    }

    const result = await runFormCreationTest(formConfigurationInput)

    expect(result).toEqual(expectedFormConfigurationOutput)
  })

  it('should throw an error when schema validation fails', async () => {
    jest.mocked(emptyForm).mockReturnValueOnce({})
    jest.mocked(formMetadataCreate).mockImplementationOnce(mockFormMetadataImpl)
    // @ts-expect-error unused response type so ignore type for now
    jest.mocked(formDefinitionCreate).mockResolvedValueOnce(Promise.resolve())

    const formConfiguration = {
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    await expect(createForm(formConfiguration)).rejects.toThrow(
      InvalidFormDefinitionError
    )
  })

  it('should throw an error when writing for metadata fails', async () => {
    jest.mocked(emptyForm).mockReturnValueOnce(actualEmptyForm.emptyForm())
    jest.mocked(formMetadataCreate).mockImplementation(() => {
      throw new Error()
    })
    // @ts-expect-error unused response type so ignore type for now
    jest.mocked(formDefinitionCreate).mockResolvedValueOnce(Promise.resolve())

    const formConfiguration = {
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    await expect(createForm(formConfiguration)).rejects.toThrow(Error)
  })

  it('should throw an error when writing form def fails', async () => {
    jest.mocked(emptyForm).mockReturnValueOnce(actualEmptyForm.emptyForm())
    jest.mocked(formMetadataCreate).mockImplementationOnce(mockFormMetadataImpl)
    jest.mocked(formDefinitionCreate).mockImplementation(() => {
      throw new Error()
    })

    const formConfiguration = {
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    await expect(createForm(formConfiguration)).rejects.toThrow(Error)
  })
})

/**
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 * @typedef {import('../types.js').FormConfigurationInput} FormConfigurationInput
 */
