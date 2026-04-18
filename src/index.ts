import { IMessageSDK } from '@photon-ai/imessage-kit'

import { loadConfig } from './config.js'
import { PracticeModel } from './llm.js'
import { PhotonPracticeRuntime } from './runtime.js'
import { JsonStateStore } from './store.js'

async function main(): Promise<void> {
  const config = loadConfig()
  const store = await JsonStateStore.open(config.statePath)
  const sdk = new IMessageSDK({
    debug: config.debug,
    watcher: {
      pollInterval: config.pollIntervalMs,
      excludeOwnMessages: false,
    },
  })
  const runtime = new PhotonPracticeRuntime(config, sdk, store, new PracticeModel(config))

  const shutdown = async (signal: string) => {
    console.log(`[shutdown] ${signal}`)
    sdk.stopWatching()
    await store.save()
    await sdk.close()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  console.log(`[watching] chat ${config.practiceChatId}`)
  await sdk.startWatching({
    onMessage: async (message) => {
      await runtime.handleMessage(message)
    },
    onError: (error) => {
      console.error('[watcher]', error)
    },
  })
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
