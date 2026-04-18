import { IMessageSDK } from '@photon-ai/imessage-kit'

async function main(): Promise<void> {
  const sdk = new IMessageSDK()

  try {
    const chats = await sdk.listChats({
      limit: 30,
      sortBy: 'recent',
    })

    for (const chat of chats) {
      console.log(
        [
          chat.chatId,
          chat.displayName ?? '(no display name)',
          chat.isGroup ? 'group' : 'dm',
          `unread=${chat.unreadCount}`,
          `last=${chat.lastMessageAt?.toISOString() ?? 'n/a'}`,
        ].join(' | '),
      )
    }
  } finally {
    await sdk.close()
  }
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
