'use client'

import { useEffect } from 'react'

export default function GlobalErrorSuppressor() {
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message?.includes('conversation_id') || e.message?.includes('Cannot destructure property')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message ?? String(e.reason ?? '')
      if (msg.includes('conversation_id') || msg.includes('Cannot destructure property')) {
        e.preventDefault()
      }
    }
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
  return null
}
