/**
 * TODO: This is a temporary solution. Once the scopes are available in the
 * model package, we should import them from there instead.
 */

/**
 * User roles
 * @enum {string}
 */
export const Roles = {
  Admin: 'admin',
  FormCreator: 'form-creator'
}

/**
 * Permission scopes
 * @enum {string}
 */
export const Scopes = {
  FormDelete: 'form-delete',
  FormEdit: 'form-edit',
  FormRead: 'form-read',
  FormPublish: 'form-publish'
}

/**
 * Role to scopes mapping
 * Admin: All form management permissions (backward compatibility with editor group)
 * FormCreator: Limited form management permissions (no publish capability)
 */
export const RoleScopes = {
  [Roles.Admin]: Object.values(Scopes),
  [Roles.FormCreator]: [Scopes.FormRead, Scopes.FormEdit, Scopes.FormDelete]
}

/**
 * Get scopes for a given role
 * @param {string} role - The user's role
 * @returns {string[]} Array of scopes for the role
 */
export function getScopesForRole(role) {
  return RoleScopes[role] ?? []
}
