import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token')
      
      if (!token) {
        setStatus('error')
        setMessage('No verification token provided.')
        return
      }

      try {
        const response = await fetch('/api/v1/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        if (!response.ok) {
          const data = await response.json()
          setStatus('error')
          setMessage(data.detail || 'Email verification failed.')
          return
        }

        setStatus('success')
        setMessage('Email verified successfully!')
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } catch (err) {
        setStatus('error')
        setMessage('Network error. Please try again later.')
      }
    }

    verifyToken()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-md w-full max-w-md text-center">
        <BackendStatusBanner className="mb-3" />
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Email Verification</h2>
        
        {status === 'verifying' && (
          <div>
            <div className="mb-4">
              <div className="inline-block animate-spin">
                <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="mb-4">
              <div className="text-green-600 dark:text-green-400">
                <svg className="h-12 w-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="text-green-600 dark:text-green-400 font-semibold">{message}</p>
            <p className="text-gray-600 dark:text-gray-300 mt-4">Redirecting to login...</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="mb-4">
              <div className="text-red-600 dark:text-red-400">
                <svg className="h-12 w-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="text-red-600 dark:text-red-400 font-semibold">{message}</p>
            <button 
              onClick={() => navigate('/login')}
              className="mt-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-2 px-4 rounded font-semibold"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
