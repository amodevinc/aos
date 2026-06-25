'use client'

import { Suspense } from 'react'
import ConnectPage from './ConnectClient'

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0c]" />}>
      <ConnectPage />
    </Suspense>
  )
}
