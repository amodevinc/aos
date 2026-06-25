import { Suspense } from 'react'
import CaptureClient from './CaptureClient'

export default function CapturePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl animate-pulse text-sm text-[#5a5a75]">Loading capture…</div>}>
      <CaptureClient />
    </Suspense>
  )
}
