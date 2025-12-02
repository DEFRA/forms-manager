/**
 * Feedback form
 * This form metadata is reinstated whenever the forms-manmager service startups up.
 * Be aware that any changes to this file will result in changes across all environments as deployments happen.
 */
const user = {
  id: '86758ba9-92e7-4287-9751-7705e449688e',
  displayName: 'Local Service Account'
}

export const feedbackMetadata = /** @type {FormMetadata} */ ({
  id: '691db72966b1bdc98fa3e72a',
  title: 'Feedback',
  organisation: 'Defra',
  teamName: 'Team Forms',
  teamEmail: 'jeremy.barnsley@defra.gov.uk',
  slug: 'feedback',
  createdAt: new Date('2025-11-19T12:25:13.789+00:00'),
  createdBy: user,
  updatedAt: new Date('2025-11-19T12:25:13.789+00:00'),
  updatedBy: user,
  versions: [
    {
      versionNumber: 1,
      createdAt: new Date('2025-11-19T12:25:13.789+00:00')
    }
  ],
  lastVersionNumber: 1,
  notificationEmail: 'jeremy.barnsley@esynergy.co.uk',
  contact: {
    phone: 'Telephone: 020 7946 0101\r\nMonday to Friday, 8am to 6pm'
  },
  submissionGuidance: 'Not sure yet',
  privacyNoticeUrl: 'https://www.gov.uk/help/privacy-notice',
  live: {
    updatedAt: new Date('2025-11-26T10:20:12.337+00:00'),
    updatedBy: user,
    createdAt: new Date('2025-11-19T12:28:30.644+00:00'),
    createdBy: user
  }
})

/**
 * @import { FormMetadata } from '@defra/forms-model'
 */
