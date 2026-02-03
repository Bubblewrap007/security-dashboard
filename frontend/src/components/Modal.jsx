import React from 'react';

export default function Modal({ open, onClose, title, children, confirmText, onConfirm, disabled }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 max-w-md w-full relative">
        <h2 className="text-lg font-bold mb-2 dark:text-cyber-blue">{title}</h2>
        <div className="mb-4 text-gray-700 dark:text-gray-200">{children}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600">Cancel</button>
          <button onClick={onConfirm} disabled={disabled} className="px-4 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50">{confirmText || 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}
