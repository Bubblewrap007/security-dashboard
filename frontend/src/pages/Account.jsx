import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Account() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Email update
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Email verification
  const [resendVerificationLoading, setResendVerificationLoading] = useState(false);
  const [resendVerificationError, setResendVerificationError] = useState('');

  // MFA state management
  const [mfaSetupStep, setMfaSetupStep] = useState(null); // null, 'totp', 'email', 'phone'
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaUri, setMfaUri] = useState('');
  const [mfaVerificationCode, setMfaVerificationCode] = useState('');
  const [mfaBackupCodes, setMfaBackupCodes] = useState([]);
  const [mfaVerifyError, setMfaVerifyError] = useState('');
  const [mfaEmail, setMfaEmail] = useState('');
  const [mfaPhone, setMfaPhone] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showDisableMfaConfirm, setShowDisableMfaConfirm] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Load user data
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) navigate('/login');
        throw new Error('Failed to load user data');
      }
      const userData = await response.json();
      setUser(userData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Password change handler
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to change password');
      }

      setSuccess('Password changed successfully');
      setShowPasswordForm(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setPasswordError(err.message);
    }
  };

  // Email update handler
  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    setEmailError('');

    try {
      const response = await fetch('/api/v1/auth/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: newEmail }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update email');
      }

      setSuccess('Email updated successfully');
      setShowEmailForm(false);
      setNewEmail('');
      await loadUserData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setEmailError(err.message);
    }
  };

  // Resend email verification handler
  const handleResendVerification = async () => {
    setResendVerificationLoading(true);
    setResendVerificationError('');
    
    try {
      const response = await fetch('/api/v1/auth/resend-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || data.message || 'Failed to resend verification email');
      }

      setSuccess('Verification email sent! Check your inbox.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setResendVerificationError(err.message);
    } finally {
      setResendVerificationLoading(false);
    }
  };

  // Setup TOTP
  const setupTOTP = async () => {
    try {
      const response = await fetch('/api/v1/auth/mfa/setup-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to setup TOTP');

      const data = await response.json();
      setMfaSecret(data.secret);
      setMfaUri(data.uri);
      setMfaSetupStep('totp');
      setMfaVerificationCode('');
      setMfaVerifyError('');
    } catch (err) {
      setMfaVerifyError(err.message);
    }
  };

  // Verify TOTP
  const verifyTOTP = async () => {
    try {
      const response = await fetch('/api/v1/auth/mfa/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: mfaVerificationCode,
          secret: mfaSecret,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Invalid TOTP code');
      }

      const data = await response.json();
      setMfaBackupCodes(data.backup_codes);
      setShowBackupCodes(true);
      setSuccess('TOTP MFA enabled! Save your backup codes in a safe place.');
      setTimeout(() => {
        setMfaSetupStep(null);
        loadUserData();
      }, 3000);
    } catch (err) {
      setMfaVerifyError(err.message);
    }
  };

  // Setup Email MFA
  const setupEmailMFA = async () => {
    try {
      const response = await fetch('/api/v1/auth/mfa/setup-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to setup email MFA');

      setMfaSetupStep('email');
      setMfaVerificationCode('');
      setMfaVerifyError('');
      setSuccess('Verification code sent to your email');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setMfaVerifyError(err.message);
    }
  };

  // Verify Email MFA
  const verifyEmailMFA = async () => {
    try {
      const response = await fetch('/api/v1/auth/mfa/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: mfaVerificationCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Invalid code');
      }

      const data = await response.json();
      setMfaBackupCodes(data.backup_codes);
      setShowBackupCodes(true);
      setSuccess('Email MFA enabled! Save your backup codes in a safe place.');
      setTimeout(() => {
        setMfaSetupStep(null);
        loadUserData();
      }, 3000);
    } catch (err) {
      setMfaVerifyError(err.message);
    }
  };

  // Setup Phone MFA
  const setupPhoneMFA = async () => {
    try {
      const response = await fetch('/api/v1/auth/mfa/setup-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone_number: mfaPhone }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to setup phone MFA');
      }

      setMfaSetupStep('phone');
      setMfaVerificationCode('');
      setMfaVerifyError('');
      setSuccess('Verification code sent to your phone');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setMfaVerifyError(err.message);
    }
  };

  // Verify Phone MFA
  const verifyPhoneMFA = async () => {
    try {
      const response = await fetch('/api/v1/auth/mfa/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: mfaVerificationCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Invalid code');
      }

      const data = await response.json();
      setMfaBackupCodes(data.backup_codes);
      setShowBackupCodes(true);
      setSuccess('Phone MFA enabled! Save your backup codes in a safe place.');
      setTimeout(() => {
        setMfaSetupStep(null);
        loadUserData();
      }, 3000);
    } catch (err) {
      setMfaVerifyError(err.message);
    }
  };

  // Disable MFA
  const disableMFA = async () => {
    try {
      const response = await fetch('/api/v1/auth/mfa/disable', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to disable MFA');

      setSuccess('MFA disabled');
      setShowDisableMfaConfirm(false);
      await loadUserData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Copy backup codes
  const copyBackupCodes = () => {
    const text = mfaBackupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setSuccess('Backup codes copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Logout
  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/');
  };

  // Delete account
  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeletingAccount(true);

    try {
      const response = await fetch('/api/v1/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: deletePassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete account');
      }

      // Redirect to home page after successful deletion
      navigate('/', { state: { message: 'Your account has been permanently deleted.' } });
    } catch (err) {
      setDeleteError(err.message);
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-xl text-cyan-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-600 rounded text-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-900 border border-green-600 rounded text-green-100">
            {success}
          </div>
        )}

        {/* Account Information Card */}
        <div className="mb-8 p-6 border border-cyan-700 rounded-lg bg-gray-900 shadow-lg shadow-cyan-900/20">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400">Username:</span>
              <span className="ml-2 text-white font-mono">{user?.username}</span>
            </div>
            <div>
              <span className="text-gray-400">Email:</span>
              <span className="ml-2 text-white font-mono">{user?.email}</span>
              {user?.email && (
                <div className="ml-2 inline-block">
                  {user?.email_verified ? (
                    <span className="text-green-400 text-sm font-mono">✓ Verified</span>
                  ) : (
                    <span className="text-yellow-400 text-sm font-mono">⚠ Not Verified</span>
                  )}
                </div>
              )}
            </div>
            <div>
              <span className="text-gray-400">Last Login:</span>
              <span className="ml-2 text-white font-mono">
                {user?.last_login 
                  ? new Date(user.last_login).toLocaleString()
                  : 'Never'
                }
              </span>
            </div>
            <div className="pt-2 border-t border-gray-700">
              <span className="text-gray-400">MFA Status:</span>
              {user?.mfa_enabled ? (
                <span className="ml-2 text-green-400 font-mono">
                  ✓ Enabled ({user?.mfa_method?.toUpperCase()})
                </span>
              ) : (
                <span className="ml-2 text-yellow-400 font-mono">✗ Disabled</span>
              )}
            </div>
          </div>
        </div>

        {/* Email Verification Card */}
        {user?.email && !user?.email_verified && (
          <div className="mb-8 p-4 border border-yellow-600 rounded-lg bg-yellow-900/20 shadow-lg shadow-yellow-900/10">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-yellow-400 mb-2">Email Verification Required</h3>
                <p className="text-sm text-yellow-200">
                  Your email address needs to be verified for security purposes. A verification link has been sent to {user?.email}.
                </p>
              </div>
            </div>
            {resendVerificationError && (
              <p className="text-red-400 text-sm mt-3">{resendVerificationError}</p>
            )}
            <button
              onClick={handleResendVerification}
              disabled={resendVerificationLoading}
              className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-semibold transition text-sm"
            >
              {resendVerificationLoading ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>
        )}

        {/* Update Email Card */}
        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="mb-8 w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
          >
            Update Email
          </button>
        ) : (
          <div className="mb-8 p-6 border border-blue-600 rounded-lg bg-gray-900">
            <h3 className="text-xl font-bold text-blue-400 mb-4">Update Email</h3>
            <form onSubmit={handleEmailUpdate}>
              <input
                type="email"
                placeholder="New email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 mb-3 focus:outline-none focus:border-blue-500"
                required
              />
              {emailError && <p className="text-red-400 mb-3">{emailError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false);
                    setNewEmail('');
                    setEmailError('');
                  }}
                  className="flex-1 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Change Password Card */}
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="mb-8 w-full p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-semibold"
          >
            Change Password
          </button>
        ) : (
          <div className="mb-8 p-6 border border-purple-600 rounded-lg bg-gray-900">
            <h3 className="text-xl font-bold text-purple-400 mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <input
                type="password"
                placeholder="Current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 mb-3 focus:outline-none focus:border-purple-500"
                required
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 mb-3 focus:outline-none focus:border-purple-500"
                required
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 mb-3 focus:outline-none focus:border-purple-500"
                required
              />
              {passwordError && <p className="text-red-400 mb-3">{passwordError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition"
                >
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  className="flex-1 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MFA Setup Card */}
        <div className="mb-8 p-6 border border-green-700 rounded-lg bg-gray-900 shadow-lg shadow-green-900/20">
          <h2 className="text-2xl font-bold text-green-400 mb-4">Multi-Factor Authentication</h2>

          {!mfaSetupStep && (
            <>
              {!user?.mfa_enabled ? (
                <>
                  <p className="text-gray-400 mb-4">
                    Add an extra layer of security to your account with MFA.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={setupTOTP}
                      className="p-4 bg-green-700 hover:bg-green-600 text-white rounded-lg transition font-semibold"
                    >
                      🔐 Authenticator App
                    </button>
                    <button
                      onClick={setupEmailMFA}
                      className="p-4 bg-green-700 hover:bg-green-600 text-white rounded-lg transition font-semibold"
                    >
                      📧 Email Code
                    </button>
                    <button
                      onClick={() => setMfaSetupStep('phone-input')}
                      className="p-4 bg-green-700 hover:bg-green-600 text-white rounded-lg transition font-semibold"
                    >
                      📱 SMS Code
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-green-300 mb-4">✓ MFA is currently enabled via {user?.mfa_method?.toUpperCase()}</p>
                  <button
                    onClick={() => setShowDisableMfaConfirm(true)}
                    className="w-full p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold"
                  >
                    Disable MFA
                  </button>
                </>
              )}
            </>
          )}

          {/* TOTP Setup */}
          {mfaSetupStep === 'totp' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-green-400">Setup Authenticator App</h3>
              <p className="text-gray-400">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
              </p>
              {mfaUri && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      mfaUri
                    )}`}
                    alt="TOTP QR Code"
                    className="w-48 h-48"
                  />
                </div>
              )}
              <p className="text-gray-400 text-sm">
                Or enter this secret manually: <code className="bg-gray-800 px-2 py-1 rounded">{mfaSecret}</code>
              </p>
              <input
                type="text"
                placeholder="Enter 6-digit code from app"
                value={mfaVerificationCode}
                onChange={(e) => setMfaVerificationCode(e.target.value.slice(0, 6))}
                maxLength="6"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-center text-2xl tracking-widest focus:outline-none focus:border-green-500"
              />
              {mfaVerifyError && <p className="text-red-400">{mfaVerifyError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={verifyTOTP}
                  className="flex-1 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
                >
                  Verify & Enable
                </button>
                <button
                  onClick={() => {
                    setMfaSetupStep(null);
                    setMfaVerificationCode('');
                    setMfaVerifyError('');
                  }}
                  className="flex-1 p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Email Setup */}
          {mfaSetupStep === 'email' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-green-400">Verify Email</h3>
              <p className="text-gray-400">
                Enter the 6-digit code we sent to {user?.email}
              </p>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={mfaVerificationCode}
                onChange={(e) => setMfaVerificationCode(e.target.value.slice(0, 6))}
                maxLength="6"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-center text-2xl tracking-widest focus:outline-none focus:border-green-500"
              />
              {mfaVerifyError && <p className="text-red-400">{mfaVerifyError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={verifyEmailMFA}
                  className="flex-1 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
                >
                  Verify & Enable
                </button>
                <button
                  onClick={() => {
                    setMfaSetupStep(null);
                    setMfaVerificationCode('');
                    setMfaVerifyError('');
                  }}
                  className="flex-1 p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Phone Input */}
          {mfaSetupStep === 'phone-input' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-green-400">Setup SMS</h3>
              <p className="text-gray-400">Enter your phone number to receive SMS codes</p>
              <input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={mfaPhone}
                onChange={(e) => setMfaPhone(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
              {mfaVerifyError && <p className="text-red-400">{mfaVerifyError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={setupPhoneMFA}
                  className="flex-1 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
                >
                  Send Code
                </button>
                <button
                  onClick={() => {
                    setMfaSetupStep(null);
                    setMfaPhone('');
                    setMfaVerifyError('');
                  }}
                  className="flex-1 p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Phone Verification */}
          {mfaSetupStep === 'phone' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-green-400">Verify Phone</h3>
              <p className="text-gray-400">
                Enter the 6-digit code we sent to {mfaPhone}
              </p>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={mfaVerificationCode}
                onChange={(e) => setMfaVerificationCode(e.target.value.slice(0, 6))}
                maxLength="6"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-center text-2xl tracking-widest focus:outline-none focus:border-green-500"
              />
              {mfaVerifyError && <p className="text-red-400">{mfaVerifyError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={verifyPhoneMFA}
                  className="flex-1 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
                >
                  Verify & Enable
                </button>
                <button
                  onClick={() => {
                    setMfaSetupStep(null);
                    setMfaVerificationCode('');
                    setMfaVerifyError('');
                  }}
                  className="flex-1 p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Backup Codes Modal */}
        {showBackupCodes && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-yellow-600 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">📋 Save Your Backup Codes</h3>
              <p className="text-gray-400 mb-4">
                Save these codes in a safe place. You can use them to access your account if you lose access to your MFA device.
              </p>
              <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-4 max-h-48 overflow-y-auto">
                <code className="text-sm text-green-400 whitespace-pre-wrap font-mono">
                  {mfaBackupCodes.join('\n')}
                </code>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyBackupCodes}
                  className="flex-1 p-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition font-semibold"
                >
                  📋 Copy Codes
                </button>
                <button
                  onClick={() => {
                    setShowBackupCodes(false);
                    setMfaBackupCodes([]);
                  }}
                  className="flex-1 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
                >
                  ✓ Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disable MFA Confirmation */}
        {showDisableMfaConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-red-600 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold text-red-400 mb-4">⚠️ Disable MFA?</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to disable MFA? This will make your account less secure.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={disableMFA}
                  className="flex-1 p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold"
                >
                  Disable MFA
                </button>
                <button
                  onClick={() => setShowDisableMfaConfirm(false)}
                  className="flex-1 p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button - Top */}
        <button
          onClick={handleLogout}
          className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold mb-4"
        >
          Logout
        </button>

        {/* Delete Account Button */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold"
        >
          Delete Account
        </button>

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border-2 border-red-600 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold text-red-400 mb-4">⚠️ Delete Account Permanently?</h3>
              <p className="text-gray-400 mb-4">
                This action <span className="font-bold text-red-400">CANNOT BE UNDONE</span>. All your data, scans, and settings will be permanently deleted.
              </p>
              <p className="text-gray-300 mb-4 font-semibold">
                Enter your password to confirm:
              </p>
              
              {deleteError && (
                <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded text-red-100 text-sm">
                  {deleteError}
                </div>
              )}
              
              <input
                type="password"
                placeholder="Your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg mb-4 text-white"
                disabled={deletingAccount}
              />
              
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={!deletePassword || deletingAccount}
                  className="flex-1 p-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition font-semibold"
                >
                  {deletingAccount ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  disabled={deletingAccount}
                  className="flex-1 p-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
