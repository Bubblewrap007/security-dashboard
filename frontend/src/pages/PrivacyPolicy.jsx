import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto p-8 bg-white dark:bg-slate-800 rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-2">Your privacy is important to us. This policy explains how we collect, use, and protect your information:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>We collect only the information necessary to provide and secure your account.</li>
        <li>Your email and other personal data are never sold or shared with third parties except as required by law.</li>
        <li>All sensitive data is stored securely and encrypted where possible.</li>
        <li>You may request deletion of your account and associated data at any time.</li>
        <li>We use cookies and similar technologies for authentication and security.</li>
        <li>This policy may be updated; continued use constitutes acceptance of changes.</li>
      </ul>
      <p>For questions, contact support.</p>
    </div>
  );
}
