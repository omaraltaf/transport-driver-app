import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Performance from './Performance';

function DriverPerformance() {
  const { users } = useAuth();
  const [selectedDriver, setSelectedDriver] = useState('');
  
  const drivers = users.filter(u => u.role === 'driver');

  return (
    <div className="card">
      <h3 style={{ marginBottom: '24px', fontSize: '22px', fontWeight: '700', color: '#1f2937' }}>
        🚚 Driver Performance
      </h3>
      
      <div style={{ 
        marginBottom: '24px',
        padding: '16px',
        background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
        borderRadius: '12px'
      }}>
        <label style={{ fontSize: '14px' }}>Select Driver</label>
        <select
          value={selectedDriver}
          onChange={(e) => setSelectedDriver(e.target.value)}
        >
          <option value="">-- Select a driver --</option>
          {drivers.map(driver => (
            <option key={driver.id} value={driver.id}>
              🚚 {driver.name} ({driver.username})
            </option>
          ))}
        </select>
      </div>

      {selectedDriver ? (
        <Performance userId={selectedDriver} />
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#9ca3af'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>👆</div>
          <p style={{ fontSize: '16px', fontWeight: '500' }}>Select a driver to view their performance</p>
        </div>
      )}
    </div>
  );
}

export default DriverPerformance;
