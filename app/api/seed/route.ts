import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    return NextResponse.json({ error: 'Seed disabled in production.' }, { status: 403 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated. Log in first.' }, { status: 401 })
  }

  const uid = user.id
  const now = new Date().toISOString()
  const errors: string[] = []

  // ── Life Compass ────────────────────────────────────────────────────────────

  const { error: compassError } = await supabase.from('life_compass').upsert({
    user_id: uid,
    mission_statement: 'Build technology-driven companies that create real economic opportunity — starting in Belize — while compounding the capability, health, and network to sustain a decades-long game.',
    ten_year_vision: 'I have built at least one company generating significant revenue and operating without me needing to be in every decision. I am financially free — multiple income streams, no dependency on a salary, meaningful investments compounding. I am recognized across the Caribbean and in global AI/tech circles as someone who built something real from a small country. My network includes world-class builders, operators, and investors who I add genuine value to. I am in the best physical shape of my life — training is non-negotiable, my body reflects my standards. I have created tangible economic impact in Belize — jobs, infrastructure, or capital deployed toward development. I operate from a position of strength in every area of my life.',
    three_year_mission: 'At least one company or product generating $10K+/month. Deep AI and business-building skills — I am someone serious founders and companies turn to. A network of 15–25 high-value relationships built on genuine mutual value. A defined physical standard maintained consistently for 18+ months. Financial runway of 12+ months. A clear thesis on what I\'m building and why.',
    current_season: 'Foundation building — 2025–2026. The mission of this season is to build the capability, physical standard, discipline, and early relationships that make the next decade possible. The output of this season is not money — it is the compounding assets that produce money later. No fragmentation. Deep work on a small number of things.',
    identity_statement: 'I am the kind of person who operates at a high standard without needing external accountability, thinks in decades while executing in days, builds things that create real value, and does the hard work — especially when no one is watching.',
    core_values: ['Discipline', 'Long-term thinking', 'Excellence', 'Leverage', 'Honesty', 'Ambition'],
    personal_rules: [
      'Train 5× per week — no exceptions, no negotiations',
      'Learn something valuable every day — read, build, or study deliberately',
      'Run every significant opportunity through the Decision Engine before committing',
      'Protect deep work — no meetings before 10am, no social media during work blocks',
      'Add value first in every relationship before asking for anything',
      'Never take on work that doesn\'t compound toward the mission',
    ],
    anti_rules: [
      'Never say yes to opportunities out of desperation, boredom, or social pressure',
      'Never sacrifice sleep and training for "productive" work — the body is the machine',
      'Never spread focus across more than 3 major priorities simultaneously',
      'Never stay in environments that drain more energy than they return',
      'Never confuse being busy with making progress',
    ],
    non_negotiables: [
      '5× weekly training — minimum',
      '7.5 hours sleep — floor, not ceiling',
      'Daily learning — 30 minutes minimum, deliberate not passive',
      'Morning plan before the day starts',
      'No substances that compromise performance or judgment',
    ],
    updated_at: now,
  }, { onConflict: 'user_id' })

  if (compassError) errors.push(`Compass: ${compassError.message}`)

  // ── Goals ───────────────────────────────────────────────────────────────────

  const goals = [
    {
      id: `seed-goal-health-${uid.slice(0, 8)}`,
      user_id: uid,
      title: 'Reach and maintain 12% body fat',
      description: 'Build the physical standard that reflects who I am becoming through consistent training and disciplined eating.',
      pillar: 'health',
      deadline: '2025-12-31',
      status: 'active',
      progress: 0,
      why_it_matters: 'The body is the machine. Physical standard reflects discipline, compound health across decades, and signals to yourself and others who you are.',
      next_action: 'Define exact training split (strength + conditioning) and track adherence for 30 days',
      created_at: now,
      updated_at: now,
    },
    {
      id: `seed-goal-capability-${uid.slice(0, 8)}`,
      user_id: uid,
      title: 'Build and ship one real AI product',
      description: 'Develop deep practical AI skills — LLMs, RAG systems, agents — by building something real that solves a real problem.',
      pillar: 'capability',
      deadline: '2025-09-30',
      status: 'active',
      progress: 0,
      why_it_matters: 'Skills compound. Building is the fastest way to learn. One shipped product creates more credibility and capability than any course.',
      next_action: 'Identify the specific AI project to build in the next 60 days and start this week',
      created_at: now,
      updated_at: now,
    },
    {
      id: `seed-goal-network-${uid.slice(0, 8)}`,
      user_id: uid,
      title: 'Build 5 Tier 1 relationships',
      description: 'Develop 5 genuine relationships with people 10+ years ahead in AI, entrepreneurship, or venture — built on real mutual value.',
      pillar: 'network',
      deadline: '2025-12-31',
      status: 'active',
      progress: 0,
      why_it_matters: 'Your network determines your opportunity access. Five strong Tier 1 relationships at 24 compounds more than almost any other investment you can make.',
      next_action: 'Identify 10 target people and send 2 genuine, value-first outreach messages this week',
      created_at: now,
      updated_at: now,
    },
    {
      id: `seed-goal-wealth-${uid.slice(0, 8)}`,
      user_id: uid,
      title: 'Generate first $5K/month from a product or service',
      description: 'Prove that value can be exchanged for money outside of employment — through a product, AI service, or skill-based offering.',
      pillar: 'wealth',
      deadline: '2025-12-31',
      status: 'active',
      progress: 0,
      why_it_matters: 'The first dollar from something you built is a proof of concept. $5K/month is the signal that the model works and can be scaled.',
      next_action: 'Define the specific offering and identify the first 3 people or companies to approach',
      created_at: now,
      updated_at: now,
    },
    {
      id: `seed-goal-mission-${uid.slice(0, 8)}`,
      user_id: uid,
      title: 'Define my thesis: the specific problem I\'m building toward',
      description: 'Write a clear 1-page problem statement identifying the specific gap in Belize or the Caribbean that I am uniquely positioned to address with technology.',
      pillar: 'mission',
      deadline: '2025-07-31',
      status: 'active',
      progress: 0,
      why_it_matters: 'Clarity of mission prevents fragmentation. Without a defined problem, every opportunity looks equally valid — which leads to none of them compounding.',
      next_action: 'Write the 1-page problem statement this week — what is broken, why it matters, why me',
      created_at: now,
      updated_at: now,
    },
  ]

  for (const goal of goals) {
    const { error: goalError } = await supabase
      .from('goals')
      .upsert(goal, { onConflict: 'id' })
    if (goalError) errors.push(`Goal "${goal.title}": ${goalError.message}`)
  }

  if (errors.length > 0) {
    return NextResponse.json({ status: 'partial', errors }, { status: 207 })
  }

  return NextResponse.json({
    status: 'ok',
    seeded: {
      compass: true,
      goals: goals.length,
    },
    message: 'Life Compass and 5 goals seeded. View them in the app.',
  })
}
