import { z } from './zodOpenApi.js';

export const RegisterRequestSchema = z
  .object({
    email: z
      .string()
      .email()
      .openapi({ example: 'player@example.com', description: 'Player email address' }),
    password: z
      .string()
      .min(8)
      .openapi({ example: 'password123', description: 'Min. 8 characters' }),
  })
  .strict()
  .openapi('RegisterRequest');

export const LoginRequestSchema = z
  .object({
    email: z
      .string()
      .email()
      .openapi({ example: 'player@example.com', description: 'Player email address' }),
    password: z.string().min(8).openapi({ example: 'password123' }),
  })
  .strict()
  .openapi('LoginRequest');

export const AuthResponseSchema = z
  .object({
    access_token: z
      .string()
      .openapi({ description: 'RS256 JWT — paste into the Authorize dialog above' }),
    token_type: z.literal('Bearer').openapi({ example: 'Bearer' }),
    expires_in: z
      .number()
      .int()
      .openapi({ example: 900, description: 'Access token TTL in seconds (15 min)' }),
  })
  .strict()
  .openapi('AuthResponse');

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
