import { readFile } from 'node:fs/promises'

import { InvalidFormDefinitionError } from './errors.js'
import { createFormDefinition } from './form-definition-repository.js'
import { exists, createFormMetadata } from './form-metadata-repository.js'
import { createForm } from './service.js'

jest.mock('node:fs/promises')
jest.mock('./form-definition-repository.js')
jest.mock('./form-metadata-repository.js')

beforeEach(() => {
  jest.resetAllMocks()
})

/**
 * Creates a new test form
 * @param {FormConfigurationInput} formConfigurationInput - the input request
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
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(Promise.resolve(getValidFormDefinition()))

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
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(Promise.resolve(getValidFormDefinition()))

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

  it('should throw an error if form with the same ID already exists', async () => {
    jest.mocked(exists).mockResolvedValueOnce(true)
    jest.mocked(createFormMetadata).mockResolvedValueOnce(Promise.resolve())
    jest.mocked(createFormDefinition).mockResolvedValueOnce(Promise.resolve())
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(Promise.resolve(getValidFormDefinition()))

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

  it('should throw an error when schema validation fails', async () => {
    jest.mocked(exists).mockResolvedValueOnce(false)
    jest.mocked(createFormMetadata).mockResolvedValueOnce(Promise.resolve())
    jest.mocked(createFormDefinition).mockResolvedValueOnce(Promise.resolve())
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(Promise.resolve(getInvalidFormDefinition()))

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
})

/**
 * Returns a form definition that is valid
 * @returns {Buffer} - the valid form definition
 */
function getValidFormDefinition() {
  return Buffer.from(
    `{
      "name": "",
      "startPage": "/page-one",
      "pages": [
        {
          "path": "/page-one",
          "title": "Page one",
          "components": [
            {
              "type": "TextField",
              "name": "textField",
              "title": "This is your first field",
              "hint": "Help text",
              "options": {},
              "schema": {}
            }
          ]
        }
      ],
      "conditions": [],
      "sections": [],
      "lists": []
    }`,
    'utf-8'
  )
}

/**
 * Returns a form definition that is not valid
 * @returns {Buffer} - the valid form definition
 */
function getInvalidFormDefinition() {
  return Buffer.from(
    `{
      "name": ""
    }`,
    'utf-8'
  )
}

/**
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 * @typedef {import('../types.js').FormConfigurationInput} FormConfigurationInput
 */
