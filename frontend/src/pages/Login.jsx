
import React, {useEffect, useState} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'

export default function Login() {
  const [searchParams] = useSearchParams()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  useEffect(() => {
    const message = searchParams.get('message')
    if (message === 'idle-timeout') {
      setInfo('You were signed out due to inactivity. Please sign in again.')
    }
    const unlockToken = searchParams.get('unlock')
    if (unlockToken) {
      ;(async () => {
        try {
          const res = await fetch(`/api/v1/auth/unlock-account?token=${encodeURIComponent(unlockToken)}`)
          if (res.ok) {
            setInfo('Your account has been unlocked. You can sign in now.')
          } else {
            const data = await res.json().catch(() => ({}))
            setError(data.detail || 'Unable to unlock account.')
          }
        } catch (err) {
          setError('Unable to unlock account. Please try again later.')
        }
      })()
    }
  }, [searchParams])

  async function handleSubmit(e){
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch(`/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password })
      })
      if(!res.ok){
        const data = await res.json()
        setError(data.detail || 'Login failed')
        return
      }
      window.location.href = '/dashboard'
    } catch (err) {
      setError(`Network error: ${err?.message || 'Please try again.'}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded shadow-md w-full max-w-md">
        <BackendStatusBanner className="mb-3" />
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Sign in</h2>
        {info && <div className="text-blue-600 dark:text-blue-400 mb-4">{info}</div>}
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        <label className="block mb-2 dark:text-gray-300">Username or Email
          <input className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
        </label>
        <label className="block mb-4 dark:text-gray-300">Password
          <input type="password" className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={password} onChange={e=>setPassword(e.target.value)} />
        </label>
        <button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-2 rounded font-semibold">Sign in</button>
        <div className="mt-3 text-center text-sm dark:text-gray-300">
          <Link to="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:underline">Forgot password?</Link>
        </div>
        <div className="mt-2 text-center text-sm dark:text-gray-300">
          Don't have an account? <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">Register</Link>
        </div>
      </form>
    </div>
  )
}
