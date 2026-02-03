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
import { useAuth } from '../context/AuthContext';
import { calculateTimeMetrics } from '../lib/sessionHelpers';

function Performance({ userId, isAdminView = false, onEditSession, refreshTrigger = 0 }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [days, setDays] = useState(7);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [userId, days, startDate, endDate, useCustomRange, refreshTrigger]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sessions')
        .select(`
          *,
          user:user_id (
            id,
            name,
            username
          )
        `)
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
    const metrics = calculateTimeMetrics(session);
    return metrics.workTime.toFixed(2);
  };

  const calculateBreakHours = (session) => {
    const metrics = calculateTimeMetrics(session);
    return metrics.breakTime.toFixed(2);
  };

  const calculateTotalHours = (session) => {
    const metrics = calculateTimeMetrics(session);
    return metrics.totalTime.toFixed(2);
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
        breakHours: parseFloat(calculateBreakHours(session)),
        totalHours: parseFloat(calculateTotalHours(session)),
        positiveDeliveries: session.positive_deliveries || 0,
        negativeDeliveries: session.negative_deliveries || 0,
        deliveries: (session.positive_deliveries || 0) + (session.negative_deliveries || 0),
        positivePickups: session.positive_pickups || 0,
        negativePickups: session.negative_pickups || 0,
        pickups: (session.positive_pickups || 0) + (session.negative_pickups || 0),
        breaks: (session.breaks || []).length,
        totalKm: session.total_km || 0
      }));
  };

  const getTotalStats = () => {
    const totalPositiveDeliveries = sessions.reduce((sum, s) => sum + (s.positive_deliveries || 0), 0);
    const totalNegativeDeliveries = sessions.reduce((sum, s) => sum + (s.negative_deliveries || 0), 0);
    const totalDeliveries = totalPositiveDeliveries + totalNegativeDeliveries;
    
    const totalPositivePickups = sessions.reduce((sum, s) => sum + (s.positive_pickups || 0), 0);
    const totalNegativePickups = sessions.reduce((sum, s) => sum + (s.negative_pickups || 0), 0);
    const totalPickups = totalPositivePickups + totalNegativePickups;
    
    const totalWorkHours = sessions.reduce((sum, s) => sum + parseFloat(calculateWorkHours(s)), 0);
    const totalBreakHours = sessions.reduce((sum, s) => sum + parseFloat(calculateBreakHours(s)), 0);
    const totalHours = sessions.reduce((sum, s) => sum + parseFloat(calculateTotalHours(s)), 0);
    const totalKm = sessions.reduce((sum, s) => sum + (s.total_km || 0), 0);
    
    const avgWorkHours = sessions.length > 0 ? totalWorkHours / sessions.length : 0;
    const avgBreakHours = sessions.length > 0 ? totalBreakHours / sessions.length : 0;

    return {
      totalDeliveries,
      totalPositiveDeliveries,
      totalNegativeDeliveries,
      totalPickups,
      totalPositivePickups,
      totalNegativePickups,
      totalWorkHours: totalWorkHours.toFixed(1),
      totalBreakHours: totalBreakHours.toFixed(1),
      totalHours: totalHours.toFixed(1),
      avgWorkHours: avgWorkHours.toFixed(1),
      avgBreakHours: avgBreakHours.toFixed(1),
      totalKm: totalKm.toFixed(1),
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
                subtitle: `${getTotalStats().totalPositiveDeliveries} success, ${getTotalStats().totalNegativeDeliveries} failed`
              },
              {
                icon: '📥',
                label: 'Total Pickups',
                value: getTotalStats().totalPickups,
                color: '#10b981',
                subtitle: `${getTotalStats().totalPositivePickups} success, ${getTotalStats().totalNegativePickups} failed`
              },
              {
                icon: '⏰',
                label: 'Work Hours',
                value: getTotalStats().totalWorkHours + 'h',
                color: '#f59e0b',
                subtitle: `Avg: ${getTotalStats().avgWorkHours}h/day`
              },
              {
                icon: '☕',
                label: 'Break Hours',
                value: getTotalStats().totalBreakHours + 'h',
                color: '#ef4444',
                subtitle: `Avg: ${getTotalStats().avgBreakHours}h/day`
              },
              {
                icon: '🕐',
                label: 'Total Hours',
                value: getTotalStats().totalHours + 'h',
                color: '#8b5cf6',
                subtitle: `Work + Break time`
              },
              {
                icon: '🚗',
                label: 'Distance Driven',
                value: getTotalStats().totalKm + ' KM',
                color: '#06b6d4',
                subtitle: `${sessions.length} days tracked`
              }
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
                    marginBottom: '2px'
                  }}
                >
                  {stat.label}
                </div>
                {stat.subtitle && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#9ca3af',
                      fontWeight: '500',
                    }}
                  >
                    {stat.subtitle}
                  </div>
                )}
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
            {/* Work Hours & Break Hours Chart */}
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
                ⏰ Work & Break Hours Trend
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
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 5 }}
                    activeDot={{ r: 7 }}
                    name="Work Hours"
                  />
                  <Line
                    type="monotone"
                    dataKey="breakHours"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Break Hours"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Deliveries Success/Failure Chart */}
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
                📦 Delivery Success Rate
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
                  <Bar dataKey="positiveDeliveries" stackId="deliveries" fill="#10b981" radius={[0, 0, 0, 0]} name="Successful" />
                  <Bar dataKey="negativeDeliveries" stackId="deliveries" fill="#ef4444" radius={[8, 8, 0, 0]} name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pickups Success/Failure Chart */}
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
                📥 Pickup Success Rate
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={getChartData()}>
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
                  <Bar dataKey="positivePickups" stackId="pickups" fill="#667eea" radius={[0, 0, 0, 0]} name="Successful" />
                  <Bar dataKey="negativePickups" stackId="pickups" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Failed" />
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
              📋 Detailed Records {isAdminView && <span style={{ fontSize: '12px', color: '#6b7280' }}>(Click to edit)</span>}
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
                    <th>☕ Break Hours</th>
                    <th>🚗 Distance</th>
                    {isAdminView && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr 
                      key={session.id}
                      style={{ 
                        cursor: isAdminView ? 'pointer' : 'default',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (isAdminView) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isAdminView) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <td style={{ fontWeight: '600', color: '#374151' }}>
                        {formatDate(session.date)}
                      </td>
                      <td style={{ color: '#667eea', fontWeight: '600' }}>
                        {session.route_number || '-'}
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ color: '#10b981' }}>
                            ✓ {session.positive_deliveries || 0}
                          </span>
                          {(session.negative_deliveries || 0) > 0 && (
                            <span style={{ color: '#ef4444', fontSize: '12px' }}>
                              ✗ {session.negative_deliveries}
                            </span>
                          )}
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>
                            Total: {(session.positive_deliveries || 0) + (session.negative_deliveries || 0)}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ color: '#10b981' }}>
                            ✓ {session.positive_pickups || 0}
                          </span>
                          {(session.negative_pickups || 0) > 0 && (
                            <span style={{ color: '#ef4444', fontSize: '12px' }}>
                              ✗ {session.negative_pickups}
                            </span>
                          )}
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>
                            Total: {(session.positive_pickups || 0) + (session.negative_pickups || 0)}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: '#10b981', fontWeight: '700' }}>
                        {calculateWorkHours(session)}h
                      </td>
                      <td style={{ color: '#f59e0b', fontWeight: '600' }}>
                        {calculateBreakHours(session)}h
                      </td>
                      <td style={{ color: '#06b6d4', fontWeight: '600' }}>
                        {session.total_km ? `${session.total_km} KM` : '-'}
                      </td>
                      {isAdminView && (
                        <td>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditSession(session);
                            }}
                            style={{
                              background: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      )}
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
