import Boom from '@hapi/boom'

import { getAuthor } from '~/src/helpers/get-author.js'

describe('getAuthor', () => {
  describe('when user has valid credentials', () => {
    it('should return author with combined given and family name when available', () => {
      const user = {
        oid: '86758ba9-92e7-4287-9751-7705e449688e',
        name: 'Enrique Chase (Defra)',
        given_name: 'Enrique',
        family_name: 'Chase'
      }

      const result = getAuthor(user)

      expect(result).toEqual({
        id: '86758ba9-92e7-4287-9751-7705e449688e',
        displayName: 'Enrique Chase'
      })
    })

    it('should return author with name when given/family names not available', () => {
      const user = {
        oid: '86758ba9-92e7-4287-9751-7705e449688e',
        name: 'Enrique Chase (Defra)'
      }

      const result = getAuthor(user)

      expect(result).toEqual({
        id: '86758ba9-92e7-4287-9751-7705e449688e',
        displayName: 'Enrique Chase (Defra)'
      })
    })
  })

  describe('when user has invalid credentials', () => {
    it('should throw unauthorised when user is undefined', () => {
      expect(() => getAuthor(undefined)).toThrow(
        Boom.unauthorized(
          'Failed to get the author. User is undefined or has a malformed/missing oid/name.'
        )
      )
    })

    it('should throw unauthorised when oid is missing', () => {
      const user = {
        name: 'Enrique Chase (Defra)'
      }

      expect(() => getAuthor(user)).toThrow(
        Boom.unauthorized(
          'Failed to get the author. User is undefined or has a malformed/missing oid/name.'
        )
      )
    })

    it('should throw unauthorised when name is missing', () => {
      const user = {
        oid: '86758ba9-92e7-4287-9751-7705e449688e'
      }

      expect(() => getAuthor(user)).toThrow(
        Boom.unauthorized(
          'Failed to get the author. User is undefined or has a malformed/missing oid/name.'
        )
      )
    })
  })
})

/**
 * @import { UserCredentials } from '@hapi/hapi'
 * @import { OidcStandardClaims } from 'oidc-client-ts'
 */
