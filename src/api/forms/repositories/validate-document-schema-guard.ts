import { FormDefinition, formDefinitionSchema } from '@defra/forms-model'

/**
 * @param document
 */
export function validateDocumentSchemaGuard(document: FormDefinition) {
  const { errors, value } = formDefinitionSchema.validate(document)
  if (errors) {
    throw new Error('Not valid')
  }
}
