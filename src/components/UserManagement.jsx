import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function UserManagement() {
  const { users, createUser, deleteUser, updateUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    mobile: '',
    email: '',
    password: '',
    role: 'driver'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createUser(formData);
    setFormData({ name: '', username: '', mobile: '', email: '', password: '', role: 'driver' });
    setShowForm(false);
  };

  const handleDelete = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUser(userId);
    }
  };

  const handleRoleChange = (userId, newRole) => {
    updateUser(userId, { role: newRole });
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>👥 User Management</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary" style={{ width: '100%' }}>
          {showForm ? '✕ Cancel' : '➕ Create New User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ 
          marginBottom: '24px', 
          padding: '20px', 
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          borderRadius: '12px',
          border: '2px solid #93c5fd'
        }}>
          <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '700', color: '#1e40af' }}>
            ✨ New User Details
          </h4>
          
          <label>Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter full name"
            required
          />
          
          <label>Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Choose a username"
            required
          />
          
          <label>Mobile Number (8 digits)</label>
          <input
            type="text"
            pattern="[0-9]{8}"
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            placeholder="12345678"
            required
          />
          
          <label>Email Address</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@example.com"
            required
          />
          
          <label>Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Create a secure password"
            required
          />
          
          <label>Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="driver">🚚 Driver</option>
            <option value="admin">👑 Admin</option>
          </select>
          
          <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '8px' }}>
            ✓ Create User
          </button>
        </form>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>👤 Name</th>
              <th>🔑 Username</th>
              <th>📱 Mobile</th>
              <th>📧 Email</th>
              <th>🎭 Role</th>
              <th>⚙️ Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: '600', color: '#374151' }}>{user.name}</td>
                <td style={{ color: '#667eea', fontWeight: '600' }}>{user.username}</td>
                <td>{user.mobile}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    style={{ 
                      width: 'auto', 
                      padding: '8px 12px',
                      marginBottom: 0,
                      fontWeight: '600'
                    }}
                  >
                    <option value="driver">🚚 Driver</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="btn btn-danger"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserManagement;
