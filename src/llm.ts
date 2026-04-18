import OpenAI from 'openai'
import { z } from 'zod'

import type { AppConfig } from './config.js'
import { buildBootstrapPrompt, buildFeedbackPrompt, buildPersonaPrompt } from './prompting.js'
import type { PracticeSession } from './types.js'

const bootstrapSchema = z.object({
  person: z.string().min(1),
  situation: z.string().min(1),
  goal: z.string().min(1),
  opener: z.string().min(1),
})

export type BootstrapResult = z.infer<typeof bootstrapSchema>

export class PracticeModel {
  private readonly client: OpenAI

  constructor(private readonly config: AppConfig) {
    this.client = new OpenAI({
      apiKey: config.openAiApiKey,
      baseURL: config.openAiBaseUrl,
    })
  }

  async generatePersonaReply(session: PracticeSession): Promise<string> {
    return this.complete(buildPersonaPrompt(session))
  }

  async generateFeedback(session: PracticeSession): Promise<string> {
    return this.complete(buildFeedbackPrompt(session))
  }

  async bootstrapFromBrief(brief: string): Promise<BootstrapResult> {
    const raw = await this.complete(buildBootstrapPrompt(brief))
    const json = extractJsonObject(raw)
    return bootstrapSchema.parse(JSON.parse(json))
  }

  private async complete(input: string): Promise<string> {
    const response = await this.client.responses.create({
      model: this.config.openAiModel,
      input,
    })

    const output = response.output_text.trim()
    if (!output) {
      throw new Error('Model returned an empty response')
    }

    return output
  }
}

function extractJsonObject(raw: string): string {
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Model did not return JSON')
  }

  return raw.slice(firstBrace, lastBrace + 1)
}
