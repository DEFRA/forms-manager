/**
 * Returns the start page for the form. Computed by counting the next paths in a form definition
 * and returning page that doesn't have a reference, meaning it must be a start page / root node.
 *
 * It's possibe for forms to be malformed and have multiple start pages while they're being developed. This may be
 * valid during development, but in this scenario we can't detect the real start page and we require
 * the user to fix this themselves.
 * @param {import('~/src/api/types.js').FormDefinition} formDefinition
 */
export function getStartPage(formDefinition) {
  // get a unique list of all pages that are linked to by other pages
  const pageReferences = new Set(
    formDefinition.pages.flatMap((page) => page.next?.map((next) => next.path))
  )

  // for each page on the form, work out if it's referenced by another page
  // those that aren't referenced must be start pages
  const startPages = formDefinition.pages
    .map((page) => page.path)
    .filter((page) => !pageReferences.has(page))

  // we can only set the start page if there is a single one, else the user has made an error
  return startPages.length === 1 ? startPages[0] : formDefinition.startPage
}
