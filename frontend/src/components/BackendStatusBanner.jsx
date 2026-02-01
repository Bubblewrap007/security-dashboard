import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

export default function BackendStatusBanner({ className = '' }) {
  const [healthy, setHealthy] = useState(null)

  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const r = await apiFetch('/health')
        if (!alive) return
        setHealthy(r.ok)
      } catch (e) {
        if (!alive) return
        setHealthy(false)
      }
    }
    check()
    const id = setInterval(check, 10000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return (
    <div className={`flex items-center text-sm rounded p-2 mb-4 ${className} ${healthy === false ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${healthy === false ? 'bg-red-500' : 'bg-green-500'}`} />
      {healthy === false ? 'Server is waking up. Please wait a moment and refresh.' : 'Server is online and ready.'}
    </div>
  )
}
