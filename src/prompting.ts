import type { CompletedRound, DifficultyLevel, PracticeSession, TranscriptTurn } from './types.js'

const DIFFICULTY_GUIDANCE: Record<DifficultyLevel, string> = {
  1: 'A little tense, but still open and reasonably fair.',
  2: 'Guarded and skeptical. Ask follow-up questions and make them earn clarity.',
  3: 'Defensive or resistant. Push back on weak framing and vague asks.',
  4: 'High pressure. Add consequences, emotion, or authority without becoming cartoonish.',
  5: 'Very difficult but realistic. Strong resistance, boundary testing, and minimal generosity.',
}

function formatTranscript(turns: TranscriptTurn[]): string {
  return turns
    .map((turn) => `${turn.author === 'user' ? 'USER' : 'PERSON'}: ${turn.text}`)
    .join('\n')
}

function formatHistory(history: CompletedRound[]): string {
  if (history.length === 0) {
    return 'No previous rounds yet.'
  }

  return history
    .slice(-3)
    .map(
      (round, index) =>
        `Round ${index + 1} at difficulty ${round.difficulty}\nTranscript excerpt:\n${round.transcriptExcerpt}\nCoach feedback:\n${round.feedback}`,
    )
    .join('\n\n')
}

export function buildPersonaPrompt(session: PracticeSession): string {
  const stakesLine = session.stakes ? `Stakes: ${session.stakes}` : 'Stakes: inferred from the scenario.'

  return [
    `You are roleplaying the person the user needs to have a hard conversation with over iMessage.`,
    `Stay fully in character as: ${session.person}.`,
    `Scenario: ${session.situation}`,
    `User goal: ${session.goal}`,
    stakesLine,
    `Difficulty ${session.difficulty}/5: ${DIFFICULTY_GUIDANCE[session.difficulty]}`,
    '',
    'Rules:',
    '- Reply like a real text message.',
    '- Keep it concise: 1 to 4 short text bubbles worth of content.',
    '- No markdown, no labels, no explanation, no coaching.',
    '- React specifically to the latest user message.',
    '- Make the pressure feel real at this difficulty.',
    '- If the user is vague or apologetic, exploit that realistically.',
    '- If the user is clear and grounded, show that realism too.',
    '',
    'Previous rounds:',
    formatHistory(session.history),
    '',
    'Most recent coach feedback:',
    session.lastFeedback ?? 'No coach feedback yet.',
    '',
    'Conversation in this current round:',
    formatTranscript(session.transcript.slice(-12)),
  ].join('\n')
}

export function buildFeedbackPrompt(session: PracticeSession): string {
  return [
    'You are a sharp conversation coach reviewing a practice round that happened over text.',
    'Be concise, specific, and useful. Do not be soft or generic.',
    'Keep the whole response under 220 words.',
    'Use exactly this structure:',
    'What landed:',
    '- bullet',
    '- bullet',
    '',
    'Where you lost leverage:',
    '- bullet',
    '- bullet',
    '',
    'Next round gets harder because:',
    '- bullet',
    '',
    'Better opener:',
    'One sentence the user can actually send.',
    '',
    `Person: ${session.person}`,
    `Scenario: ${session.situation}`,
    `Goal: ${session.goal}`,
    `Current difficulty: ${session.difficulty}/5`,
    '',
    'Transcript:',
    formatTranscript(session.transcript),
  ].join('\n')
}

export function buildTranscriptExcerpt(turns: TranscriptTurn[]): string {
  return turns
    .slice(-8)
    .map((turn) => `${turn.author}: ${turn.text}`)
    .join('\n')
}
