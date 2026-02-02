import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home({ onStartWalkthrough }) {
  const navigate = useNavigate()

  const handleCardClick = (path) => {
    navigate(path)
  }

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
            <div className="flex flex-wrap gap-4 items-center">
              <button
                onClick={onStartWalkthrough}
                className="bg-white dark:bg-cyber-dark border border-gray-300 dark:border-cyber-blue text-gray-800 dark:text-cyber-blue px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
              >
                Start Walkthrough
              </button>
            </div>
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
            onClick={() => handleCardClick('/assets')}
            className="bg-white dark:bg-cyber-dark p-6 rounded-lg shadow-md dark:shadow-cyber border-l-4 border-blue-500 dark:border-cyber-blue hover:dark:shadow-cyber-lg transition-all cursor-pointer hover:scale-105 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
          >
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold mb-2 dark:text-cyber-blue">Asset Management</h3>
            <p className="text-gray-600 dark:text-gray-300">Track and manage your network assets, domains, and IP addresses.</p>
          </div>
          
          <div 
            onClick={() => handleCardClick('/scans')}
            className="bg-white dark:bg-cyber-dark p-6 rounded-lg shadow-md dark:shadow-cyber border-l-4 border-green-500 dark:border-cyber-blue hover:dark:shadow-cyber-lg transition-all cursor-pointer hover:scale-105 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(0,217,255,0.3)]"
          >
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold mb-2 dark:text-cyber-blue">Security Scans</h3>
            <p className="text-gray-600 dark:text-gray-300">Run automated security scans to identify vulnerabilities and risks.</p>
          </div>
          
          <div 
            onClick={() => handleCardClick('/dashboard')}
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
