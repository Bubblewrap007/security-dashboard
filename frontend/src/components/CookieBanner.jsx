import React, { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookies_accepted')) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  function accept() {
    localStorage.setItem('cookies_accepted', '1')
    setVisible(false)
  }

  function decline() {
    setVisible(false)
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-2xl shadow-2xl p-5 flex flex-col items-center text-center gap-3">
        <div className="text-4xl select-none">🍪</div>
        <div>
          <p className="font-bold text-gray-900 dark:text-white text-base">Free Cookies?</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            We use cookies for login &amp; security — no trackers, no ads. Just the good kind.
          </p>
        </div>
        <div className="flex gap-2 w-full mt-1">
          <button
            onClick={accept}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            Yum, accept!
          </button>
          <button
            onClick={decline}
            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 text-sm py-2 rounded-lg transition-colors"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  )
}
