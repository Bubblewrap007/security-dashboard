import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/api'

function DemoPreview() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-5 w-full max-w-sm select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Security Posture</span>
        <span className="text-xs text-green-500 font-semibold bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">Sample</span>
      </div>

      {/* Score ring */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" className="dark:stroke-slate-700" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22c55e" strokeWidth="3"
              strokeDasharray="87 100" strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-green-500">87</span>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">87<span className="text-sm font-normal text-gray-400">/100</span></div>
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">Good standing</div>
          <div className="text-xs text-gray-400 mt-0.5">4 assets monitored</div>
        </div>
      </div>

      {/* Finding counts */}
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        <div className="rounded-lg py-2 text-center bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
          <div className="text-base font-bold text-red-600 dark:text-red-400">0</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Crit</div>
        </div>
        <div className="rounded-lg py-2 text-center bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/40">
          <div className="text-base font-bold text-orange-500 dark:text-orange-400">1</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">High</div>
        </div>
        <div className="rounded-lg py-2 text-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/40">
          <div className="text-base font-bold text-yellow-600 dark:text-yellow-400">3</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Med</div>
        </div>
        <div className="rounded-lg py-2 text-center bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600">
          <div className="text-base font-bold text-gray-500 dark:text-gray-400">5</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Low</div>
        </div>
      </div>

      {/* Mini findings */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-orange-50 dark:bg-orange-900/20 border-l-2 border-orange-400">
          <span className="font-semibold text-orange-600 dark:text-orange-400 uppercase text-[10px] shrink-0">High</span>
          <span className="text-gray-700 dark:text-gray-300 truncate">Missing DMARC record</span>
        </div>
        <div className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400">
          <span className="font-semibold text-yellow-600 dark:text-yellow-400 uppercase text-[10px] shrink-0">Med</span>
          <span className="text-gray-700 dark:text-gray-300 truncate">Weak SPF policy</span>
        </div>
        <div className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-gray-50 dark:bg-slate-700 border-l-2 border-gray-300 dark:border-slate-500">
          <span className="font-semibold text-gray-500 dark:text-gray-400 uppercase text-[10px] shrink-0">Low</span>
          <span className="text-gray-700 dark:text-gray-300 truncate">No breaches detected ✓</span>
        </div>
      </div>

      {/* Posture trend chart */}
      <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Posture Trend</span>
          <span className="text-xs text-green-500 font-medium">↑ +27 pts over 8 wks</span>
        </div>
        <svg viewBox="0 0 200 55" className="w-full h-14" preserveAspectRatio="none">
          <defs>
            <linearGradient id="demoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path
            d="M 0,55 L 0,50 L 29,42 L 57,45 L 86,33 L 114,30 L 143,20 L 171,13 L 200,5 L 200,55 Z"
            fill="url(#demoGrad)"
          />
          {/* Line */}
          <path
            d="M 0,50 L 29,42 L 57,45 L 86,33 L 114,30 L 143,20 L 171,13 L 200,5"
            fill="none" stroke="#22c55e" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
          />
          {/* End dot */}
          <circle cx="200" cy="5" r="2.5" fill="#22c55e" />
        </svg>
        <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
          <span>8 wks ago</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  )
}

export default function Home({ onStartWalkthrough }) {
  const navigate = useNavigate()
  const [authStatus, setAuthStatus] = useState('checking') // 'checking' | 'loggedin' | 'guest'

  useEffect(() => {
    apiFetch('/api/v1/auth/me', { credentials: 'include' })
      .then(r => setAuthStatus(r.ok ? 'loggedin' : 'guest'))
      .catch(() => setAuthStatus('guest'))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-cyber-darker dark:via-cyber-dark dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">

        {/* Hero */}
        <div className="grid md:grid-cols-2 gap-12 items-start mb-20">
          {/* Left: copy + CTAs */}
          <div>
            <h1 className="text-5xl font-bold text-gray-900 dark:text-cyber-blue mb-6 dark:drop-shadow-[0_0_15px_rgba(0,217,255,0.5)] leading-tight">
              Security Dashboard <span className="text-lg font-semibold text-gray-500 dark:text-gray-300">(Beta)</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              Comprehensive security monitoring for your organisation — without the enterprise price tag.
            </p>

            {/* Feature bullets */}
            <ul className="space-y-2 mb-8">
              {[
                '🔍 DNS, SPF, DMARC & DKIM checks',
                '🔐 TLS certificate & HTTPS monitoring',
                '🛡️ Web security header analysis',
                '📧 Email breach detection via HIBP',
                '📊 Posture trend charts & PDF reports',
                '🗂️ Asset groups with per-group scoring',
              ].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 items-center">
              {authStatus === 'loggedin' ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
                >
                  Go to Dashboard →
                </button>
              ) : (
                <button
                  onClick={() => navigate('/register')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
                >
                  Get Started Free
                </button>
              )}
              <button
                onClick={onStartWalkthrough}
                className="bg-white dark:bg-cyber-dark border border-gray-300 dark:border-cyber-blue text-gray-800 dark:text-cyber-blue px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
              >
                Start Walkthrough
              </button>
            </div>
          </div>

          {/* Right: shield logo */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-xl h-[520px] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur-3xl opacity-20 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-l from-blue-500 to-cyan-400 rounded-full blur-2xl opacity-15 animate-pulse" style={{animationDelay: '0.3s'}}></div>
              <div className="relative z-10 w-full h-full drop-shadow-[0_0_30px_rgba(0,217,255,0.4)]">
                <img
                  src="/shield-logo.svg"
                  alt="Security Shield Logo"
                  className="w-full h-full object-contain drop-shadow-[0_10px_40px_rgba(0,100,200,0.5)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Demo preview */}
        <div className="flex flex-col items-center mb-16">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-widest font-semibold">
            Sample Dashboard Preview
          </p>
          <DemoPreview />
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          <div
            onClick={() => navigate(authStatus === 'loggedin' ? '/assets' : '/register')}
            className="bg-white dark:bg-cyber-dark p-6 rounded-lg shadow-md dark:shadow-cyber border-l-4 border-blue-500 dark:border-cyber-blue hover:dark:shadow-cyber-lg transition-all cursor-pointer hover:scale-105 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
          >
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold mb-2 dark:text-cyber-blue">Asset Management</h3>
            <p className="text-gray-600 dark:text-gray-300">Track domains, emails, IPs, and URLs. Organise assets into groups and monitor each group's security posture separately.</p>
          </div>

          <div
            onClick={() => navigate(authStatus === 'loggedin' ? '/scans' : '/register')}
            className="bg-white dark:bg-cyber-dark p-6 rounded-lg shadow-md dark:shadow-cyber border-l-4 border-green-500 dark:border-cyber-blue hover:dark:shadow-cyber-lg transition-all cursor-pointer hover:scale-105 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
          >
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold mb-2 dark:text-cyber-blue">Security Scans</h3>
            <p className="text-gray-600 dark:text-gray-300">Run automated checks for DNS misconfigs, weak TLS, missing headers, open ports, and email breach exposure.</p>
          </div>

          <div
            onClick={() => navigate(authStatus === 'loggedin' ? '/dashboard' : '/register')}
            className="bg-white dark:bg-cyber-dark p-6 rounded-lg shadow-md dark:shadow-cyber border-l-4 border-purple-500 dark:border-cyber-blue hover:dark:shadow-cyber-lg transition-all cursor-pointer hover:scale-105 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
          >
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2 dark:text-white">Dashboard Analytics</h3>
            <p className="text-gray-600 dark:text-gray-400">Track your security posture over time with trend charts, downloadable PDF reports, and AI-powered analysis.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
