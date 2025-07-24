import { publishFormCreatedEvent } from "~/src/helpers/publish.js"

const metadata = {
  id: '688131eeff67f889d52c66cc',
  title: 'My form',
  organisation: 'Defra',
  teamName: 'Team1',
  teamEmail: 'name@example.gov.uk',
  slug: 'my-form',
  draft: {
    createdAt: new Date('2025-07-23T19:03:10.314Z'),
    createdBy: {
      id: '396e84b4-1cbd-40d0-af83-857be2aaefa7',
      displayName: 'Enqique Chase'
    },
    updatedAt: new Date('2025-07-23T22:05:37.158Z'),
    updatedBy: {
      id: '396e84b4-1cbd-40d0-af83-857be2aaefa7',
      displayName: 'Enqique Chase'
    }
  },
  createdAt: new Date('2025-07-23T19:03:10.314Z'),
  createdBy: {
    id: '396e84b4-1cbd-40d0-af83-857be2aaefa7',
    displayName: 'Enqique Chase'
  },
  updatedAt: new Date('2025-07-23T22:05:37.158Z'),
  updatedBy: {
    id: '396e84b4-1cbd-40d0-af83-857be2aaefa7',
    displayName: 'Enqique Chase'
  }
}

export async function addTestMessage() {
  await publishFormCreatedEvent(metadata)
}
