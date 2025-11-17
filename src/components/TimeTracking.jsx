import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function TimeTracking({ userId }) {
  const [status, setStatus] = useState('not-started');
  const [currentSession, setCurrentSession] = useState(null);
  const [showEndDayForm, setShowEndDayForm] = useState(false);
  const [routeNumber, setRouteNumber] = useState('');
  const [deliveries, setDeliveries] = useState('');
  const [pickups, setPickups] = useState('');

  useEffect(() => {
    loadTodaySession();
  }, [userId]);

  const loadTodaySession = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', today.toISOString())
        .is('end_time', null)
        .single();

      if (data) {
        setCurrentSession(data);
        setStatus(data.status);
      }
    } catch (error) {
      // No session found for today
    }
  };

  const saveSession = async (session) => {
    try {
      if (session.id && !session.id.includes('temp-')) {
        // Update existing session
        const { data, error } = await supabase
          .from('sessions')
          .update(session)
          .eq('id', session.id)
          .select()
          .single();

        if (error) throw error;
        setCurrentSession(data);
      } else {
        // Create new session
        const { id, ...sessionData } = session;
        const { data, error } = await supabase
          .from('sessions')
          .insert([sessionData])
          .select()
          .single();

        if (error) throw error;
        setCurrentSession(data);
      }
    } catch (error) {
      console.error('Error saving session:', error.message);
      alert('Error saving session. Please try again.');
    }
  };

  const handleStartWork = () => {
    const session = {
      id: 'temp-' + Date.now(),
      user_id: userId,
      date: new Date().toISOString(),
      start_time: new Date().toISOString(),
      status: 'working',
      breaks: [],
    };
    saveSession(session);
    setStatus('working');
  };

  const handleStartBreak = () => {
    const updated = {
      ...currentSession,
      status: 'on-break',
      breaks: [...(currentSession.breaks || []), { start: new Date().toISOString() }],
    };
    saveSession(updated);
    setStatus('on-break');
  };

  const handleEndBreak = () => {
    const breaks = [...(currentSession.breaks || [])];
    breaks[breaks.length - 1].end = new Date().toISOString();

    const updated = {
      ...currentSession,
      status: 'working',
      breaks,
    };
    saveSession(updated);
    setStatus('working');
  };

  const handleEndDay = () => {
    setShowEndDayForm(true);
  };

  const submitEndDay = (e) => {
    e.preventDefault();

    const updated = {
      ...currentSession,
      end_time: new Date().toISOString(),
      status: 'ended',
      route_number: routeNumber,
      deliveries: parseInt(deliveries),
      pickups: parseInt(pickups),
    };
    saveSession(updated);
    setStatus('ended');
    setShowEndDayForm(false);
    setRouteNumber('');
    setDeliveries('');
    setPickups('');
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

            <label>Number of Deliveries</label>
            <input
              type="number"
              value={deliveries}
              onChange={(e) => setDeliveries(e.target.value)}
              placeholder="0"
              required
              min="0"
            />

            <label>Number of Pickups</label>
            <input
              type="number"
              value={pickups}
              onChange={(e) => setPickups(e.target.value)}
              placeholder="0"
              required
              min="0"
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
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
                  color: '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Break {idx + 1}</span>
                <span style={{ color: '#374151' }}>
                  {formatTime(brk.start)} {brk.end && `- ${formatTime(brk.end)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TimeTracking;
