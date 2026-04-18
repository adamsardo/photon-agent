import fs from 'node:fs/promises'
import path from 'node:path'

import type { AppState, ChatState } from './types.js'

const EMPTY_STATE: AppState = {
  version: 1,
  chats: {},
}

export class JsonStateStore {
  private constructor(private readonly statePath: string, private readonly state: AppState) {}

  static async open(statePath: string): Promise<JsonStateStore> {
    await fs.mkdir(path.dirname(statePath), { recursive: true })

    try {
      const raw = await fs.readFile(statePath, 'utf8')
      const parsed = JSON.parse(raw) as AppState
      return new JsonStateStore(statePath, parsed)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }

      const store = new JsonStateStore(statePath, structuredClone(EMPTY_STATE))
      await store.save()
      return store
    }
  }

  getChat(chatId: string): ChatState {
    if (!this.state.chats[chatId]) {
      this.state.chats[chatId] = {
        chatId,
        recentAgentEchoes: [],
      }
    }

    return this.state.chats[chatId]
  }

  async save(): Promise<void> {
    await fs.writeFile(this.statePath, JSON.stringify(this.state, null, 2))
  }
}
