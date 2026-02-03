import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  calculateTotals, 
  validateSession, 
  formatTime, 
  formatTimeForInput,
  timeInputToISO 
} from '../lib/sessionHelpers';
import { 
  validateEndOfDayForm, 
  validateFieldRealTime,
  sanitizeTextInput 
} from '../lib/validationUtils';
import { logMultipleSessionEdits } from '../lib/auditLogger';

function AdminSessionEditor({ session, onClose, onSave }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    route_number: '',
    positive_deliveries: '',
    negative_deliveries: '',
    positive_pickups: '',
    negative_pickups: '',
    delivery_comments: '',
    pickup_comments: '',
    start_km: '',
    end_km: '',
    start_time: '',
    end_time: '',
    breaks: []
  });

  // Initialize form data when session prop changes
  useEffect(() => {
    if (session) {
      setFormData({
        route_number: session.route_number || '',
        positive_deliveries: session.positive_deliveries || '',
        negative_deliveries: session.negative_deliveries || '',
        positive_pickups: session.positive_pickups || '',
        negative_pickups: session.negative_pickups || '',
        delivery_comments: session.delivery_comments || '',
        pickup_comments: session.pickup_comments || '',
        start_km: session.start_km || '',
        end_km: session.end_km || '',
        start_time: session.start_time ? formatTimeForInput(session.start_time) : '',
        end_time: session.end_time ? formatTimeForInput(session.end_time) : '',
        breaks: session.breaks || []
      });
    }
  }, [session]);

  const handleInputChange = (field, value) => {
    // Sanitize text inputs
    const sanitizedValue = ['delivery_comments', 'pickup_comments', 'route_number'].includes(field) 
      ? sanitizeTextInput(value) 
      : value;
    
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));

    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleBreakChange = (breakIndex, field, value) => {
    const updatedBreaks = [...formData.breaks];
    updatedBreaks[breakIndex] = {
      ...updatedBreaks[breakIndex],
      [field]: timeInputToISO(value, session.date)
    };
    
    setFormData(prev => ({
      ...prev,
      breaks: updatedBreaks
    }));
  };

  const addBreak = () => {
    const newBreak = {
      start: null,
      end: null
    };
    
    setFormData(prev => ({
      ...prev,
      breaks: [...prev.breaks, newBreak]
    }));
  };

  const removeBreak = (breakIndex) => {
    const updatedBreaks = formData.breaks.filter((_, index) => index !== breakIndex);
    setFormData(prev => ({
      ...prev,
      breaks: updatedBreaks
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors([]);

    try {
      // Validate form data
      const validation = validateEndOfDayForm(formData);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setLoading(false);
        return;
      }

      // Prepare updated session data
      const updatedSession = {
        ...session,
        ...validation.cleanData,
        start_time: formData.start_time ? 
          timeInputToISO(formData.start_time, session.date) : session.start_time,
        end_time: formData.end_time ? 
          timeInputToISO(formData.end_time, session.date) : session.end_time,
        breaks: formData.breaks
      };

      // Additional validation for complete session
      const sessionErrors = validateSession(updatedSession);
      if (sessionErrors.length > 0) {
        setValidationErrors(sessionErrors);
        setLoading(false);
        return;
      }

      // Calculate totals for backward compatibility
      const sessionWithTotals = calculateTotals(updatedSession);

      // Prepare audit log entries
      const changes = [];
      Object.keys(validation.cleanData).forEach(field => {
        const oldValue = session[field];
        const newValue = validation.cleanData[field];
        if (oldValue !== newValue) {
          changes.push({
            fieldName: field,
            oldValue: oldValue,
            newValue: newValue
          });
        }
      });

      // Check for time changes
      if (formData.start_time && session.start_time) {
        const newStartTime = timeInputToISO(formData.start_time, session.date);
        if (newStartTime !== session.start_time) {
          changes.push({
            fieldName: 'start_time',
            oldValue: session.start_time,
            newValue: newStartTime
          });
        }
      }

      if (formData.end_time && session.end_time) {
        const newEndTime = timeInputToISO(formData.end_time, session.date);
        if (newEndTime !== session.end_time) {
          changes.push({
            fieldName: 'end_time',
            oldValue: session.end_time,
            newValue: newEndTime
          });
        }
      }

      // Check for break changes
      if (JSON.stringify(formData.breaks) !== JSON.stringify(session.breaks)) {
        changes.push({
          fieldName: 'breaks',
          oldValue: JSON.stringify(session.breaks),
          newValue: JSON.stringify(formData.breaks)
        });
      }

      // Update session in database
      const { data, error } = await supabase
        .from('sessions')
        .update(sessionWithTotals)
        .eq('id', session.id)
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      if (changes.length > 0) {
        await logMultipleSessionEdits(session.id, changes, user.id);
      }

      // Notify parent component
      onSave(data);
      onClose();

    } catch (error) {
      console.error('Error updating session:', error);
      setValidationErrors(['Failed to update session. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

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
        maxWidth: '800px',
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
            ✏️ Edit Session Record
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

        <div style={{
          background: '#f9fafb',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#374151'
        }}>
          <strong>Driver:</strong> {session.user?.name || 'Unknown'} | 
          <strong> Date:</strong> {new Date(session.date).toLocaleDateString()} |
          <strong> Original Route:</strong> {session.route_number || 'N/A'}
        </div>

        <form onSubmit={handleSave}>
          {/* Basic Information */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
              📋 Basic Information
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>Route Number</label>
                <input
                  type="text"
                  value={formData.route_number}
                  onChange={(e) => handleInputChange('route_number', e.target.value)}
                  placeholder="e.g., Route #42"
                />
              </div>
              
              <div>
                <label>Status</label>
                <input
                  type="text"
                  value={session.status}
                  disabled
                  style={{ background: '#f9fafb', color: '#6b7280' }}
                />
              </div>
            </div>
          </div>

          {/* Time Tracking */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
              ⏰ Time Tracking
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                />
              </div>
              
              <div>
                <label>End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Deliveries */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
              📦 Deliveries
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
              <div>
                <label>Successful Deliveries</label>
                <input
                  type="number"
                  value={formData.positive_deliveries}
                  onChange={(e) => handleInputChange('positive_deliveries', e.target.value)}
                  min="0"
                />
              </div>
              
              <div>
                <label>Failed Deliveries</label>
                <input
                  type="number"
                  value={formData.negative_deliveries}
                  onChange={(e) => handleInputChange('negative_deliveries', e.target.value)}
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <label>Delivery Comments</label>
              <textarea
                value={formData.delivery_comments}
                onChange={(e) => handleInputChange('delivery_comments', e.target.value)}
                placeholder="Reasons for failed deliveries..."
                rows="2"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Pickups */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
              📥 Pickups
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
              <div>
                <label>Successful Pickups</label>
                <input
                  type="number"
                  value={formData.positive_pickups}
                  onChange={(e) => handleInputChange('positive_pickups', e.target.value)}
                  min="0"
                />
              </div>
              
              <div>
                <label>Failed Pickups</label>
                <input
                  type="number"
                  value={formData.negative_pickups}
                  onChange={(e) => handleInputChange('negative_pickups', e.target.value)}
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <label>Pickup Comments</label>
              <textarea
                value={formData.pickup_comments}
                onChange={(e) => handleInputChange('pickup_comments', e.target.value)}
                placeholder="Reasons for failed pickups..."
                rows="2"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Mileage */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
              🚗 Vehicle Mileage
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>Starting KM</label>
                <input
                  type="number"
                  value={formData.start_km}
                  onChange={(e) => handleInputChange('start_km', e.target.value)}
                  step="0.1"
                  min="0"
                />
              </div>
              
              <div>
                <label>Ending KM</label>
                <input
                  type="number"
                  value={formData.end_km}
                  onChange={(e) => handleInputChange('end_km', e.target.value)}
                  step="0.1"
                  min="0"
                />
              </div>
            </div>
            
            {formData.start_km && formData.end_km && (
              <div style={{
                background: '#f3f4f6',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#374151',
                marginTop: '8px'
              }}>
                Distance: {(parseFloat(formData.end_km) - parseFloat(formData.start_km)).toFixed(1)} KM
              </div>
            )}
          </div>

          {/* Breaks */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
                ☕ Breaks
              </h3>
              <button
                type="button"
                onClick={addBreak}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                + Add Break
              </button>
            </div>
            
            {formData.breaks.map((brk, index) => (
              <div key={index} style={{
                background: '#f9fafb',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>Break {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeBreak(index)}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px' }}>Start Time</label>
                    <input
                      type="time"
                      value={brk.start ? formatTimeForInput(brk.start) : ''}
                      onChange={(e) => handleBreakChange(index, 'start', e.target.value)}
                      style={{ fontSize: '13px' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '12px' }}>End Time</label>
                    <input
                      type="time"
                      value={brk.end ? formatTimeForInput(brk.end) : ''}
                      onChange={(e) => handleBreakChange(index, 'end', e.target.value)}
                      style={{ fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <h5 style={{ color: '#dc2626', fontSize: '14px', marginBottom: '8px' }}>
                Please fix the following errors:
              </h5>
              <ul style={{ color: '#dc2626', fontSize: '13px', margin: 0, paddingLeft: '20px' }}>
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {loading ? 'Saving...' : '✓ Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminSessionEditor;