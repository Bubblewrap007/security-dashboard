import React from 'react'
import BackendStatusBanner from '../components/BackendStatusBanner'

export default function Feedback() {
  const feedbackUrl = import.meta.env.VITE_FEEDBACK_URL || 'https://docs.google.com/forms/d/e/1FAIpQLSc4QSvesrQOFzhdt-WyWipZ9uCabAGJCUPBMzPSlw_JEfvwvg/viewform?usp=publish-editor'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-cyber-darker dark:via-cyber-dark dark:to-slate-900">
      <div className="container mx-auto px-4 py-10">
        <BackendStatusBanner className="mb-4" />
        <div className="bg-white dark:bg-cyber-dark rounded-lg shadow-lg dark:shadow-cyber p-6 border border-gray-200 dark:border-cyber-blue">
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-cyber-blue">Feedback</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Thanks for helping improve Security Dashboard. Please share any bugs, feature requests, or UX issues.
          </p>
          <div className="w-full aspect-[4/5] md:aspect-[16/9]">
            <iframe
              title="Security Dashboard Feedback Form"
              src={feedbackUrl}
              className="w-full h-full rounded border border-gray-200 dark:border-gray-700 bg-white"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            If the form doesn’t load, open it directly: <a className="text-blue-600 dark:text-cyber-blue underline" href={feedbackUrl} target="_blank" rel="noreferrer">Feedback form</a>.
          </div>
        </div>
      </div>
    </div>
  )
}
