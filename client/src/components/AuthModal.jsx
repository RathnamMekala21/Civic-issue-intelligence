import React, { useState, useEffect } from 'react';

export default function AuthModal({
  onLoginSuccess,
  requiredRole = 'citizen',
  restrictedMessage = '',
  onCancel = null,
}) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState(requiredRole || 'citizen');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPanchayat, setRegPanchayat] = useState('1');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync role if requiredRole changes
  useEffect(() => {
    if (requiredRole) {
      setRole(requiredRole);
    }
  }, [requiredRole]);

  const handleRoleSelect = (r) => {
    setRole(r);
    setError('');
    // Leave inputs empty for manual entry
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your mobile number or email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password: password.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.status === 'SUCCESS') {
        const loggedUser = data.user;

        // Verify if user matches the required role when accessing a restricted dashboard
        if (requiredRole === 'ward_officer' && loggedUser.role !== 'ward_officer') {
          setError('Access Denied: This account is not authorized as a Ward Officer.');
          setLoading(false);
          return;
        }

        if (requiredRole === 'admin' && loggedUser.role !== 'admin') {
          setError('Access Denied: This account is not authorized as a Panchayat Secretary.');
          setLoading(false);
          return;
        }

        onLoginSuccess(loggedUser);
      } else {
        setError(data.detail || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Backend server not reachable. Ensure server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!regName.trim() || !regPhone.trim() || !regPass.trim()) {
      setError('Please fill in all registration fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: regName.trim(),
          phone: regPhone.trim(),
          password: regPass.trim(),
          panchayat_id: parseInt(regPanchayat, 10),
        }),
      });
      const data = await res.json();

      if (res.ok && data.status === 'SUCCESS') {
        setSuccess('Account created successfully! Logging you in...');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 800);
      } else {
        setError(data.detail || 'Registration failed.');
      }
    } catch (err) {
      setError('Backend server not reachable. Ensure server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-box max-w-[460px] w-full p-8 rounded-2xl bg-[#0e172a] border border-[#1e2f4a] shadow-2xl relative">
        {/* Optional Cancel/Close Button */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            title="Cancel and return to current dashboard"
            className="absolute top-4 right-4 text-[#8899bb] hover:text-white bg-[#131f38] hover:bg-[#1e2f4a] w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer text-sm"
          >
            ✕
          </button>
        )}

        {/* Header Logo */}
        <div className="text-center mb-5">
          <div className="text-3xl mb-1.5">🏛️</div>
          <h1 className="text-xl font-extrabold text-[#14b8a6] tracking-tight">Civic Issue Intelligence</h1>
          <p className="text-xs text-[#8899bb] mt-1">Dharmajigudem Gram Panchayat • Lingapalem, West Godavari</p>
        </div>

        {/* Role Restriction Banner if accessing restricted dashboard */}
        {restrictedMessage && (
          <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-semibold flex items-center gap-2.5 leading-relaxed">
            <span className="text-base">🔒</span>
            <span>{restrictedMessage}</span>
          </div>
        )}

        {/* Tab Switch: Login vs Register */}
        <div className="flex bg-[#131f38] p-1.5 rounded-xl mb-5 border border-[#1e2f4a]">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'login' ? 'bg-[#0d9488] text-white shadow-md' : 'text-[#8899bb] hover:text-white'
            }`}
          >
            🔐 Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'register' ? 'bg-[#0d9488] text-white shadow-md' : 'text-[#8899bb] hover:text-white'
            }`}
          >
            📝 Register
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8899bb] mb-1.5">Target Account Role</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('citizen')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                    role === 'citizen'
                      ? 'border-[#14b8a6] text-[#14b8a6] bg-[rgba(20,184,166,0.12)]'
                      : 'border-[#1e2f4a] text-[#8899bb] hover:border-[#2a3f5f]'
                  }`}
                >
                  👤 Citizen
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('ward_officer')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                    role === 'ward_officer'
                      ? 'border-[#14b8a6] text-[#14b8a6] bg-[rgba(20,184,166,0.12)]'
                      : 'border-[#1e2f4a] text-[#8899bb] hover:border-[#2a3f5f]'
                  }`}
                >
                  👷 Ward Officer
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('admin')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                    role === 'admin'
                      ? 'border-[#14b8a6] text-[#14b8a6] bg-[rgba(20,184,166,0.12)]'
                      : 'border-[#1e2f4a] text-[#8899bb] hover:border-[#2a3f5f]'
                  }`}
                >
                  🏛️ Secretary
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899bb] mb-1.5">Mobile Number / Email</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === 'citizen' ? 'Enter 10-digit mobile number' : 'Enter official email address'}
                className="w-full text-sm py-2.5 px-3.5 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white focus:border-[#14b8a6] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899bb] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full text-sm py-2.5 px-3.5 pr-11 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white focus:border-[#14b8a6] transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-base text-[#8899bb] hover:text-[#14b8a6] transition-colors cursor-pointer select-none"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-[#0d9488] hover:bg-[#14b8a6] text-white rounded-lg font-bold text-sm transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              {loading ? '🔐 Authenticating...' : `Sign In as ${role === 'admin' ? 'Secretary' : role === 'ward_officer' ? 'Ward Officer' : 'Citizen'}`}
            </button>

            {error && (
              <div className="text-xs text-[#ef4444] mt-2 text-center font-medium bg-[rgba(239,68,68,0.1)] p-2.5 rounded-lg border border-[rgba(239,68,68,0.2)]">
                {error}
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#8899bb] mb-1">Full Name</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Enter full name (e.g. K. Suresh Babu)"
                className="w-full text-sm py-2.5 px-3.5 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899bb] mb-1">Mobile Number</label>
              <input
                type="text"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                className="w-full text-sm py-2.5 px-3.5 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899bb] mb-1">Create Password</label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  placeholder="Create 4-digit PIN or password"
                  className="w-full text-sm py-2.5 px-3.5 pr-11 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  title={showRegPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-base text-[#8899bb] hover:text-[#14b8a6] transition-colors cursor-pointer select-none"
                >
                  {showRegPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899bb] mb-1">Panchayat</label>
              <select
                value={regPanchayat}
                onChange={(e) => setRegPanchayat(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white"
              >
                <option value="1">Dharmajigudem Gram Panchayat (Lingapalem Mandal)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-[#0d9488] hover:bg-[#14b8a6] text-white rounded-lg font-bold text-sm transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Register Citizen Account'}
            </button>

            {error && <div className="text-xs text-[#ef4444] mt-2 text-center font-medium bg-[rgba(239,68,68,0.1)] p-2 rounded">{error}</div>}
            {success && <div className="text-xs text-[#10b981] mt-2 text-center font-medium bg-[rgba(16,185,129,0.1)] p-2 rounded">{success}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
