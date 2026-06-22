'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { PillarScores } from '@/types'
import { PILLAR_META } from '@/lib/utils'

interface PillarRadarProps {
  scores: PillarScores
}

export function PillarRadar({ scores }: PillarRadarProps) {
  const data = [
    { axis: 'Health', value: scores.health },
    { axis: 'Capability', value: scores.capability },
    { axis: 'Network', value: scores.network },
    { axis: 'Wealth', value: scores.wealth },
    { axis: 'Mission', value: scores.mission },
  ]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#1e1e2a" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: '#6b6b88', fontSize: 11, fontWeight: 500 }}
        />
        <Radar
          name="Pillar Score"
          dataKey="value"
          stroke="#5b6af5"
          fill="#5b6af5"
          fillOpacity={0.15}
          strokeWidth={1.5}
        />
        <Tooltip
          contentStyle={{
            background: '#111116',
            border: '1px solid #1e1e2a',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: '#e8e8f0' }}
          itemStyle={{ color: '#a0a0c0' }}
          formatter={(v) => [`${v}`, 'Score']}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
