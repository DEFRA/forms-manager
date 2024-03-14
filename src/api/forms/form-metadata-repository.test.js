import { readdir, readFile } from 'node:fs/promises'

import { listForms } from './form-metadata-repository.js'

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

    expect(result).toEqual([
      JSON.parse(form1Metadata),
      JSON.parse(form2Metadata)
    ])
    expect(readdir).toHaveBeenCalledWith(formDirectory)
    expect(readFile).toHaveBeenCalledWith(
      formDirectory + '/form1-metadata.json'
    )
    expect(readFile).toHaveBeenCalledWith(
      formDirectory + '/form2-metadata.json'
    )
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

    expect(result).toEqual([{ id: 'form1', name: 'Form 1' }])
    expect(readdir).toHaveBeenCalledWith(formDirectory)
    expect(readFile).toHaveBeenCalledWith(
      formDirectory + '/form1-metadata.json'
    )
    expect(readFile).not.toHaveBeenCalledWith(
      formDirectory + '/form2-metadata.json'
    )
  })
})
