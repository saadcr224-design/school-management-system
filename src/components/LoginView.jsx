import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function LoginView() {
  const { login, installApp } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const res = login(email, password);
      setIsLoading(false);
      if (!res.success) {
        setError(res.error || 'Invalid credentials');
      }
    }, 400);
  };

  const handleQuickFill = () => {
    setEmail('admin');
    setPassword('admin123');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #1e3a8a 0%, #0f1d38 60%, #080f1d 100%)',
      padding: '20px',
      position: 'relative',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Background Decorative Rings */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        border: '1px solid rgba(245, 158, 11, 0.1)',
        pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute',
        width: '900px',
        height: '900px',
        borderRadius: '50%',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        pointerEvents: 'none'
      }}></div>

      {/* Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2)',
        overflow: 'hidden',
        zIndex: 10
      }}>
        {/* Card Header with School Crest */}
        <div style={{
          background: 'linear-gradient(135deg, #122241 0%, #091326 100%)',
          padding: '36px 28px 28px 28px',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(245, 158, 11, 0.4)',
            marginBottom: '16px'
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.42 10.922a1 1 0 0 0-.019-.838L12.83 2.18a2 2 0 0 0-1.66 0L2.6 10.08a1 1 0 0 0 0 1.832l8.57 7.908a2 2 0 0 0 1.66 0l8.57-7.908a1 1 0 0 0 .02-.99Z" />
              <path d="M22 10v6" />
              <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
            </svg>
          </div>

          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.45rem',
            fontWeight: '800',
            color: '#ffffff',
            letterSpacing: '0.02em',
            marginBottom: '4px'
          }}>
            SHEZAD CHILDREN ACADEMY
          </h1>
          <p style={{
            fontSize: '0.82rem',
            color: '#94a3b8',
            fontWeight: '500'
          }}>
            School & College Management Portal
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '32px 28px 28px 28px' }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f1d38', marginBottom: '4px' }}>
              Sign In to Your Account
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Enter administrative credentials to access the system
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: '600',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email / Username Field */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', color: '#1e293b' }}>
                Email / Username
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter email or username (e.g. admin)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    paddingLeft: '38px',
                    height: '44px',
                    fontSize: '0.92rem'
                  }}
                />
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  style={{ position: 'absolute', left: '12px', top: '13px' }}
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontWeight: '600', color: '#1e293b' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter password (e.g. admin123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    paddingLeft: '38px',
                    height: '44px',
                    fontSize: '0.92rem'
                  }}
                />
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  style={{ position: 'absolute', left: '12px', top: '13px' }}
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: 'linear-gradient(135deg, #122241 0%, #1a325e 100%)',
                color: '#ffffff',
                border: 'none',
                height: '46px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.96rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(18, 34, 65, 0.25)',
                transition: 'all 0.2s',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Quick Fill Helpers for Admin and Super Admin */}
            <div style={{
              marginTop: '10px',
              padding: '12px 14px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
                Quick Access Selectors (Password: <strong>admin123</strong>):
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin');
                    setPassword('admin123');
                    setError('');
                  }}
                  style={{
                    flex: 1,
                    background: '#eab308',
                    color: '#0f1d38',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Admin (Working Access)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('superadmin');
                    setPassword('admin123');
                    setError('');
                  }}
                  style={{
                    flex: 1,
                    background: '#1e293b',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Super Admin
                </button>
              </div>
            </div>
          </form>

          {/* PC Install Button */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={installApp}
              style={{
                background: 'none',
                border: '1px solid #cbd5e1',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>💻 Install App on PC</span>
            </button>
          </div>
        </div>

        {/* Card Footer */}
        <div style={{
          background: '#f8fafc',
          padding: '12px 20px',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          fontSize: '0.74rem',
          color: '#94a3b8'
        }}>
          Shezad Children Academy · Academic Session 2026–2027
        </div>
      </div>
    </div>
  );
}
