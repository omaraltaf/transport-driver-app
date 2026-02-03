import React, { useState, useEffect } from 'react';
import { getAllEditHistory, getEditStatistics } from '../lib/auditLogger';
import { formatTime } from '../lib/sessionHelpers';

function AuditHistoryViewer({ onClose }) {
  const [editHistory, setEditHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    limit: 50
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load edit history with filters
      const filterOptions = {};
      if (filters.startDate) filterOptions.startDate = new Date(filters.startDate);
      if (filters.endDate) filterOptions.endDate = new Date(filters.endDate);
      if (filters.userId) filterOptions.userId = filters.userId;
      if (filters.limit) filterOptions.limit = parseInt(filters.limit);

      const [history, stats] = await Promise.all([
        getAllEditHistory(filterOptions),
        getEditStatistics()
      ]);

      setEditHistory(history);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFieldDisplayName = (fieldName) => {
    const fieldMap = {
      'route_number': 'Route Number',
      'positive_deliveries': 'Successful Deliveries',
      'negative_deliveries': 'Failed Deliveries',
      'positive_pickups': 'Successful Pickups',
      'negative_pickups': 'Failed Pickups',
      'delivery_comments': 'Delivery Comments',
      'pickup_comments': 'Pickup Comments',
      'start_km': 'Starting KM',
      'end_km': 'Ending KM',
      'total_km': 'Total KM',
      'start_time': 'Start Time',
      'end_time': 'End Time',
      'breaks': 'Breaks'
    };
    return fieldMap[fieldName] || fieldName;
  };

  const formatValue = (fieldName, value) => {
    if (value === null || value === undefined) return 'None';
    
    if (fieldName.includes('time') && fieldName !== 'breaks') {
      return formatTime(value);
    }
    
    if (fieldName === 'breaks') {
      try {
        const breaks = JSON.parse(value);
        return `${breaks.length} break(s)`;
      } catch {
        return value;
      }
    }
    
    if (fieldName.includes('km')) {
      return `${value} KM`;
    }
    
    return value;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '1200px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '16px'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            color: '#1f2937',
            margin: 0
          }}>
            📋 Audit History
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #93c5fd'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>
                {statistics.totalEdits}
              </div>
              <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600' }}>
                Total Edits
              </div>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #10b981'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#065f46' }}>
                {statistics.recentEdits}
              </div>
              <div style={{ fontSize: '12px', color: '#065f46', fontWeight: '600' }}>
                Last 7 Days
              </div>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #f59e0b'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>
                {statistics.adminEditCounts.length}
              </div>
              <div style={{ fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
                Active Admins
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: '#f9fafb',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
            🔍 Filters
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Limit</label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
              >
                <option value={25}>25 records</option>
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
                <option value={200}>200 records</option>
              </select>
            </div>
          </div>
        </div>

        {/* Edit History Table */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{
            background: '#f9fafb',
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            fontWeight: '600',
            fontSize: '14px',
            color: '#374151'
          }}>
            Edit History ({editHistory.length} records)
          </div>
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              Loading audit history...
            </div>
          ) : editHistory.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
              No edit history found for the selected filters.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Admin</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Driver</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Session Date</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Field</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Old Value</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {editHistory.map((edit, index) => (
                    <tr 
                      key={edit.id}
                      style={{ 
                        borderBottom: index < editHistory.length - 1 ? '1px solid #f3f4f6' : 'none',
                        '&:hover': { background: '#f9fafb' }
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: '#374151', fontWeight: '500' }}>
                        {formatDate(edit.edited_at)}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#2563eb', fontWeight: '600' }}>
                        {edit.editor?.name || 'Unknown'}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#6b7280' }}>
                        {edit.session?.user?.name || 'Unknown'}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#6b7280' }}>
                        {edit.session?.date ? new Date(edit.session.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#374151', fontWeight: '500' }}>
                        {getFieldDisplayName(edit.field_name)}
                      </td>
                      <td style={{ 
                        padding: '8px 12px', 
                        color: '#ef4444',
                        maxWidth: '150px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatValue(edit.field_name, edit.old_value)}
                      </td>
                      <td style={{ 
                        padding: '8px 12px', 
                        color: '#10b981',
                        maxWidth: '150px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatValue(edit.field_name, edit.new_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Admin Activity Summary */}
        {statistics && statistics.adminEditCounts.length > 0 && (
          <div style={{
            marginTop: '24px',
            background: '#f9fafb',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
              👥 Admin Activity Summary
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {statistics.adminEditCounts.map((admin, index) => (
                <div key={index} style={{
                  background: 'white',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    {admin.admin?.name || 'Unknown Admin'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    @{admin.admin?.username || 'unknown'}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#2563eb' }}>
                    {admin.count} edits
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuditHistoryViewer;