
import React, {useEffect, useState} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { apiFetch } from '../utils/api'

export default function Login() {
  const [searchParams] = useSearchParams()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  // MFA step
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaMethod, setMfaMethod] = useState('')
  const [mfaTempToken, setMfaTempToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)

  useEffect(() => {
    const message = searchParams.get('message')
    if (message === 'idle-timeout') {
      setInfo('You were signed out due to inactivity. Please sign in again.')
    }
    const unlockToken = searchParams.get('unlock')
    if (unlockToken) {
      ;(async () => {
        try {
          const res = await apiFetch(`/api/v1/auth/unlock-account?token=${encodeURIComponent(unlockToken)}`)
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
    setLoading(true)
    try {
      const res = await apiFetch(`/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password })
      })
      const data = await res.json().catch(() => ({}))
      if(!res.ok){
        setLoading(false)
        setError(data.detail || 'Login failed')
        return
      }
      if (data.mfa_required) {
        setMfaRequired(true)
        setMfaMethod(data.mfa_method)
        setMfaTempToken(data.temp_token)
        setMfaCode('')
        setMfaError('')
        setLoading(false)
        return
      }
      // Success, no MFA
      window.location.href = '/dashboard'
    } catch (err) {
      setError(`Network error: ${err?.message || 'Please try again.'}`)
      setLoading(false)
    }
  }

  async function handleMfaSubmit(e) {
    e.preventDefault()
    setMfaError('')
    setLoading(true)
    try {
      const res = await apiFetch(`/api/v1/auth/login/mfa-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ temp_token: mfaTempToken, code: mfaCode, method: mfaMethod, remember_device: rememberDevice })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMfaError(data.detail || 'Invalid MFA code')
        setLoading(false)
        return
      }
      window.location.href = '/dashboard'
    } catch (err) {
      setMfaError(`Network error: ${err?.message || 'Please try again.'}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <form onSubmit={mfaRequired ? handleMfaSubmit : handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded shadow-md w-full max-w-md">
        <BackendStatusBanner className="mb-3" />
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Sign in</h2>
        {info && <div className="text-blue-600 dark:text-blue-400 mb-4">{info}</div>}
        {error && !mfaRequired && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        {!mfaRequired && (
          <>
            <label className="block mb-2 dark:text-gray-300">Username or Email
              <input className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" />
            </label>
            <label className="block mb-4 dark:text-gray-300">Password
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full border px-3 py-2 pr-10 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-2 rounded font-semibold disabled:opacity-60">Sign in</button>
            <div className="mt-3 text-center text-sm dark:text-gray-300">
              <Link to="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:underline">Forgot password?</Link>
            </div>
            <div className="mt-2 text-center text-sm dark:text-gray-300">
              <Link to="/recover-account" className="text-orange-600 dark:text-orange-400 hover:underline">Lost access to MFA or account?</Link>
            </div>
            <div className="mt-2 text-center text-sm dark:text-gray-300">
              Don't have an account? <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">Register</Link>
            </div>
          </>
        )}
        {mfaRequired && (
          <>
            <div className="mb-4 text-gray-700 dark:text-gray-200">
              <strong>MFA required</strong><br/>
              {mfaMethod === 'totp' && 'Enter the 6-digit code from your authenticator app.'}
              {mfaMethod === 'email' && 'Enter the code sent to your email.'}
              {mfaMethod === 'sms' && 'Enter the code sent to your phone.'}
            </div>
            {mfaError && <div className="text-red-600 dark:text-red-400 mb-4">{mfaError}</div>}
            <label className="block mb-4 dark:text-gray-300">MFA Code
              <input type="text" className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={mfaCode} onChange={e=>setMfaCode(e.target.value)} autoFocus autoComplete="one-time-code" maxLength={8} />
            </label>
            <label className="flex items-center mb-4 dark:text-gray-300">
              <input type="checkbox" className="mr-2" checked={rememberDevice} onChange={e=>setRememberDevice(e.target.checked)} />
              Remember this device for 30 days
            </label>
            <button disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold disabled:opacity-60">Verify</button>
            <div className="mt-4 text-center text-sm dark:text-gray-300">
              <button type="button" className="text-blue-600 dark:text-blue-400 hover:underline" onClick={()=>{setMfaRequired(false); setPassword(''); setMfaCode('');}}>Back to login</button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
