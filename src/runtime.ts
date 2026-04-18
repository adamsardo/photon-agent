import type { IMessageSDK, Message } from '@photon-ai/imessage-kit'

import { parseCommand, formatHelpText } from './commands.js'
import type { AppConfig } from './config.js'
import { PracticeModel } from './llm.js'
import { buildTranscriptExcerpt } from './prompting.js'
import { JsonStateStore } from './store.js'
import { advanceDifficulty, type AgentEcho, type ChatState, type PracticeSession, type TranscriptTurn } from './types.js'

const AGENT_ECHO_TTL_MS = 2 * 60 * 1000

function nowIso(): string {
  return new Date().toISOString()
}

function trimEchoes(echoes: AgentEcho[]): AgentEcho[] {
  const cutoff = Date.now() - AGENT_ECHO_TTL_MS
  return echoes.filter((echo) => new Date(echo.sentAt).getTime() >= cutoff)
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}

function matchesEcho(message: Message, echoes: AgentEcho[]): boolean {
  if (!message.isFromMe) {
    return false
  }

  const byId = echoes.some((echo) => echo.messageId && echo.messageId === message.id)
  if (byId) {
    return true
  }

  const text = message.text?.trim()
  if (!text) {
    return false
  }

  const normalized = normalizeText(text)
  return echoes.some((echo) => {
    const ageMs = Math.abs(message.date.getTime() - new Date(echo.sentAt).getTime())
    return ageMs <= AGENT_ECHO_TTL_MS && normalizeText(echo.text) === normalized
  })
}

function createTurn(message: Message, author: 'user' | 'agent'): TranscriptTurn {
  return {
    id: message.id,
    author,
    text: message.text?.trim() ?? '',
    createdAt: message.date.toISOString(),
  }
}

function createSession(params: { person: string; situation: string; goal: string; stakes?: string }): PracticeSession {
  const timestamp = nowIso()

  return {
    person: params.person,
    situation: params.situation,
    goal: params.goal,
    stakes: params.stakes,
    difficulty: 1,
    completedRounds: 0,
    history: [],
    transcript: [],
    waitingForNextRound: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function formatStatus(session: PracticeSession): string {
  return [
    `${session.person}`,
    `${session.situation}`,
    `Goal: ${session.goal}`,
    `Difficulty: ${session.difficulty}/5`,
    `Completed rounds: ${session.completedRounds}`,
    session.lastFeedback ? `Last feedback:\n${session.lastFeedback}` : 'No feedback yet. Send /done after a round.',
  ]
    .filter(Boolean)
    .join('\n')
}

export class PhotonPracticeRuntime {
  private workQueue: Promise<void> = Promise.resolve()

  constructor(
    private readonly config: AppConfig,
    private readonly sdk: IMessageSDK,
    private readonly store: JsonStateStore,
    private readonly model: PracticeModel,
  ) {}

  async handleMessage(message: Message): Promise<void> {
    this.workQueue = this.workQueue.then(() => this.processMessage(message)).catch((error) => {
      console.error('[runtime] failed to process message:', error)
    })

    await this.workQueue
  }

  private async processMessage(message: Message): Promise<void> {
    if (message.chatId !== this.config.practiceChatId) {
      return
    }

    if (!message.text?.trim()) {
      return
    }

    const chat = this.store.getChat(message.chatId)
    chat.recentAgentEchoes = trimEchoes(chat.recentAgentEchoes)

    if (matchesEcho(message, chat.recentAgentEchoes)) {
      await this.store.save()
      return
    }

    const command = parseCommand(message.text)
    if (command) {
      await this.handleCommand(chat, command, message)
      await this.store.save()
      return
    }

    if (chat.setupDraft) {
      await this.handleSetupAnswer(chat, message)
      await this.store.save()
      return
    }

    if (!chat.session) {
      await this.sendAgentMessage(chat, formatHelpText(), undefined, message)
      await this.store.save()
      return
    }

    chat.session.updatedAt = nowIso()
    chat.session.waitingForNextRound = false
    chat.session.transcript.push(createTurn(message, 'user'))

    const reply = await this.model.generatePersonaReply(chat.session)
    await this.sendAgentMessage(chat, reply, chat.session, message)
    await this.store.save()
  }

  private async handleCommand(chat: ChatState, command: ReturnType<typeof parseCommand>, message: Message): Promise<void> {
    if (!command) {
      return
    }

    switch (command.type) {
      case 'help':
        await this.sendAgentMessage(chat, formatHelpText(), undefined, message)
        return
      case 'setup':
        chat.setupDraft = {}
        await this.sendAgentMessage(chat, 'Who is this person to you?', undefined, message)
        return
      case 'status':
        await this.sendAgentMessage(
          chat,
          chat.setupDraft
            ? 'Setup in progress. I still need: ' +
                [
                  chat.setupDraft.person ? null : 'who they are to you',
                  chat.setupDraft.situation ? null : 'what the conversation is about',
                  chat.setupDraft.goal ? null : 'the outcome you want',
                ]
                  .filter(Boolean)
                  .join(', ')
            : chat.session
              ? formatStatus(chat.session)
              : formatHelpText(),
          undefined,
          message,
        )
        return
      case 'reset':
        chat.session = undefined
        chat.setupDraft = undefined
        await this.sendAgentMessage(chat, 'Cleared. Text setup to start again.', undefined, message)
        return
      case 'new':
        chat.setupDraft = undefined
        chat.session = createSession(command)
        await this.sendAgentMessage(
          chat,
          [
            'Locked in.',
            `Person: ${command.person}`,
            `Scenario: ${command.situation}`,
            `Goal: ${command.goal}`,
            `Difficulty: 1/5`,
            '',
            'Text me like it is real. Send /done when you want feedback.',
          ].join('\n'),
          undefined,
          message,
        )
        return
      case 'harder':
        if (!chat.session) {
          await this.sendAgentMessage(chat, 'Start with setup first.', undefined, message)
          return
        }
        chat.session.difficulty = advanceDifficulty(chat.session.difficulty)
        chat.session.updatedAt = nowIso()
        await this.sendAgentMessage(
          chat,
          `Difficulty is now ${chat.session.difficulty}/5. Text me again and I will push harder.`,
          undefined,
          message,
        )
        return
      case 'ready':
        if (!chat.session) {
          await this.sendAgentMessage(chat, 'Start with setup first.', undefined, message)
          return
        }
        chat.session.difficulty = 5
        chat.session.updatedAt = nowIso()
        await this.sendAgentMessage(chat, 'Final round. I am going to meet you at full intensity now.', undefined, message)
        return
      case 'done': {
        if (!chat.session || chat.session.transcript.length === 0) {
          await this.sendAgentMessage(chat, 'There is no round to review yet. Start with setup, then text normally.', undefined, message)
          return
        }

        const feedback = await this.model.generateFeedback(chat.session)
        chat.session.history.push({
          difficulty: chat.session.difficulty,
          endedAt: nowIso(),
          transcriptExcerpt: buildTranscriptExcerpt(chat.session.transcript),
          feedback,
        })
        chat.session.completedRounds += 1
        chat.session.lastFeedback = feedback
        chat.session.difficulty = advanceDifficulty(chat.session.difficulty)
        chat.session.transcript = []
        chat.session.waitingForNextRound = true
        chat.session.updatedAt = nowIso()

        await this.sendAgentMessage(
          chat,
          `${feedback}\n\nNext round is difficulty ${chat.session.difficulty}/5. Text again when you want to go back in.`,
          undefined,
          message,
        )
        return
      }
    }
  }

  private async handleSetupAnswer(chat: ChatState, message: Message): Promise<void> {
    if (!chat.setupDraft) {
      return
    }

    const answer = message.text?.trim()
    if (!answer) {
      return
    }

    if (!chat.setupDraft.person) {
      chat.setupDraft.person = answer
      await this.sendAgentMessage(chat, "What's the conversation about?", undefined, message)
      return
    }

    if (!chat.setupDraft.situation) {
      chat.setupDraft.situation = answer
      await this.sendAgentMessage(chat, 'What outcome do you want?', undefined, message)
      return
    }

    chat.setupDraft.goal = answer
    chat.session = createSession({
      person: chat.setupDraft.person,
      situation: chat.setupDraft.situation,
      goal: chat.setupDraft.goal,
    })
    chat.setupDraft = undefined

    await this.sendAgentMessage(
      chat,
      [
        'Locked in.',
        `Person: ${chat.session.person}`,
        `Scenario: ${chat.session.situation}`,
        `Goal: ${chat.session.goal}`,
        'Difficulty: 1/5',
        '',
        'Text me like it is real. When you want notes, text debrief.',
      ].join('\n'),
      undefined,
      message,
    )
  }

  private async sendAgentMessage(
    chat: ChatState,
    text: string,
    session?: PracticeSession,
    sourceMessage?: Message,
  ): Promise<void> {
    const normalizedText = text.trim()
    const sentAt = nowIso()
    chat.recentAgentEchoes.push({
      text: normalizedText,
      sentAt,
    })
    chat.recentAgentEchoes = trimEchoes(chat.recentAgentEchoes)

    if (sourceMessage) {
      await this.sdk.message(sourceMessage).replyText(normalizedText).execute()
    } else {
      await this.sdk.send(chat.chatId, normalizedText)
    }

    const latestEcho = chat.recentAgentEchoes.at(-1)
    if (latestEcho) {
      latestEcho.messageId = undefined
    }

    if (session) {
      session.transcript.push({
        id: `local-agent-${Date.now()}`,
        author: 'agent',
        text: normalizedText,
        createdAt: sentAt,
      })
      session.updatedAt = nowIso()
    }
  }
}
