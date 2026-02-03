import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  calculateTotals, 
  validateSession, 
  formatTime, 
  formatTimeForInput,
  timeInputToISO,
  validateBreakTimeEdit,
  getDefaultFormValues,
  areCommentsRecommended
} from '../lib/sessionHelpers';

function TimeTracking({ userId }) {
  const [status, setStatus] = useState('not-started');
  const [currentSession, setCurrentSession] = useState(null);
  const [showEndDayForm, setShowEndDayForm] = useState(false);
  const [showStartForm, setShowStartForm] = useState(false);
  
  // Enhanced form state for end-of-day
  const [routeNumber, setRouteNumber] = useState('');
  const [positiveDeliveries, setPositiveDeliveries] = useState('');
  const [negativeDeliveries, setNegativeDeliveries] = useState('');
  const [positivePickups, setPositivePickups] = useState('');
  const [negativePickups, setNegativePickups] = useState('');
  const [deliveryComments, setDeliveryComments] = useState('');
  const [pickupComments, setPickupComments] = useState('');
  const [endKm, setEndKm] = useState('');
  
  // State for starting mileage
  const [startKm, setStartKm] = useState('');
  
  // State for break editing
  const [editingBreak, setEditingBreak] = useState(null);
  const [editBreakStart, setEditBreakStart] = useState('');
  const [editBreakEnd, setEditBreakEnd] = useState('');
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    loadTodaySession();
  }, [userId]);

  const loadTodaySession = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          user_id,
          date,
          start_time,
          end_time,
          status,
          route_number,
          deliveries,
          pickups,
          positive_deliveries,
          negative_deliveries,
          positive_pickups,
          negative_pickups,
          delivery_comments,
          pickup_comments,
          start_km,
          end_km,
          total_km,
          breaks
        `)
        .eq('user_id', userId)
        .gte('date', today.toISOString())
        .is('end_time', null)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error loading session:', error);
        }
        return;
      }

      if (data) {
        setCurrentSession(data);
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Unexpected error loading session:', error);
    }
  };

  const saveSession = async (session) => {
    try {
      // Validate session data before saving
      const errors = validateSession(session);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return false;
      }
      
      // Clear validation errors
      setValidationErrors([]);
      
      // Calculate totals for backward compatibility
      const sessionWithTotals = calculateTotals(session);
      
      if (session.id && !session.id.includes('temp-')) {
        // Update existing session
        const { data, error } = await supabase
          .from('sessions')
          .update(sessionWithTotals)
          .eq('id', session.id)
          .select()
          .single();

        if (error) throw error;
        setCurrentSession(data);
      } else {
        // Create new session
        const { id, ...sessionData } = sessionWithTotals;
        const { data, error } = await supabase
          .from('sessions')
          .insert([sessionData])
          .select()
          .single();

        if (error) throw error;
        setCurrentSession(data);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving session:', error.message);
      alert('Error saving session. Please try again.');
      return false;
    }
  };

  const handleStartWork = () => {
    setShowStartForm(true);
  };

  const submitStartWork = async (e) => {
    e.preventDefault();
    
    const session = {
      id: 'temp-' + Date.now(),
      user_id: userId,
      date: new Date().toISOString(),
      start_time: new Date().toISOString(),
      status: 'working',
      breaks: [],
      start_km: startKm ? parseFloat(startKm) : null,
      positive_deliveries: 0,
      negative_deliveries: 0,
      positive_pickups: 0,
      negative_pickups: 0
    };
    
    const success = await saveSession(session);
    if (success) {
      setStatus('working');
      setShowStartForm(false);
      setStartKm('');
    }
  };

  const handleStartBreak = async () => {
    const updated = {
      ...currentSession,
      status: 'on-break',
      breaks: [...(currentSession.breaks || []), { start: new Date().toISOString() }],
    };
    const success = await saveSession(updated);
    if (success) {
      setStatus('on-break');
    }
  };

  const handleEndBreak = async () => {
    const breaks = [...(currentSession.breaks || [])];
    breaks[breaks.length - 1].end = new Date().toISOString();

    const updated = {
      ...currentSession,
      status: 'working',
      breaks,
    };
    const success = await saveSession(updated);
    if (success) {
      setStatus('working');
    }
  };

  const handleEndDay = () => {
    setShowEndDayForm(true);
  };

  const submitEndDay = async (e) => {
    e.preventDefault();

    const updated = {
      ...currentSession,
      end_time: new Date().toISOString(),
      status: 'ended',
      route_number: routeNumber,
      positive_deliveries: parseInt(positiveDeliveries) || 0,
      negative_deliveries: parseInt(negativeDeliveries) || 0,
      positive_pickups: parseInt(positivePickups) || 0,
      negative_pickups: parseInt(negativePickups) || 0,
      delivery_comments: deliveryComments.trim() || null,
      pickup_comments: pickupComments.trim() || null,
      end_km: endKm ? parseFloat(endKm) : null
    };
    
    const success = await saveSession(updated);
    if (success) {
      setStatus('ended');
      setShowEndDayForm(false);
      // Reset form values
      const defaultValues = getDefaultFormValues();
      setRouteNumber(defaultValues.routeNumber);
      setPositiveDeliveries(defaultValues.positiveDeliveries);
      setNegativeDeliveries(defaultValues.negativeDeliveries);
      setPositivePickups(defaultValues.positivePickups);
      setNegativePickups(defaultValues.negativePickups);
      setDeliveryComments(defaultValues.deliveryComments);
      setPickupComments(defaultValues.pickupComments);
      setEndKm(defaultValues.endKm);
    }
  };

  // Break editing functions
  const startEditingBreak = (breakIndex) => {
    const breakToEdit = currentSession.breaks[breakIndex];
    setEditingBreak(breakIndex);
    setEditBreakStart(formatTimeForInput(breakToEdit.start));
    setEditBreakEnd(formatTimeForInput(breakToEdit.end));
  };

  const cancelEditingBreak = () => {
    setEditingBreak(null);
    setEditBreakStart('');
    setEditBreakEnd('');
  };

  const saveBreakEdit = async () => {
    const validation = validateBreakTimeEdit(
      currentSession.breaks, 
      editingBreak, 
      'start', 
      editBreakStart, 
      currentSession
    );
    
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    const endValidation = validateBreakTimeEdit(
      currentSession.breaks, 
      editingBreak, 
      'end', 
      editBreakEnd, 
      currentSession
    );
    
    if (!endValidation.isValid) {
      alert(endValidation.error);
      return;
    }

    const updatedBreaks = [...currentSession.breaks];
    updatedBreaks[editingBreak] = {
      start: timeInputToISO(editBreakStart, currentSession.date),
      end: timeInputToISO(editBreakEnd, currentSession.date)
    };

    const updated = {
      ...currentSession,
      breaks: updatedBreaks
    };

    const success = await saveSession(updated);
    if (success) {
      cancelEditingBreak();
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '24px', fontSize: '22px', fontWeight: '700', color: '#1f2937' }}>
        ⏱️ Time Tracking
      </h3>

      {status === 'not-started' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚚</div>
          <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '16px' }}>
            Ready to start your day?
          </p>
          <button
            onClick={handleStartWork}
            className="btn btn-success"
            style={{ fontSize: '16px', padding: '14px 32px' }}
          >
            🚀 Start Work
          </button>
        </div>
      )}

      {showStartForm && (
        <div
          style={{
            marginTop: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            borderRadius: '12px',
            border: '2px solid #10b981',
          }}
        >
          <h4
            style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '700', color: '#065f46' }}
          >
            🚀 Start Your Work Day
          </h4>
          <form onSubmit={submitStartWork}>
            <label>Starting Vehicle Mileage (KM)</label>
            <input
              type="number"
              value={startKm}
              onChange={(e) => setStartKm(e.target.value)}
              placeholder="e.g., 12345.5"
              step="0.1"
              min="0"
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Optional: Enter your vehicle's current odometer reading
            </p>

            {validationErrors.length > 0 && (
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                borderRadius: '6px', 
                padding: '12px', 
                marginTop: '12px' 
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
                ✓ Start Work Day
              </button>
              <button
                type="button"
                onClick={() => setShowStartForm(false)}
                className="btn"
                style={{ background: '#e5e7eb', color: '#374151', width: '100%' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {status === 'working' && (
        <div>
          <div
            style={{
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '24px',
            }}
          >
            <span className="status-badge status-working" style={{ fontSize: '14px' }}>
              Working
            </span>
            <p style={{ marginTop: '12px', color: '#065f46', fontSize: '16px', fontWeight: '600' }}>
              Started at {formatTime(currentSession.start_time)}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={handleStartBreak} className="btn btn-warning" style={{ width: '100%' }}>
              ☕ Start Break
            </button>
            <button onClick={handleEndDay} className="btn btn-danger" style={{ width: '100%' }}>
              🏁 End Day
            </button>
          </div>
        </div>
      )}

      {status === 'on-break' && (
        <div>
          <div
            style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            <span className="status-badge status-break" style={{ fontSize: '14px' }}>
              On Break
            </span>
            <p style={{ marginTop: '12px', color: '#92400e', fontSize: '16px', fontWeight: '600' }}>
              Take your time to rest
            </p>
          </div>
          <button onClick={handleEndBreak} className="btn btn-success" style={{ width: '100%' }}>
            ▶️ End Break & Resume Work
          </button>
        </div>
      )}

      {status === 'ended' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            padding: '32px',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <span className="status-badge status-ended" style={{ fontSize: '14px' }}>
            Day Ended
          </span>
          <p style={{ marginTop: '12px', color: '#374151', fontSize: '16px', fontWeight: '600' }}>
            Great work today! See you tomorrow.
          </p>
        </div>
      )}

      {showEndDayForm && (
        <div
          style={{
            marginTop: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderRadius: '12px',
            border: '2px solid #93c5fd',
          }}
        >
          <h4
            style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '700', color: '#1e40af' }}
          >
            📋 End of Day Report
          </h4>
          <form onSubmit={submitEndDay}>
            <label>Route Number</label>
            <input
              type="text"
              value={routeNumber}
              onChange={(e) => setRouteNumber(e.target.value)}
              placeholder="e.g., Route #42"
              required
            />

            {/* Deliveries Section */}
            <div style={{ 
              marginTop: '20px', 
              padding: '16px', 
              background: 'rgba(255, 255, 255, 0.7)', 
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h5 style={{ 
                fontSize: '14px', 
                fontWeight: '700', 
                color: '#374151', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📦 Deliveries
              </h5>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px' }}>Successful Deliveries</label>
                  <input
                    type="number"
                    value={positiveDeliveries}
                    onChange={(e) => setPositiveDeliveries(e.target.value)}
                    placeholder="0"
                    min="0"
                    style={{ marginBottom: '8px' }}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: '13px' }}>Failed Deliveries</label>
                  <input
                    type="number"
                    value={negativeDeliveries}
                    onChange={(e) => setNegativeDeliveries(e.target.value)}
                    placeholder="0"
                    min="0"
                    style={{ marginBottom: '8px' }}
                  />
                </div>
              </div>
              
              <div style={{ 
                background: '#f3f4f6', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                fontSize: '13px',
                fontWeight: '600',
                color: '#374151',
                marginTop: '8px'
              }}>
                Total Deliveries: {(parseInt(positiveDeliveries) || 0) + (parseInt(negativeDeliveries) || 0)}
              </div>

              {areCommentsRecommended(negativeDeliveries) && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '13px' }}>
                    Reason for Failed Deliveries 
                    <span style={{ color: '#f59e0b', fontWeight: '600' }}> (Recommended)</span>
                  </label>
                  <textarea
                    value={deliveryComments}
                    onChange={(e) => setDeliveryComments(e.target.value)}
                    placeholder="e.g., Customer not home, wrong address, package damaged..."
                    rows="2"
                    style={{ resize: 'vertical', minHeight: '60px' }}
                  />
                </div>
              )}
            </div>

            {/* Pickups Section */}
            <div style={{ 
              marginTop: '16px', 
              padding: '16px', 
              background: 'rgba(255, 255, 255, 0.7)', 
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h5 style={{ 
                fontSize: '14px', 
                fontWeight: '700', 
                color: '#374151', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📥 Pickups
              </h5>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px' }}>Successful Pickups</label>
                  <input
                    type="number"
                    value={positivePickups}
                    onChange={(e) => setPositivePickups(e.target.value)}
                    placeholder="0"
                    min="0"
                    style={{ marginBottom: '8px' }}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: '13px' }}>Failed Pickups</label>
                  <input
                    type="number"
                    value={negativePickups}
                    onChange={(e) => setNegativePickups(e.target.value)}
                    placeholder="0"
                    min="0"
                    style={{ marginBottom: '8px' }}
                  />
                </div>
              </div>
              
              <div style={{ 
                background: '#f3f4f6', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                fontSize: '13px',
                fontWeight: '600',
                color: '#374151',
                marginTop: '8px'
              }}>
                Total Pickups: {(parseInt(positivePickups) || 0) + (parseInt(negativePickups) || 0)}
              </div>

              {areCommentsRecommended(negativePickups) && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '13px' }}>
                    Reason for Failed Pickups 
                    <span style={{ color: '#f59e0b', fontWeight: '600' }}> (Recommended)</span>
                  </label>
                  <textarea
                    value={pickupComments}
                    onChange={(e) => setPickupComments(e.target.value)}
                    placeholder="e.g., Package not ready, business closed, incorrect pickup time..."
                    rows="2"
                    style={{ resize: 'vertical', minHeight: '60px' }}
                  />
                </div>
              )}
            </div>

            {/* Mileage Section */}
            <div style={{ 
              marginTop: '16px', 
              padding: '16px', 
              background: 'rgba(255, 255, 255, 0.7)', 
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h5 style={{ 
                fontSize: '14px', 
                fontWeight: '700', 
                color: '#374151', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🚗 Vehicle Mileage
              </h5>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '13px' }}>Starting KM</label>
                  <input
                    type="number"
                    value={currentSession?.start_km || ''}
                    disabled
                    style={{ 
                      background: '#f9fafb', 
                      color: '#6b7280',
                      marginBottom: '8px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: '13px' }}>Ending KM</label>
                  <input
                    type="number"
                    value={endKm}
                    onChange={(e) => setEndKm(e.target.value)}
                    placeholder="e.g., 12450.8"
                    step="0.1"
                    min={currentSession?.start_km || 0}
                    required={currentSession?.start_km ? true : false}
                    style={{ marginBottom: '8px' }}
                  />
                </div>
              </div>
              
              {currentSession?.start_km && endKm && (
                <div style={{ 
                  background: '#f3f4f6', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  marginTop: '8px'
                }}>
                  Distance Driven: {(parseFloat(endKm) - parseFloat(currentSession.start_km)).toFixed(1)} KM
                </div>
              )}
            </div>

            {validationErrors.length > 0 && (
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                borderRadius: '6px', 
                padding: '12px', 
                marginTop: '16px' 
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                ✓ Submit Report
              </button>
              <button
                type="button"
                onClick={() => setShowEndDayForm(false)}
                className="btn"
                style={{ background: '#e5e7eb', color: '#374151', width: '100%' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {currentSession && currentSession.breaks && currentSession.breaks.length > 0 && (
        <div
          style={{
            marginTop: '24px',
            padding: '20px',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h4
            style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '700', color: '#374151' }}
          >
            ☕ Breaks Today
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentSession.breaks.map((brk, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {editingBreak === idx ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ fontWeight: '600', color: '#374151', minWidth: '80px' }}>
                        Break {idx + 1}:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="time"
                          value={editBreakStart}
                          onChange={(e) => setEditBreakStart(e.target.value)}
                          style={{ 
                            width: '100px', 
                            padding: '4px 8px', 
                            fontSize: '13px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px'
                          }}
                        />
                        <span style={{ color: '#6b7280' }}>to</span>
                        <input
                          type="time"
                          value={editBreakEnd}
                          onChange={(e) => setEditBreakEnd(e.target.value)}
                          style={{ 
                            width: '100px', 
                            padding: '4px 8px', 
                            fontSize: '13px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={saveBreakEdit}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        ✓ Save
                      </button>
                      <button
                        onClick={cancelEditingBreak}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        ✗ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: '600', color: '#374151' }}>Break {idx + 1}</span>
                      <span style={{ color: '#6b7280' }}>
                        {formatTime(brk.start)} {brk.end && `- ${formatTime(brk.end)}`}
                      </span>
                    </div>
                    {brk.end && status !== 'ended' && (
                      <button
                        onClick={() => startEditingBreak(idx)}
                        style={{
                          background: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {editingBreak === null && (
            <div style={{ 
              marginTop: '12px', 
              padding: '8px 12px', 
              background: '#eff6ff', 
              borderRadius: '6px',
              fontSize: '12px',
              color: '#1e40af'
            }}>
              💡 Tip: You can edit completed break times by clicking the "Edit" button
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TimeTracking;
