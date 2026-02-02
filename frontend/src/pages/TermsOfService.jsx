import React from 'react';

export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto p-8 bg-white dark:bg-slate-800 rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
      <p className="mb-2">By registering for and using this application, you agree to the following terms of service:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>You will use the application only for lawful purposes.</li>
        <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
        <li>You will not attempt to disrupt, compromise, or reverse-engineer the service.</li>
        <li>We reserve the right to suspend or terminate accounts for violations of these terms.</li>
        <li>Data collected and processed by the application is subject to our Privacy Policy.</li>
        <li>These terms may be updated at any time; continued use constitutes acceptance of changes.</li>
      </ul>
      <p>For questions, contact support.</p>
    </div>
  );
}
