import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { apiFetch } from '../utils/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('No reset token provided. Please use the link from your email.')
    }
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!password || !confirmPassword) {
      setError('Both password fields are required')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch(`/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Password reset failed')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(`Error: ${err?.message || 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded shadow-md w-full max-w-md">
        <BackendStatusBanner className="mb-3" />
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Reset Password</h2>
        
        {!token && (
          <div className="text-red-600 dark:text-red-400 mb-4">
            Invalid reset link. Please request a new password reset.
          </div>
        )}
        
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        {success && <div className="text-green-600 dark:text-green-400 mb-4">Password reset successful! Redirecting to login...</div>}

        <label className="block mb-4 dark:text-gray-300">
          New Password
          <input
            type="password"
            className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white mt-1"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={!token || success}
            required
          />
        </label>

        <label className="block mb-6 dark:text-gray-300">
          Confirm Password
          <input
            type="password"
            className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white mt-1"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            disabled={!token || success}
            required
          />
        </label>

        <button
          disabled={!token || success || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  )
}
