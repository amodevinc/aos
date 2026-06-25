/** Time-of-day aware capture prompts for the daily habit loop. */

export type CapturePhase = 'morning' | 'day' | 'evening' | 'night'

export function getCapturePhase(date = new Date()): CapturePhase {
  const hour = date.getHours()
  if (hour < 11) return 'morning'
  if (hour < 17) return 'day'
  if (hour < 21) return 'evening'
  return 'night'
}

export interface PromptChip {
  id: string
  label: string
  starter: string
  /** Shown first when phase matches */
  phases?: CapturePhase[]
}

export const CAPTURE_PROMPTS: PromptChip[] = [
  {
    id: 'morning-plan',
    label: 'Morning plan',
    starter:
      'This morning my top 3 priorities are: 1) … 2) … 3) …. For health I will …, for capability …, and my biggest risk today is …',
    phases: ['morning'],
  },
  {
    id: 'midday-check',
    label: 'Midday check-in',
    starter:
      'Midday update — progress on my top 3: … Still on track for … Need to adjust …',
    phases: ['day'],
  },
  {
    id: 'evening-review',
    label: 'Evening review',
    starter:
      'End of day review — I trained …, learned …, connected with …. Biggest win: … Biggest mistake: … Lesson: … Tomorrow I adjust …',
    phases: ['evening', 'night'],
  },
  {
    id: 'log-win',
    label: 'Log a win',
    starter: 'Quick win — ',
    phases: ['day', 'evening'],
  },
  {
    id: 'log-decision',
    label: 'Log decision',
    starter: 'Decision — I need to choose between … and …. Leaning toward … because …',
  },
  {
    id: 'log-contact',
    label: 'Log interaction',
    starter: 'Had a conversation with … about … Key takeaway: … Next step: …',
  },
]

export function promptsForPhase(phase: CapturePhase): PromptChip[] {
  const primary = CAPTURE_PROMPTS.filter((p) => p.phases?.includes(phase))
  const rest = CAPTURE_PROMPTS.filter((p) => !p.phases?.includes(phase))
  return [...primary, ...rest]
}

export function phaseHeadline(phase: CapturePhase): { title: string; subtitle: string } {
  switch (phase) {
    case 'morning':
      return {
        title: 'Start the day',
        subtitle: 'Plan priorities, pillar actions, and risks — speak or tap a prompt.',
      }
    case 'day':
      return {
        title: 'Capture as you go',
        subtitle: 'Log wins, decisions, and course corrections without breaking flow.',
      }
    case 'evening':
      return {
        title: 'Close the loop',
        subtitle: 'Evening review — training, wins, mistakes, and tomorrow’s adjustment.',
      }
    case 'night':
      return {
        title: 'Before you sleep',
        subtitle: 'Quick evening capture if you have not closed the day yet.',
      }
  }
}

export function primaryCaptureHref(starter: string, listen = false): string {
  const params = new URLSearchParams()
  if (starter) params.set('starter', starter)
  if (listen) params.set('listen', '1')
  const q = params.toString()
  return q ? `/capture?${q}` : '/capture'
}
