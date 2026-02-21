
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { apiFetch } from '../utils/api'
import PolicyModal from '../components/PolicyModal'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [verificationLink, setVerificationLink] = useState(null)
  const [acceptTos, setAcceptTos] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [policyModal, setPolicyModal] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setVerificationLink(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!acceptTos || !acceptPrivacy) {
      setError('You must accept the Terms of Service and Privacy Policy to register.')
      return
    }
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
      const data = await res.json().catch(() => ({}))
      if (data?.verification_link) {
        setVerificationLink(data.verification_link)
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
        {success && (
          <div className="text-green-600 dark:text-green-400 mb-4">
            <div>Registration successful! {email ? 'Check your email for verification link.' : 'Redirecting...'}</div>
            {verificationLink && (
              <div className="mt-2 p-2 bg-white dark:bg-slate-700 rounded text-xs break-all">
                <p className="dark:text-gray-300 mb-1">Verification link:</p>
                <a href={verificationLink} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Click here to verify email
                </a>
              </div>
            )}
          </div>
        )}
        <label className="block mb-2 dark:text-gray-300">Username
          <input className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={username} onChange={e => setUsername(e.target.value)} required />
        </label>
        <label className="block mb-2 dark:text-gray-300">Email (for security verification)
          <input type="email" className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label className="block mb-2 dark:text-gray-300">Password
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full border px-3 py-2 pr-10 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
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
        <label className="block mb-4 dark:text-gray-300">Confirm Password
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full border px-3 py-2 pr-10 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
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
        <label className="block mb-4 text-sm dark:text-gray-300">
          <input type="checkbox" className="mr-2" checked={acceptTos} onChange={e => setAcceptTos(e.target.checked)} />
          I agree to the{' '}
          <button type="button" onClick={() => setPolicyModal('tos')} className="text-blue-600 dark:text-blue-400 underline hover:no-underline">
            Terms of Service
          </button>
        </label>
        <label className="block mb-4 text-sm dark:text-gray-300">
          <input type="checkbox" className="mr-2" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} />
          I agree to the{' '}
          <button type="button" onClick={() => setPolicyModal('privacy')} className="text-blue-600 dark:text-blue-400 underline hover:no-underline">
            Privacy Policy
          </button>
        </label>
        <button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-2 rounded font-semibold" disabled={!acceptTos || !acceptPrivacy}>Register</button>
        <div className="mt-4 text-center text-sm dark:text-gray-300">
          Already have an account? <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</Link>
        </div>
        <div className="mt-4 p-3 bg-blue-50 dark:bg-slate-700 border border-blue-200 dark:border-slate-600 rounded text-sm text-blue-700 dark:text-blue-300">
          <strong>Security Note:</strong> An email verification link will be sent to your email address to prevent unauthorized account access.
        </div>
      </form>
      <PolicyModal type={policyModal} onClose={() => setPolicyModal(null)} />
    </div>
  )
}
