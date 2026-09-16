import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  JWT_SECRET: Joi.string().min(32).required(),

  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),

  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  BCRYPT_COST: Joi.number().min(10).max(15).default(12),

  CORS_ORIGINS: Joi.string().default('http://localhost:3001'),

  MAIL_DRIVER: Joi.string().valid('fake', 'smtp').default('fake'),

  MAIL_FROM: Joi.string().optional(),

  MAIL_HOST: Joi.string().optional(),

  MAIL_PORT: Joi.number().optional(),

  MAIL_USER: Joi.string().optional(),

  MAIL_PASS: Joi.string().optional(),

  MAIL_SECURE: Joi.boolean().optional(),
});
