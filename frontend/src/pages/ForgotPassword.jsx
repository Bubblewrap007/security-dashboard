import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { apiFetch } from '../utils/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [resetLink, setResetLink] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setResetLink(null)
    try {
      const res = await apiFetch(`/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Request failed')
        return
      }
      const data = await res.json()
      setSuccess(true)
      if (data.link) {
        setResetLink(data.link)
      }
    } catch (err) {
      setError(`Network error: ${err?.message || 'Please try again.'}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded shadow-md w-full max-w-md">
        <BackendStatusBanner className="mb-3" />
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Forgot password</h2>
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 mb-4 p-3 rounded">
            <p className="font-semibold mb-2">Check your email</p>
            <p>If the email exists in our system, password reset instructions have been sent.</p>
            {resetLink && (
              <div className="mt-3 p-2 bg-white dark:bg-slate-700 rounded text-xs break-all">
                <p className="dark:text-gray-300 mb-1">Reset link:</p>
                <a href={resetLink} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Click here to reset password
                </a>
              </div>
            )}
          </div>
        )}
        <label className="block mb-4 dark:text-gray-300">Email
          <input type="email" className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white mt-1" value={email} onChange={e => setEmail(e.target.value)} required disabled={success} />
        </label>
        <button disabled={success} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-2 rounded font-semibold disabled:opacity-50">Send reset link</button>
        <div className="mt-4 text-center text-sm dark:text-gray-300">
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Back to sign in</Link>
        </div>
      </form>
    </div>
  )
}
