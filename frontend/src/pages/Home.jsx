import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function DemoPreview() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-5 w-72 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Security Posture</span>
        <span className="text-xs text-green-500 font-semibold bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">Live</span>
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
          <span className="font-semibold text-orange-600 dark:text-orange-400 uppercase text-[10px]">High</span>
          <span className="text-gray-700 dark:text-gray-300 truncate">Missing DMARC record</span>
        </div>
        <div className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400">
          <span className="font-semibold text-yellow-600 dark:text-yellow-400 uppercase text-[10px]">Med</span>
          <span className="text-gray-700 dark:text-gray-300 truncate">Weak SPF policy</span>
        </div>
        <div className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400">
          <span className="font-semibold text-yellow-600 dark:text-yellow-400 uppercase text-[10px]">Med</span>
          <span className="text-gray-700 dark:text-gray-300 truncate">Missing security headers</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-slate-700 pt-3">
        <span>Last scan: 2 min ago</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
          All systems checked
        </span>
      </div>
    </div>
  )
}

export default function Home({ onStartWalkthrough }) {
  const navigate = useNavigate()
  const [showDemo, setShowDemo] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-cyber-darker dark:via-cyber-dark dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 dark:text-cyber-blue mb-6 dark:drop-shadow-[0_0_15px_rgba(0,217,255,0.5)]">
              Security Dashboard <span className="text-lg font-semibold text-gray-500 dark:text-gray-300">(Beta)</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Comprehensive security monitoring and vulnerability assessment platform.
              Track assets, run scans, and manage your organization's security posture.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                Get Started Free
              </button>
              <button
                onClick={onStartWalkthrough}
                className="bg-white dark:bg-cyber-dark border border-gray-300 dark:border-cyber-blue text-gray-800 dark:text-cyber-blue px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
              >
                Start Walkthrough
              </button>
              <button
                onClick={() => setShowDemo(v => !v)}
                className="text-sm text-blue-600 dark:text-blue-400 underline hover:no-underline"
              >
                {showDemo ? 'Hide preview' : 'See a preview →'}
              </button>
            </div>

            {/* Demo card inline below buttons */}
            {showDemo && (
              <div className="mt-6 animate-fade-in">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide font-semibold">
                  Sample Dashboard
                </p>
                <DemoPreview />
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {/* Atlantic IT Logo with Neon Effect and Golden Shield */}
            <div className="relative w-full max-w-md h-96 flex items-center justify-center">
              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur-3xl opacity-20 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-l from-blue-500 to-cyan-400 rounded-full blur-2xl opacity-15 animate-pulse" style={{animationDelay: '0.3s'}}></div>

              {/* Blue Shield Logo */}
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

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div
            onClick={() => navigate('/register')}
            className="bg-white dark:bg-cyber-dark p-6 rounded-lg shadow-md dark:shadow-cyber border-l-4 border-blue-500 dark:border-cyber-blue hover:dark:shadow-cyber-lg transition-all cursor-pointer hover:scale-105 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
          >
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold mb-2 dark:text-cyber-blue">Asset Management</h3>
            <p className="text-gray-600 dark:text-gray-300">Track and manage your network assets, domains, and IP addresses.</p>
          </div>

          <div
            onClick={() => navigate('/register')}
            className="bg-white dark:bg-cyber-dark p-6 rounded-lg shadow-md dark:shadow-cyber border-l-4 border-green-500 dark:border-cyber-blue hover:dark:shadow-cyber-lg transition-all cursor-pointer hover:scale-105 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
          >
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold mb-2 dark:text-cyber-blue">Security Scans</h3>
            <p className="text-gray-600 dark:text-gray-300">Run automated security scans to identify vulnerabilities and risks.</p>
          </div>

          <div
            onClick={() => navigate('/register')}
            className="bg-white dark:bg-cyber-dark p-6 rounded-lg shadow-md dark:shadow-cyber border-l-4 border-purple-500 dark:border-cyber-blue hover:dark:shadow-cyber-lg transition-all cursor-pointer hover:scale-105 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
          >
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2 dark:text-white">Dashboard Analytics</h3>
            <p className="text-gray-600 dark:text-gray-400">Visualize your security posture with comprehensive dashboards and reports.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
