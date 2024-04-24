import { ObjectId } from 'mongodb'

import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/form-metadata-repository.js'
import { createForm } from '~/src/api/forms/service.js'
import * as formTemplates from '~/src/api/forms/templates.js'

jest.mock('~/src/api/forms/form-definition-repository.js')
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

    jest.mocked(formTemplates.empty).mockReturnValue(actualEmptyForm())
    jest.mocked(formDefinition.create).mockResolvedValue()
    jest.mocked(formMetadata.create).mockResolvedValue({
      acknowledged: true,
      insertedId: new ObjectId(id)
    })
  })

  test('should create a new form', async () => {
    const formConfigurationInput = {
      title: 'Test form',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk'
    }

    const expectedFormConfigurationOutput = {
      id,
      slug: 'test-form',
      title: 'Test form',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk'
    }

    await expect(createForm(formConfigurationInput)).resolves.toEqual(
      expectedFormConfigurationOutput
    )
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
      slug: 'a-super-duper-form-from-defra',
      title: 'A !Super! Duper Form -    from Defra...',
      organisation: 'Defra',
      teamName: 'Defra Forms',
      teamEmail: 'defraforms@defra.gov.uk'
    }

    await expect(createForm(formConfigurationInput)).resolves.toEqual(
      expectedFormConfigurationOutput
    )
  })

  it('should throw an error when schema validation fails', async () => {
    // @ts-expect-error - Allow invalid form definition for test
    jest.mocked(formTemplates.empty).mockReturnValueOnce({})

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
    jest.mocked(formMetadata.create).mockRejectedValueOnce(new Error())

    const formConfiguration = {
      title: 'My Form',
      organisation: '',
      teamName: '',
      teamEmail: ''
    }

    await expect(createForm(formConfiguration)).rejects.toThrow(Error)
  })

  it('should throw an error when writing form def fails', async () => {
    jest.mocked(formDefinition.create).mockRejectedValueOnce(new Error())

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
 * @typedef {import('../types.js').FormConfigurationInput} FormConfigurationInput
 */
