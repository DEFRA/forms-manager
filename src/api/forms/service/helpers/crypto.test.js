import { encryptSecret } from '~/src/api/forms/service/helpers/crypto.js'
import { config } from '~/src/config/index.js'

jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'publicKeyForSecrets') return 'abcdef'
      return 'mock-value'
    })
  }
}))
jest.mock('node:crypto')

describe('crypto helpers', () => {
  describe('encryptSecret', () => {
    it('should throw is public key is missing', () => {
      jest.mocked(config.get).mockImplementationOnce(
        // @ts-expect-error - partial mock
        (key) => {
          if (key === 'publicKeyForSecrets') return undefined
          return 'mock-value'
        }
      )
      expect(() => encryptSecret('some-string')).toThrow(
        'Public key is missing'
      )
    })
  })
})
