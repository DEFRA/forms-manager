import fs from 'fs/promises'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const managerUrl = 'https://forms-manager.prod.cdp-int.defra.cloud'

/**
 * @param {string} url
 */
const getJson = async (url) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (await fetch(url)).json()
}

/**
 * @param {string} url
 * @returns {Promise<{ data: FormMetadata[] }>}
 */
const getMetadatas = async (url) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return getJson(url)
}

/**
 * @param {string} url
 * @returns {Promise<FormDefinition>}
 */
const getDefinition = async (url) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return getJson(url)
}

/**
 * @param {FormMetadata} metadata
 * @param {number} index
 * @param {FormMetadata[]} metadatas
 */
const getFormData = async (metadata, index, metadatas) => {
  // eslint-disable-next-line no-console
  console.log(`${index + 1} of ${metadatas.length}`)

  const { id } = metadata
  const draft = metadata.draft
    ? await getDefinition(`${managerUrl}/forms/${id}/definition/draft`)
    : undefined

  const live = metadata.live
    ? await getDefinition(`${managerUrl}/forms/${id}/definition`)
    : undefined

  return { id, metadata, draft, live }
}

await fs.rm(`${__dirname}forms`, { recursive: true, force: true })
await fs.mkdir(`${__dirname}forms`)

const { data: forms } = await getMetadatas(`${managerUrl}/forms?perPage=100`)

const responses = await Promise.all(forms.map(getFormData))

for (const res of responses) {
  const { id } = res

  await fs.writeFile(
    `${__dirname}forms/${id}.json`,
    JSON.stringify(res, null, 2),
    'utf8'
  )
}

/**
 * @import { FormMetadata, FormDefinition } from '@defra/forms-model'
 */
