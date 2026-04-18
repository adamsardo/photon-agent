export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export interface TranscriptTurn {
  id: string
  author: 'user' | 'agent'
  text: string
  createdAt: string
}

export interface CompletedRound {
  difficulty: DifficultyLevel
  endedAt: string
  transcriptExcerpt: string
  feedback: string
}

export interface PracticeSession {
  person: string
  situation: string
  goal: string
  stakes?: string
  difficulty: DifficultyLevel
  completedRounds: number
  lastFeedback?: string
  history: CompletedRound[]
  transcript: TranscriptTurn[]
  waitingForNextRound: boolean
  createdAt: string
  updatedAt: string
}

export interface AgentEcho {
  text: string
  sentAt: string
  messageId?: string
}

export interface ChatState {
  chatId: string
  session?: PracticeSession
  recentAgentEchoes: AgentEcho[]
}

export interface AppState {
  version: 1
  chats: Record<string, ChatState>
}

export function clampDifficulty(value: number): DifficultyLevel {
  return Math.max(1, Math.min(5, Math.round(value))) as DifficultyLevel
}

export function advanceDifficulty(level: DifficultyLevel): DifficultyLevel {
  return clampDifficulty(level + 1)
}
