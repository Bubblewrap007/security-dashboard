import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../utils/api'

export default function Nav({ onStartWalkthrough }){
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [backendHealthy, setBackendHealthy] = useState(null)
  const [darkMode, setDarkMode] = useState(false)

  const handleSignout = async () => {
    try {
      await apiFetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setIsAuthenticated(false);
      window.location.href = '/login';
    } catch (e) {
      console.error('Logout failed:', e);
    }
  }

  useEffect(()=>{
    (async ()=>{
      try{
        const r = await apiFetch('/api/v1/auth/me', {credentials: 'include'})
        if(r.ok){
          const data = await r.json();
          setIsAuthenticated(true)
          setIsAdmin(Boolean(data.is_superuser))
        } else {
          setIsAuthenticated(false)
        }
      }catch(e){
        setIsAuthenticated(false)
      }
    })()
  },[])

  useEffect(() => {
    const stored = localStorage.getItem('sd_dark_mode')
    const enabled = stored === null ? true : stored === 'true' // Default to dark mode
    setDarkMode(enabled)
    document.documentElement.classList.toggle('dark', enabled)
    if (stored === null) {
      localStorage.setItem('sd_dark_mode', 'true')
    }
  }, [])

  function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('sd_dark_mode', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  useEffect(()=>{
    let alive = true
    const check = async () => {
      try{
        const r = await apiFetch('/health')
        if (!alive) return
        setBackendHealthy(r.ok)
      }catch(e){
        if (!alive) return
        setBackendHealthy(false)
      }
    }
    check()
    const id = setInterval(check, 10000)
    return () => { alive = false; clearInterval(id) }
  },[])

  return (
    <nav className="bg-white dark:bg-slate-900 dark:text-gray-100 shadow px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <button onClick={onStartWalkthrough} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-2 py-1 rounded">Help</button>
        </div>
        <div className="flex-1 flex justify-center items-center space-x-2">
          <img src="/shield-logo.svg" alt="Shield" className="w-6 h-6 drop-shadow-lg" />
          <Link to="/" className="font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">Security Dashboard</Link>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400" title="Backend service status">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${backendHealthy === null ? 'bg-gray-300' : backendHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            {backendHealthy === null ? 'Checking…' : backendHealthy ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">Dashboard</Link>
              <Link to="/account" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">Account</Link>
              <Link to="/assets" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">Assets</Link>
              <Link to="/scans" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">Scans</Link>
              {isAdmin && <Link to="/admin" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">Admin</Link>}
              <button onClick={handleSignout} className="text-sm font-semibold px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">Login</Link>
              <Link to="/register" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
