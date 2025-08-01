import { buildDefinition } from '@defra/forms-model/stubs'

import { saveToS3 } from '~/src/messaging/s3.js'

describe('s3', () => {
  describe('saveToS3', () => {
    it('should return an object', async () => {
      const definition = buildDefinition()
      const result = await saveToS3(definition)
      expect(result).toBeUndefined()
    })
  })
})
