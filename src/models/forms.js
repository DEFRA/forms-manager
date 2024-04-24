import Joi from 'joi'

// Retrieve form by ID schema
export const formByIdSchema = Joi.object()
  .keys({
    id: Joi.string().hex().length(24)
  })
  .required()

// Create form payload schema
export const createFormSchema = Joi.object()
  .keys({
    title: Joi.string().max(250).trim().required(),
    organisation: Joi.string().max(100).trim().required(),
    teamName: Joi.string().max(100).trim().required(),
    teamEmail: Joi.string().email().trim().required()
  })
  .required()

// Form definition schema
export { Schema as formDefinitionSchema } from '@defra/forms-model'
