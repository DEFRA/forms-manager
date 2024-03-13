import { readdir, readFile } from 'node:fs/promises'

import { listForms, getFormMetadata } from './form-metadata-repository.js'

const formDirectory = '/path/to/dummy/directory'

jest.mock('node:fs/promises')
jest.mock('~/src/config', () => ({
  config: {
    get: jest.fn(() => formDirectory)
  }
}))

describe('#listForms', () => {
  test('Should return an empty array if no forms found', async () => {
    jest.mocked(readdir).mockResolvedValue([])

    const result = await listForms(formDirectory)

    expect(result).toEqual([])
  })

  test('Should return an array of form metadata', async () => {
    const files = ['form1-metadata.json', 'form2-metadata.json']

    const form1Metadata = JSON.stringify({ id: 'form1', name: 'Form 1' })
    const form2Metadata = JSON.stringify({ id: 'form2', name: 'Form 2' })

    jest.mocked(readFile).mockResolvedValue(form1Metadata)
    jest.mocked(readFile).mockResolvedValue(form2Metadata)

    jest.mocked(readdir).mockResolvedValue(files)
    jest.mocked(readFile).mockResolvedValueOnce(form1Metadata)
    jest.mocked(readFile).mockResolvedValueOnce(form2Metadata)

    const result = await listForms(formDirectory)

    expect(result.length).toEqual(2)
    expect(result[0].id).toEqual('form1')
    expect(result[1].id).toEqual('form2')
  })

  test('Should ignore files without "-metadata.json" suffix', async () => {
    const files = ['form1-metadata.json', 'form2.json']

    jest.mocked(readdir).mockResolvedValue(files)
    jest.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        id: 'form1',
        name: 'Form 1'
      })
    )

    const result = await listForms(formDirectory)

    expect(result.length).toEqual(1)
    expect(result[0].id).toEqual('form1')
  })
})

describe('#getFormMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('Should return the form metadata', async () => {
    const formId = 'form1'
    const formMetadataFilename = formDirectory + '/form1-metadata.json'
    const formMetadata = '{ "id": "form1", "name": "Form 1" }'

    readFile.mockResolvedValueOnce(formMetadata)

    const result = await getFormMetadata(formId)

    expect(result).toEqual(JSON.parse(formMetadata))
    expect(readFile).toHaveBeenCalledWith(formMetadataFilename)
  })

  test('Should throw an error if form malformed', async () => {
    const formId = 'form1'
    const formMetadata = '{ {{{{'

    readFile.mockResolvedValueOnce(formMetadata)

    await expect(getFormMetadata(formId)).rejects.toThrow(SyntaxError)
  })
})
