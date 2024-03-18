import { createFormDefinition } from './form-definition-repository.js'
import { exists, createFormMetadata } from './form-metadata-repository.js'
import { createForm } from './service.js'

jest.mock('./form-definition-repository.js')
jest.mock('./form-metadata-repository.js')

beforeEach(() => {
  jest.resetAllMocks()
})

/**
 * Creates a new test form
 * @param {import('../types.js').FormConfigurationInput} formConfigurationInput - the input request
 * @returns {Promise<FormConfiguration>} - the output form
 */
async function runFormCreationTest(formConfigurationInput) {
  jest.mocked(exists).mockResolvedValueOnce(false)
  jest.mocked(createFormMetadata).mockResolvedValueOnce(Promise.resolve())
  jest.mocked(createFormDefinition).mockResolvedValueOnce(Promise.resolve())

  return createForm(formConfigurationInput)
}

describe('createForm', () => {
  test('should create a new form', async () => {
    const formConfigurationInput = {
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    const expectedFormConfigurationOutput = {
      id: 'my-form',
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    const result = await runFormCreationTest(formConfigurationInput)

    expect(result).toEqual(expectedFormConfigurationOutput)
  })

  test('should create a new form without special characters in the name', async () => {
    const formConfigurationInput = {
      title: 'A !Super! Duper Form -    from Defra...',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    const expectedFormConfigurationOutput = {
      id: 'a-super-duper-form-from-defra',
      title: 'A !Super! Duper Form -    from Defra...',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    const result = await runFormCreationTest(formConfigurationInput)

    expect(result).toEqual(expectedFormConfigurationOutput)
  })

  it('should throw an error if form ID is manually set', async () => {
    jest.mocked(exists).mockResolvedValueOnce(true)
    jest.mocked(createFormMetadata).mockResolvedValueOnce(Promise.resolve())
    jest.mocked(createFormDefinition).mockResolvedValueOnce(Promise.resolve())

    const formConfiguration = {
      id: 'my-form',
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    await expect(createForm(formConfiguration)).rejects.toThrow(
      'Form ID cannot be manually set. Please remove this field.'
    )
  })

  it('should throw an error if form with the same ID already exists', async () => {
    jest.mocked(exists).mockResolvedValueOnce(true)
    jest.mocked(createFormMetadata).mockResolvedValueOnce(Promise.resolve())
    jest.mocked(createFormDefinition).mockResolvedValueOnce(Promise.resolve())

    const formConfiguration = {
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    await expect(createForm(formConfiguration)).rejects.toThrow(
      `Form with ID my-form already exists`
    )
  })
})

/**
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 */
