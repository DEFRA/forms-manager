import {
  componentSchema,
  formDefinitionSchema,
  formMetadataInputSchema,
  idSchema,
  pageSchema,
  slugSchema
} from '@defra/forms-model'
import Joi from 'joi'

// Retrieve form by ID schema
export const formByIdSchema = Joi.object()
  .keys({
    id: idSchema
  })
  .required()

export const pageByIdSchema = Joi.object()
  .keys({
    id: idSchema,
    pageId: Joi.string().uuid().required()
  })
  .required()

export const componentByIdSchema = Joi.object()
  .keys({
    id: idSchema,
    pageId: Joi.string().uuid().required(),
    componentId: Joi.string().uuid().required()
  })
  .required()

export const componentPayloadWithRequiredIdSchema = componentSchema.keys({
  id: Joi.string().uuid().required()
})
export const prependQuerySchema = Joi.object().keys({
  prepend: Joi.boolean().default(false)
})

export const patchPageSchema = Joi.object()
  .keys({
    title: pageSchema.extract('title').optional(),
    path: pageSchema.extract('path').optional()
  })
  .required()
  .min(1)

// Retrieve form by slug schema
export const formBySlugSchema = Joi.object()
  .keys({
    slug: slugSchema
  })
  .required()

// Create form schema
export const createFormSchema = Joi.object().keys({
  title: formMetadataInputSchema.extract('title'),
  organisation: formMetadataInputSchema.extract('organisation'),
  teamName: formMetadataInputSchema.extract('teamName'),
  teamEmail: formMetadataInputSchema.extract('teamEmail')
})

// Update form definition schema
export const updateFormDefinitionSchema = formDefinitionSchema
