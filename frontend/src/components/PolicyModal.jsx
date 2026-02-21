import React from 'react'

const CONTENT = {
  tos: {
    title: 'Terms of Service',
    body: (
      <>
        <p className="mb-3">By registering for and using this application, you agree to the following terms:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>You will use the application only for lawful purposes.</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You will not attempt to disrupt, compromise, or reverse-engineer the service.</li>
          <li>We reserve the right to suspend or terminate accounts for violations of these terms.</li>
          <li>Data collected and processed is subject to our Privacy Policy.</li>
          <li>These terms may be updated at any time; continued use constitutes acceptance.</li>
        </ul>
        <p className="mt-4 text-gray-500 dark:text-gray-400">For questions, contact support.</p>
      </>
    ),
  },
  privacy: {
    title: 'Privacy Policy',
    body: (
      <>
        <p className="mb-3">Your privacy is important to us. Here's how we handle your information:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>We collect only the information necessary to provide and secure your account.</li>
          <li>Your email and personal data are never sold or shared with third parties except as required by law.</li>
          <li>All sensitive data is stored securely and encrypted where possible.</li>
          <li>You may request deletion of your account and associated data at any time.</li>
          <li>We use cookies for authentication and security purposes only — no ad tracking.</li>
          <li>This policy may be updated; continued use constitutes acceptance.</li>
        </ul>
        <p className="mt-4 text-gray-500 dark:text-gray-400">For questions, contact support.</p>
      </>
    ),
  },
}

export default function PolicyModal({ type, onClose }) {
  if (!type) return null

  const { title, body } = CONTENT[type]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-bold dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto text-sm text-gray-700 dark:text-gray-300 flex-1">
          {body}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
