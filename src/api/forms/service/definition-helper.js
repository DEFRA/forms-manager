import { buildTranslationDataRows } from '@defra/forms-model'
import Boom from '@hapi/boom'

import { makeFormLiveErrorMessages } from '~/src/api/forms/constants.js'

const CONTACT_KEY_EMAIL_ADDRESS = 'form.contact.email.address'
const CONTACT_KEY_EMAIL_RESPONSE_TIME = 'form.contact.email.responseTime'
const CONTACT_KEY_ONLINE_URL = 'form.contact.online.url'
const CONTACT_KEY_ONLINE_TEXT = 'form.contact.online.text'
const CONTACT_KEY_PHONE = 'form.contact.phone'

/**
 * Determine if contact field values populated in the form overview (and stored in FormMetadata)
 * have corresponding non-empty translation values
 * @param { string | undefined } formValue1 - field value from form overview (field 1)
 * @param { string | undefined } formValue2 - field value from form overview (field 2)
 * @param { string | undefined } translation1 - translation value corresponding to field 1
 * @param { string | undefined } translation2 - translation value corresponding to field 2
 * @returns {number} zero if not valid or populated, 1 if fully valid
 */
function checkContactSection(
  formValue1,
  formValue2,
  translation1,
  translation2
) {
  if (formValue1 || formValue2) {
    if (!translation1 || !translation2) {
      throw Boom.badRequest(makeFormLiveErrorMessages.missingTranslations)
    }
    return 1
  }
  return 0
}

/**
 * Check for any missing (or empty) translation values for entries in the form that require a translation.
 * Compare against expected translation entries (based on the form pages/components/lists etc) with those
 * saved in the 'metadata' property of the form definition.
 * @param {FormMetadata} form
 * @param {FormDefinition} definition
 */
export function checkForMissingTranslations(form, definition) {
  // Ignore if no translations
  // @ts-expect-error - dynamic language name
  if (!definition.metadata?.translations?.cy) {
    return
  }

  // @ts-expect-error - dynamic language name
  const cy = definition.metadata.translations.cy

  // Check if translation entries are in sync with form definition
  const translations = buildTranslationDataRows(form, definition)
  const combinedRows = translations.overviewRows.concat(translations.formRows)
  const expectedKeys = new Set(combinedRows.map((row) => row.name))
  const foundKeys = new Set(Object.keys(cy))

  const added = [...foundKeys].filter((v) => !expectedKeys.has(v))
  const removed = [...expectedKeys].filter((v) => !foundKeys.has(v))

  if (added.length || removed.length || foundKeys.size !== expectedKeys.size) {
    throw Boom.badRequest(makeFormLiveErrorMessages.outOfSyncTranslations)
  }

  // Determine what bits of contact info have and English entry and a translation
  // At least one piece of contact info is required (may be two fields that go together)
  // and each field that has an English value must have a translation
  let validContactCount = checkContactSection(
    form.contact?.email?.address,
    form.contact?.email?.responseTime,
    cy[CONTACT_KEY_EMAIL_ADDRESS],
    cy[CONTACT_KEY_EMAIL_RESPONSE_TIME]
  )

  validContactCount =
    validContactCount +
    checkContactSection(
      form.contact?.online?.url,
      form.contact?.online?.text,
      cy[CONTACT_KEY_ONLINE_URL],
      cy[CONTACT_KEY_ONLINE_TEXT]
    )

  validContactCount =
    validContactCount +
    checkContactSection(
      form.contact?.phone,
      undefined,
      cy[CONTACT_KEY_PHONE],
      'dummy valid'
    )

  if (validContactCount === 0) {
    throw Boom.badRequest(makeFormLiveErrorMessages.missingTranslations)
  }

  // Use a set for faster access
  const contactKeys = new Set([
    CONTACT_KEY_EMAIL_ADDRESS,
    CONTACT_KEY_EMAIL_RESPONSE_TIME,
    CONTACT_KEY_ONLINE_URL,
    CONTACT_KEY_ONLINE_TEXT,
    CONTACT_KEY_PHONE
  ])

  // Check for any empty translations
  // (excluding the contact info which has been checked earlier)
  const emptyValues = Object.entries(
    // @ts-expect-error - dynamic language name
    definition.metadata.translations.cy
  )
    .filter(([key]) => !contactKeys.has(key))
    .filter(([, value]) => !value)

  if (emptyValues.length) {
    throw Boom.badRequest(makeFormLiveErrorMessages.missingTranslations)
  }
}

/**
 * @import { FormDefinition, FormMetadata } from '@defra/forms-model'
 */
