
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { apiFetch } from '../utils/api'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    try {
      const res = await apiFetch(`/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Registration failed')
        return
      }
      setSuccess(true)
      setTimeout(() => {
        if (email) {
          window.location.href = '/login?message=verify-email'
        } else {
          window.location.href = '/login'
        }
      }, 1200)
    } catch (err) {
      setError('Network error. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded shadow-md w-full max-w-md">
        <BackendStatusBanner className="mb-3" />
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Register</h2>
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        {success && <div className="text-green-600 dark:text-green-400 mb-4">Registration successful! {email ? 'Check your email for verification link.' : 'Redirecting...'}</div>}
        <label className="block mb-2 dark:text-gray-300">Username
          <input className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={username} onChange={e => setUsername(e.target.value)} required />
        </label>
        <label className="block mb-2 dark:text-gray-300">Email (for security verification)
          <input type="email" className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label className="block mb-4 dark:text-gray-300">Password
          <input type="password" className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        <button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-2 rounded font-semibold">Register</button>
        <div className="mt-4 text-center text-sm dark:text-gray-300">
          Already have an account? <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</Link>
        </div>
        <div className="mt-4 p-3 bg-blue-50 dark:bg-slate-700 border border-blue-200 dark:border-slate-600 rounded text-sm text-blue-700 dark:text-blue-300">
          <strong>Security Note:</strong> An email verification link will be sent to your email address to prevent unauthorized account access.
        </div>
      </form>
    </div>
  )
}
