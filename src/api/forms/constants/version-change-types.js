export const FORM_CREATED = /** @type {const} */ ('form_created')
export const FORM_UPDATED = /** @type {const} */ ('form_updated')
export const FORM_MIGRATED = /** @type {const} */ ('form_migrated')

export const METADATA_UPDATED = /** @type {const} */ ('metadata_updated')

export const PAGE_CREATED = /** @type {const} */ ('page_created')
export const PAGE_UPDATED = /** @type {const} */ ('page_updated')
export const PAGE_DELETED = /** @type {const} */ ('page_deleted')
export const PAGE_REORDERED = /** @type {const} */ ('page_reordered')

export const COMPONENT_CREATED = /** @type {const} */ ('component_created')
export const COMPONENT_UPDATED = /** @type {const} */ ('component_updated')
export const COMPONENT_DELETED = /** @type {const} */ ('component_deleted')
export const COMPONENT_REORDERED = /** @type {const} */ ('component_reordered')

export const LIST_CREATED = /** @type {const} */ ('list_created')
export const LIST_UPDATED = /** @type {const} */ ('list_updated')
export const LIST_DELETED = /** @type {const} */ ('list_deleted')

export const CONDITION_CREATED = /** @type {const} */ ('condition_created')
export const CONDITION_UPDATED = /** @type {const} */ ('condition_updated')
export const CONDITION_DELETED = /** @type {const} */ ('condition_deleted')

export const LIVE_PUBLISHED = /** @type {const} */ ('live_published')
export const DRAFT_CREATED_FROM_LIVE = /** @type {const} */ (
  'draft_created_from_live'
)

export const VersionChangeTypes = {
  FORM_CREATED,
  FORM_UPDATED,
  FORM_MIGRATED,

  METADATA_UPDATED,

  PAGE_CREATED,
  PAGE_UPDATED,
  PAGE_DELETED,
  PAGE_REORDERED,

  COMPONENT_CREATED,
  COMPONENT_UPDATED,
  COMPONENT_DELETED,
  COMPONENT_REORDERED,

  LIST_CREATED,
  LIST_UPDATED,
  LIST_DELETED,

  CONDITION_CREATED,
  CONDITION_UPDATED,
  CONDITION_DELETED,

  LIVE_PUBLISHED,
  DRAFT_CREATED_FROM_LIVE
}

export const ALL_VERSION_CHANGE_TYPES = Object.values(VersionChangeTypes)

/**
 * Helper function to validate a version change type
 * @param {any} changeType - The change type to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidVersionChangeType(changeType) {
  return ALL_VERSION_CHANGE_TYPES.includes(changeType)
}
