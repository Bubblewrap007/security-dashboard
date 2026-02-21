import React, { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'sd_walkthrough_seen'

export default function Walkthrough({ open, onClose }) {
  const steps = useMemo(() => ([
    {
      title: 'Welcome to Securalith',
      body: 'This quick tour shows you the main areas: login, assets, scans, and reports.'
    },
    {
      title: 'Sign in or Register',
      body: 'Use the navigation bar to sign in or create an account.'
    },
    {
      title: 'Dashboard',
      body: 'After login you will see your security overview and trends.'
    },
    {
      title: 'Assets',
      body: 'Add emails or domains so they can be scanned.'
    },
    {
      title: 'Scans & Reports',
      body: 'Run scans, review findings, and download PDF reports.'
    }
  ]), [])

  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    setIndex(0)
  }, [open])

  if (!open) return null

  const step = steps[index]
  const isFirst = index === 0
  const isLast = index === steps.length - 1

  function handleDone() {
    localStorage.setItem(STORAGE_KEY, 'true')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-cyber-dark rounded-lg shadow-lg dark:shadow-cyber w-full max-w-lg p-6 border border-cyber-blue border-opacity-30">
        <div className="text-sm text-gray-400 mb-2">Step {index + 1} of {steps.length}</div>
        <h2 className="text-xl font-semibold mb-3 text-cyber-blue">{step.title}</h2>
        <p className="text-gray-300 mb-6">{step.body}</p>
        <div className="flex items-center justify-between">
          <button onClick={handleDone} className="px-3 py-1 rounded bg-cyber-blue hover:bg-cyber-glow text-white font-semibold shadow-cyber">Skip</button>
          <div className="space-x-2">
            {!isFirst && (
              <button onClick={() => setIndex(i => i - 1)} className="px-3 py-1 rounded border border-gray-600 text-gray-300 hover:border-cyber-blue hover:text-cyber-blue transition">Back</button>
            )}
            {!isLast && (
              <button onClick={() => setIndex(i => i + 1)} className="px-3 py-1 rounded bg-cyber-blue hover:bg-cyber-glow text-white font-semibold shadow-cyber">Next</button>
            )}
            {isLast && (
              <button onClick={handleDone} className="px-3 py-1 rounded bg-cyber-blue hover:bg-cyber-glow text-white font-semibold shadow-cyber">Finish</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function shouldShowWalkthrough() {
  return localStorage.getItem(STORAGE_KEY) !== 'true'
}
