import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function UserManagement() {
  const { users, createUser, deleteUser, updateUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    mobile: '',
    email: '',
    password: '',
    role: 'driver',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingUser) {
      // Update existing user
      const updates = { ...formData };
      if (!updates.password) {
        delete updates.password; // Don't update password if empty
      }
      const result = await updateUser(editingUser.id, updates);
      if (result.success) {
        alert('User updated successfully!');
      } else {
        alert('Error updating user: ' + result.error);
      }
    } else {
      // Create new user
      const result = await createUser(formData);
      if (result.success) {
        alert('User created successfully!');
      } else {
        alert('Error creating user: ' + result.error);
      }
    }
    
    resetForm();
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      mobile: user.mobile,
      email: user.email || '',
      password: '', // Don't show existing password
      role: user.role,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: '', username: '', mobile: '', email: '', password: '', role: 'driver' });
    setShowForm(false);
    setEditingUser(null);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const result = await deleteUser(userId);
      if (result.success) {
        alert('User deleted successfully!');
      } else {
        alert('Error deleting user: ' + result.error);
      }
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const result = await updateUser(userId, { role: newRole });
    if (!result.success) {
      alert('Error updating role: ' + result.error);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>👥 User Management</h3>
        <button onClick={() => showForm ? resetForm() : setShowForm(true)} className="btn btn-primary" style={{ width: '100%' }}>
          {showForm ? '✕ Cancel' : '➕ Create New User'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginBottom: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderRadius: '12px',
            border: '2px solid #93c5fd',
          }}
        >
          <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '700', color: '#1e40af' }}>
            {editingUser ? '✏️ Edit User Details' : '✨ New User Details'}
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
            disabled={editingUser} // Can't change username when editing
          />

          <label>Mobile Number (8 digits)</label>
          <input
            type="tel"
            pattern="[0-9]{8}"
            value={formData.mobile}
            onChange={(e) => {
              // Remove any non-numeric characters
              const cleaned = e.target.value.replace(/\D/g, '');
              setFormData({ ...formData, mobile: cleaned });
            }}
            placeholder="12345678"
            maxLength="8"
            required
          />

          <label>Email Address (Optional)</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@example.com"
          />

          <label>Password {editingUser && '(Leave empty to keep current)'}</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={editingUser ? 'Enter new password or leave empty' : 'Create a secure password'}
            required={!editingUser}
          />

          <label>Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="driver">🚚 Driver</option>
            <option value="admin">👑 Admin</option>
          </select>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
              {editingUser ? '✓ Update User' : '✓ Create User'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="btn"
              style={{ flex: 1, background: '#e5e7eb', color: '#374151' }}
            >
              Cancel
            </button>
          </div>
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
                <td>{user.email || '-'}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    style={{
                      width: 'auto',
                      padding: '8px 12px',
                      marginBottom: 0,
                      fontWeight: '600',
                    }}
                  >
                    <option value="driver">🚚 Driver</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleEdit(user)}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="btn btn-danger"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
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
