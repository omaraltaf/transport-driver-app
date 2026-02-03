import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserManagement from './UserManagement';
import DriverPerformance from './DriverPerformance';
import AuditHistoryViewer from './AuditHistoryViewer';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [showAuditHistory, setShowAuditHistory] = useState(false);

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
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            👥 User Management
          </button>
          <button
            className={activeTab === 'performance' ? 'active' : ''}
            onClick={() => setActiveTab('performance')}
          >
            📊 Driver Performance
          </button>
          <button
            onClick={() => setShowAuditHistory(true)}
            style={{
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '600',
              marginLeft: 'auto'
            }}
          >
            📋 Audit History
          </button>
        </div>

        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'performance' && <DriverPerformance />}

        {/* Audit History Modal */}
        {showAuditHistory && (
          <AuditHistoryViewer onClose={() => setShowAuditHistory(false)} />
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
