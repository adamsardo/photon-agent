export type Command =
  | { type: 'help' }
  | { type: 'status' }
  | { type: 'done' }
  | { type: 'setup' }
  | { type: 'harder' }
  | { type: 'ready' }
  | { type: 'reset' }
  | { type: 'new'; person: string; situation: string; goal: string; stakes?: string }

export function parseCommand(text: string): Command | null {
  const trimmed = text.trim()
  const normalized = trimmed.toLowerCase()

  if (normalized === 'setup' || normalized === '/setup') {
    return { type: 'setup' }
  }

  if (normalized === 'help' || normalized === '/help') {
    return { type: 'help' }
  }

  if (normalized === 'status' || normalized === '/status') {
    return { type: 'status' }
  }

  if (normalized === 'reset' || normalized === '/reset') {
    return { type: 'reset' }
  }

  if (normalized === 'debrief' || normalized === '/debrief') {
    return { type: 'done' }
  }

  if (normalized === 'harder' || normalized === '/harder') {
    return { type: 'harder' }
  }

  if (normalized === 'ready' || normalized === '/ready') {
    return { type: 'ready' }
  }

  if (!trimmed.startsWith('/')) {
    return null
  }

  const [name, ...restParts] = trimmed.slice(1).split(' ')
  const rest = restParts.join(' ').trim()

  switch (name.toLowerCase()) {
    case 'help':
      return { type: 'help' }
    case 'status':
      return { type: 'status' }
    case 'done':
    case 'feedback':
      return { type: 'done' }
    case 'reset':
      return { type: 'reset' }
    case 'new': {
      const parts = rest
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean)

      if (parts.length < 2) {
        return null
      }

      const [person, situation, goal, stakes] = parts
      return {
        type: 'new',
        person,
        situation,
        goal: goal ?? 'leave with clarity and a concrete next step',
        stakes,
      }
    }
    default:
      return null
  }
}

export function formatHelpText(): string {
  return [
    'Try one of these:',
    'setup',
    '/new boss | ask for a raise after a rough quarter | leave with a concrete next step',
    'debrief',
    'harder',
    'ready',
    'status',
    'reset',
    '',
    'Then text normally and I will become that person.',
  ].join('\n')
}
