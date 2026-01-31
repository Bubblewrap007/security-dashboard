import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import React, { useEffect, useState, useRef } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Scans from './pages/Scans'
import ScanDetails from './pages/ScanDetails'
import Nav from './components/Nav'
import Admin from './pages/Admin'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import Home from './pages/Home'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Account from './pages/Account'
import Walkthrough, { shouldShowWalkthrough } from './components/Walkthrough'
import ErrorBoundary from './components/ErrorBoundary'

function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(60)
  const idleTimers = useRef({ warning: null, logout: null, countdown: null })

  const isProtectedRoute = (path) => {
    const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email']
    return !publicPaths.includes(path)
  }

  const clearIdleTimers = () => {
    if (idleTimers.current.warning) clearTimeout(idleTimers.current.warning)
    if (idleTimers.current.logout) clearTimeout(idleTimers.current.logout)
    if (idleTimers.current.countdown) clearInterval(idleTimers.current.countdown)
  }

  const scheduleIdleTimers = () => {
    clearIdleTimers()
    setShowIdleWarning(false)
    setIdleSecondsLeft(60)

    const warningMs = 14 * 60 * 1000
    const logoutMs = 15 * 60 * 1000

    idleTimers.current.warning = setTimeout(() => {
      setShowIdleWarning(true)
      let remaining = 60
      setIdleSecondsLeft(remaining)
      idleTimers.current.countdown = setInterval(() => {
        remaining -= 1
        setIdleSecondsLeft(remaining)
        if (remaining <= 0) {
          clearIdleTimers()
        }
      }, 1000)
    }, warningMs)

    idleTimers.current.logout = setTimeout(async () => {
      clearIdleTimers()
      setShowIdleWarning(false)
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
      navigate('/login?message=idle-timeout')
    }, logoutMs)
  }

  useEffect(() => {
    if (!isProtectedRoute(location.pathname)) {
      clearIdleTimers()
      setShowIdleWarning(false)
      return
    }

    const handleActivity = () => {
      scheduleIdleTimers()
    }

    scheduleIdleTimers()
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(evt => window.addEventListener(evt, handleActivity))
    document.addEventListener('visibilitychange', handleActivity)

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleActivity))
      document.removeEventListener('visibilitychange', handleActivity)
      clearIdleTimers()
    }
  }, [location.pathname])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const forceTour = params.get('tour') === '1'
    if (forceTour || shouldShowWalkthrough()) {
      setShowWalkthrough(true)
    }
  }, [location.search])

  return (
    <>
      <Nav onStartWalkthrough={() => setShowWalkthrough(true)} />
      <Walkthrough open={showWalkthrough} onClose={() => setShowWalkthrough(false)} />
      {showIdleWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">You’re about to be signed out</h3>
            <p className="text-sm mb-4">For your security, you’ll be signed out in {idleSecondsLeft} seconds due to inactivity.</p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700"
                onClick={() => {
                  clearIdleTimers()
                  setShowIdleWarning(false)
                  scheduleIdleTimers()
                }}
              >
                Stay signed in
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
                onClick={async () => {
                  clearIdleTimers()
                  setShowIdleWarning(false)
                  await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
                  navigate('/login?message=idle-timeout')
                }}
              >
                Sign out now
              </button>
            </div>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home onStartWalkthrough={() => setShowWalkthrough(true)} />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/forgot-password" element={<ForgotPassword/>} />
        <Route path="/reset-password" element={<ResetPassword/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/verify-email" element={<VerifyEmail/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/account" element={<Account/>} />
        <Route path="/assets" element={<Assets/>} />
        <Route path="/scans" element={<Scans/>} />
        <Route path="/scans/:id" element={<ScanDetails/>} />
        <Route path="/admin" element={<Admin/>} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
    </BrowserRouter>
  )
}
