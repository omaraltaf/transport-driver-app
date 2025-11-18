import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TimeTracking from './TimeTracking';
import Performance from './Performance';

function DriverDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('tracking');

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="container">
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img 
              src="/logo.png" 
              alt="Hussnain Transport" 
              style={{ width: '50px', height: '50px', objectFit: 'contain' }} 
            />
            <div>
              <h2>Hussnain Transport</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Welcome back, {user.name} 👋</p>
            </div>
          </div>
          <button onClick={logout} className="btn btn-danger">
            🚪 Logout
          </button>
        </div>

        <div className="nav">
          <button
            className={activeTab === 'tracking' ? 'active' : ''}
            onClick={() => setActiveTab('tracking')}
          >
            ⏱️ Time Tracking
          </button>
          <button
            className={activeTab === 'performance' ? 'active' : ''}
            onClick={() => setActiveTab('performance')}
          >
            📊 Performance
          </button>
        </div>

        {activeTab === 'tracking' && <TimeTracking userId={user.id} />}
        {activeTab === 'performance' && <Performance userId={user.id} />}
      </div>
    </div>
  );
}

export default DriverDashboard;
