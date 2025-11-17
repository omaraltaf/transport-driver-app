import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';

function Performance({ userId }) {
  const [sessions, setSessions] = useState([]);
  const [days, setDays] = useState(7);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [userId, days, startDate, endDate, useCustomRange]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .not('end_time', 'is', null);

      if (useCustomRange && startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        query = query
          .gte('date', start.toISOString())
          .lte('date', end.toISOString());
      } else {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        cutoffDate.setHours(0, 0, 0, 0);
        query = query.gte('date', cutoffDate.toISOString());
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkHours = (session) => {
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    let totalMs = end - start;

    const breaks = session.breaks || [];
    breaks.forEach((brk) => {
      if (brk.end) {
        totalMs -= new Date(brk.end) - new Date(brk.start);
      }
    });

    return (totalMs / (1000 * 60 * 60)).toFixed(2);
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateShort = (isoString) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getChartData = () => {
    return sessions
      .slice()
      .reverse()
      .map((session) => ({
        date: formatDateShort(session.date),
        workHours: parseFloat(calculateWorkHours(session)),
        deliveries: session.deliveries || 0,
        pickups: session.pickups || 0,
        breaks: (session.breaks || []).length,
      }));
  };

  const getTotalStats = () => {
    const totalDeliveries = sessions.reduce((sum, s) => sum + (s.deliveries || 0), 0);
    const totalPickups = sessions.reduce((sum, s) => sum + (s.pickups || 0), 0);
    const totalHours = sessions.reduce((sum, s) => sum + parseFloat(calculateWorkHours(s)), 0);
    const avgHours = sessions.length > 0 ? totalHours / sessions.length : 0;

    return {
      totalDeliveries,
      totalPickups,
      totalHours: totalHours.toFixed(1),
      avgHours: avgHours.toFixed(1),
      totalDays: sessions.length,
    };
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '24px', fontSize: '22px', fontWeight: '700', color: '#1f2937' }}>
        📊 Performance Dashboard
      </h3>

      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
          borderRadius: '12px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}
        >
          <label
            style={{
              marginBottom: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            <input
              type="radio"
              checked={!useCustomRange}
              onChange={() => setUseCustomRange(false)}
              style={{ width: 'auto', marginBottom: 0, cursor: 'pointer' }}
            />
            Last
          </label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            disabled={useCustomRange}
            style={{ width: 'auto', marginBottom: 0, minWidth: '100px' }}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>

        <div style={{ width: '100%', height: '1px', background: '#d1d5db', margin: '4px 0' }}></div>

        <div
          style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}
        >
          <label
            style={{
              marginBottom: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '14px',
              width: '100%',
            }}
          >
            <input
              type="radio"
              checked={useCustomRange}
              onChange={() => setUseCustomRange(true)}
              style={{ width: 'auto', marginBottom: 0, cursor: 'pointer' }}
            />
            Custom Range
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={!useCustomRange}
            style={{ flex: 1, marginBottom: 0, minWidth: '140px' }}
          />
          <span style={{ color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={!useCustomRange}
            style={{ flex: 1, marginBottom: 0, minWidth: '140px' }}
          />
        </div>
      </div>

      {sessions.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#9ca3af',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
          <p style={{ fontSize: '16px', fontWeight: '500' }}>
            No performance data available for this period.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            {[
              {
                icon: '📦',
                label: 'Total Deliveries',
                value: getTotalStats().totalDeliveries,
                color: '#667eea',
              },
              {
                icon: '📥',
                label: 'Total Pickups',
                value: getTotalStats().totalPickups,
                color: '#10b981',
              },
              {
                icon: '⏰',
                label: 'Total Hours',
                value: getTotalStats().totalHours + 'h',
                color: '#f59e0b',
              },
              {
                icon: '📊',
                label: 'Avg Hours/Day',
                value: getTotalStats().avgHours + 'h',
                color: '#ef4444',
              },
              {
                icon: '📅',
                label: 'Total Days',
                value: getTotalStats().totalDays,
                color: '#8b5cf6',
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '2px solid #f3f4f6',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = stat.color;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#f3f4f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: stat.color,
                    marginBottom: '4px',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    fontWeight: '600',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            {/* Work Hours Chart */}
            <div
              style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '2px solid #f3f4f6',
              }}
            >
              <h4
                style={{
                  marginBottom: '20px',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#374151',
                }}
              >
                ⏰ Work Hours Trend
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '2px solid #667eea',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px' }} />
                  <Line
                    type="monotone"
                    dataKey="workHours"
                    stroke="#667eea"
                    strokeWidth={3}
                    dot={{ fill: '#667eea', r: 5 }}
                    activeDot={{ r: 7 }}
                    name="Work Hours"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Deliveries & Pickups Chart */}
            <div
              style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '2px solid #f3f4f6',
              }}
            >
              <h4
                style={{
                  marginBottom: '20px',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#374151',
                }}
              >
                📦 Deliveries & Pickups
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '2px solid #10b981',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px' }} />
                  <Bar dataKey="deliveries" fill="#667eea" radius={[8, 8, 0, 0]} name="Deliveries" />
                  <Bar dataKey="pickups" fill="#10b981" radius={[8, 8, 0, 0]} name="Pickups" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Breaks Chart */}
            <div
              style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '2px solid #f3f4f6',
              }}
            >
              <h4
                style={{
                  marginBottom: '20px',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#374151',
                }}
              >
                ☕ Break Frequency
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '2px solid #f59e0b',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px' }} />
                  <Bar
                    dataKey="breaks"
                    fill="#f59e0b"
                    radius={[8, 8, 0, 0]}
                    name="Number of Breaks"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Table */}
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #f3f4f6',
            }}
          >
            <h4
              style={{
                marginBottom: '16px',
                fontSize: '16px',
                fontWeight: '700',
                color: '#374151',
              }}
            >
              📋 Detailed Records
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>📅 Date</th>
                    <th>🛣️ Route</th>
                    <th>📦 Deliveries</th>
                    <th>📥 Pickups</th>
                    <th>⏰ Work Hours</th>
                    <th>☕ Breaks</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td style={{ fontWeight: '600', color: '#374151' }}>
                        {formatDate(session.date)}
                      </td>
                      <td style={{ color: '#667eea', fontWeight: '600' }}>
                        {session.route_number || '-'}
                      </td>
                      <td style={{ fontWeight: '600' }}>{session.deliveries || 0}</td>
                      <td style={{ fontWeight: '600' }}>{session.pickups || 0}</td>
                      <td style={{ color: '#10b981', fontWeight: '700' }}>
                        {calculateWorkHours(session)}h
                      </td>
                      <td>{(session.breaks || []).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Performance;
