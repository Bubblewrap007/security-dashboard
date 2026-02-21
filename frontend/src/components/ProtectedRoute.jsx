import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { apiFetch } from '../utils/api'

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking') // 'checking' | 'ok' | 'unauth'

  useEffect(() => {
    apiFetch('/api/v1/auth/me', { credentials: 'include' })
      .then(r => setStatus(r.ok ? 'ok' : 'unauth'))
      .catch(() => setStatus('unauth'))
  }, [])

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-gray-500 dark:text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (status === 'unauth') {
    return <Navigate to="/register" replace />
  }

  return children
}
