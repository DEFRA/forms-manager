import Boom from '@hapi/boom'

/**
 * Get the author from the auth credentials
 * @param {UserCredentials & OidcStandardClaims} [user]
 * @returns {FormMetadataAuthor}
 */
export function getAuthor(user) {
  if (!user || !user.oid || !user.name) {
    throw Boom.unauthorized(
      'Failed to get the author. User is undefined or has a malformed/missing oid/name.'
    )
  }

  const displayName =
    user.given_name && user.family_name
      ? `${user.given_name} ${user.family_name}`
      : user.name

  return {
    id: user.oid,
    displayName
  }
}

/**
 * @import { FormMetadataAuthor } from '@defra/forms-model'
 * @import { UserCredentials } from '@hapi/hapi'
 * @import { OidcStandardClaims } from 'oidc-client-ts'
 */
