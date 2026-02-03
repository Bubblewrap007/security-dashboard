import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BackendStatusBanner from '../components/BackendStatusBanner';
import { apiFetch } from '../utils/api';

export default function RecoverAccount() {
  const [identifier, setIdentifier] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', answer: '' },
    { question: '', answer: '' },
    { question: '', answer: '' },
  ]);
  const [backupCode, setBackupCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuestionChange = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!identifier.trim() || questions.some(q => !q.question.trim() || !q.answer.trim()) || (!backupCode && !emailCode) || !newPassword || newPassword !== confirmPassword) {
      setError('All fields are required and passwords must match.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/recover-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          questions,
          backup_code: backupCode || undefined,
          email_code: emailCode || undefined,
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || data.msg || 'Recovery failed');
        setLoading(false);
        return;
      }
      setSuccess('Account recovered and password reset. You can now log in.');
      setLoading(false);
    } catch (err) {
      setError(`Network error: ${err?.message || 'Please try again.'}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded shadow-md w-full max-w-lg">
        <BackendStatusBanner className="mb-3" />
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Account Recovery</h2>
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        {success && <div className="text-green-600 dark:text-green-400 mb-4">{success}</div>}
        <label className="block mb-4 dark:text-gray-300">Username or Email
          <input className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" />
        </label>
        {[0,1,2].map(idx => (
          <div key={idx} className="mb-4">
            <label className="block mb-1 dark:text-gray-300">Security Question {idx+1}
              <input type="text" className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={questions[idx].question} onChange={e=>handleQuestionChange(idx, 'question', e.target.value)} placeholder={`Enter question ${idx+1}`} />
            </label>
            <label className="block mt-1 dark:text-gray-300">Answer
              <input type="text" className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={questions[idx].answer} onChange={e=>handleQuestionChange(idx, 'answer', e.target.value)} placeholder="Enter answer" />
            </label>
          </div>
        ))}
        <label className="block mb-4 dark:text-gray-300">Backup Code (or Email Code)
          <input className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={backupCode} onChange={e=>setBackupCode(e.target.value)} placeholder="Enter backup code (or leave blank if using email code)" />
        </label>
        <label className="block mb-4 dark:text-gray-300">Email Code (or Backup Code)
          <input className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={emailCode} onChange={e=>setEmailCode(e.target.value)} placeholder="Enter email code (or leave blank if using backup code)" />
        </label>
        <label className="block mb-4 dark:text-gray-300">New Password
          <input type="password" className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
        </label>
        <label className="block mb-4 dark:text-gray-300">Confirm New Password
          <input type="password" className="w-full border px-3 py-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} />
        </label>
        <button disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded font-semibold disabled:opacity-60">Recover Account</button>
        <div className="mt-4 text-center text-sm dark:text-gray-300">
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Back to login</Link>
        </div>
      </form>
    </div>
  );
}
