import OpenAI from 'openai'

import type { AppConfig } from './config.js'
import { buildFeedbackPrompt, buildPersonaPrompt } from './prompting.js'
import type { PracticeSession } from './types.js'

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
