/**
 * Feedback form
 * This form metadata is reinstated whenever the forms-manmager service startups up.
 * Be aware that any changes to this file will result in changes across all environments as deployments happen.
 */

// This date will get automatically updated when applied to the DB
export const createdUpdatedDate = new Date('2025-11-19T12:25:13.789+00:00')

const user = {
  id: '86758ba9-92e7-4287-9751-7705e449688e',
  displayName: 'Local Service Account'
}

export const feedbackMetadata = /** @type {FormMetadata} */ ({
  id: '691db72966b1bdc98fa3e72a',
  title: 'Feedback (do not amend or use)',
  organisation: 'Defra',
  teamName: 'Team Forms',
  teamEmail: 'defraforms@defra.gov.uk',
  slug: 'feedback',
  createdAt: createdUpdatedDate,
  createdBy: user,
  updatedAt: createdUpdatedDate,
  updatedBy: user,
  versions: [],
  notificationEmail: 'defraforms.dynamic-target@defra.gov.uk',
  contact: {
    phone: 'Telephone: 020 7946 0101\r\nMonday to Friday, 8am to 6pm'
  },
  submissionGuidance: 'Not sure yet',
  privacyNoticeType: 'link',
  privacyNoticeUrl: 'https://www.gov.uk/help/privacy-notice',
  privacyNoticeText: '',
  live: {
    updatedAt: createdUpdatedDate,
    updatedBy: user,
    createdAt: createdUpdatedDate,
    createdBy: user
  }
})

/**
 * @import { FormMetadata } from '@defra/forms-model'
 */
