import { config as loadDotenv } from 'dotenv'
import path from 'node:path'
import { z } from 'zod'

loadDotenv()

const schema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().min(1).default('gpt-5-mini'),
  OPENAI_BASE_URL: z.string().url().optional(),
  PRACTICE_CHAT_ID: z.string().min(1, 'PRACTICE_CHAT_ID is required'),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
  STATE_PATH: z.string().min(1).default(path.resolve(process.cwd(), '.data/photon-agent-state.json')),
  DEBUG: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
})

export type AppConfig = {
  openAiApiKey: string
  openAiModel: string
  openAiBaseUrl?: string
  practiceChatId: string
  pollIntervalMs: number
  statePath: string
  debug: boolean
}

export function loadConfig(): AppConfig {
  const parsed = schema.parse(process.env)

  return {
    openAiApiKey: parsed.OPENAI_API_KEY,
    openAiModel: parsed.OPENAI_MODEL,
    openAiBaseUrl: parsed.OPENAI_BASE_URL,
    practiceChatId: parsed.PRACTICE_CHAT_ID,
    pollIntervalMs: parsed.POLL_INTERVAL_MS,
    statePath: parsed.STATE_PATH,
    debug: parsed.DEBUG ?? false,
  }
}
