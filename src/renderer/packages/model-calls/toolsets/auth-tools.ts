import { tool } from 'ai'
import z from 'zod'
import { runChatAuthAction } from '@/auth/chat-auth'

const authServiceSchema = z.enum(['auto', 'chatbox-ai', 'k12'])
const signOutServiceSchema = z.enum(['all', 'chatbox-ai', 'k12'])

export const authToolSetDescription = `
Use these account tools when the user wants to sign in, sign out, or reset a password.

- Use \`sign_in\` for "sign in", "log in", "authenticate", and "help me sign in".
- Use \`sign_out\` for "sign out", "log out", and "logout".
- Use \`forgot_password\` for "forgot password" and "reset password".
- Prefer these tools over giving manual login instructions when the user is clearly asking for account help.
`

export function getAuthToolSet(sessionId: string) {
  return {
    sign_in: tool({
      description: 'Start sign-in or reopen inline sign-in for the app the user is trying to unlock.',
      inputSchema: z.object({
        service: authServiceSchema
          .default('auto')
          .optional()
          .describe('Optional auth target. Use auto unless the user explicitly says Chatbox AI or school/K12.'),
        app: z.string().optional().describe('Optional app name, like Chess, if the user mentions a specific app.'),
      }),
      execute: async (input) =>
        await runChatAuthAction(sessionId, {
          action: 'sign_in',
          provider: input.service ?? 'auto',
          pluginId: input.app,
        }),
    }),
    sign_out: tool({
      description: 'Sign the user out of Chatbox AI, K12, or both.',
      inputSchema: z.object({
        service: signOutServiceSchema
          .default('all')
          .optional()
          .describe('Choose all unless the user explicitly asks to sign out of one account only.'),
      }),
      execute: async (input) =>
        await runChatAuthAction(sessionId, {
          action: 'sign_out',
          provider: input.service ?? 'all',
        }),
    }),
    forgot_password: tool({
      description: 'Help the user start a password reset flow or explain where password resets are handled.',
      inputSchema: z.object({
        service: authServiceSchema
          .default('auto')
          .optional()
          .describe('Optional auth target. Use auto unless the user explicitly says Chatbox AI or school/K12.'),
        app: z.string().optional().describe('Optional app name if the reset request is about a blocked app in chat.'),
      }),
      execute: async (input) =>
        await runChatAuthAction(sessionId, {
          action: 'forgot_password',
          provider: input.service ?? 'auto',
          pluginId: input.app,
        }),
    }),
  }
}
