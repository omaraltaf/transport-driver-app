import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username, password);
      if (!success) {
        setError('❌ Invalid username or password. Please try again.');
      }
      // If successful, navigation handled by App.jsx
    } catch (err) {
      console.error('Login error:', err);
      setError('❌ Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/logo.png" 
            alt="Hussnain Transport" 
            style={{ 
              width: '120px', 
              height: '120px', 
              margin: '0 auto 20px',
              display: 'block',
              objectFit: 'contain'
            }} 
          />
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '8px'
          }}>Hussnain Transport</h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
          
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
          
          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '16px',
                fontSize: '14px',
                fontWeight: '500',
                border: '2px solid #fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? '⏳ Signing in...' : '🔐 Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
