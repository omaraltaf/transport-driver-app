# Transport Tracker Enhancements - Design Document

## Architecture Overview

This enhancement builds upon the existing React/Supabase architecture, extending the current session tracking system with improved data models and user interfaces.

### Current System Analysis
- **Frontend**: React components with functional hooks
- **Backend**: Supabase PostgreSQL database
- **State Management**: React Context (AuthContext)
- **UI Framework**: Custom CSS with inline styles

## Database Schema Changes

### Sessions Table Extensions

```sql
-- Add new columns to existing sessions table
ALTER TABLE sessions ADD COLUMN positive_deliveries INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN negative_deliveries INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN positive_pickups INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN negative_pickups INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN delivery_comments TEXT;
ALTER TABLE sessions ADD COLUMN pickup_comments TEXT;
ALTER TABLE sessions ADD COLUMN start_km DECIMAL(10,2);
ALTER TABLE sessions ADD COLUMN end_km DECIMAL(10,2);
ALTER TABLE sessions ADD COLUMN total_km DECIMAL(10,2);

-- Keep existing deliveries and pickups columns for backward compatibility
-- They will be calculated as positive_deliveries + negative_deliveries
```

### New Audit Log Table

```sql
CREATE TABLE session_edit_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  edited_by UUID REFERENCES auth.users(id),
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE session_edit_history ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all edit history
CREATE POLICY "Admins can view all edit history" ON session_edit_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );
```

## Component Architecture

### Enhanced TimeTracking Component

**File**: `src/components/TimeTracking.jsx`

**Key Changes**:
1. **Enhanced End-of-Day Form**: Replace single delivery/pickup fields with separate positive/negative inputs
2. **Mileage Tracking**: Add start/end KM fields to the start work and end day flows
3. **Editable Breaks**: Add inline editing capability for break times
4. **Comment Fields**: Add optional comment fields for negative deliveries/pickups

**New State Variables**:
```javascript
const [positiveDeliveries, setPositiveDeliveries] = useState('');
const [negativeDeliveries, setNegativeDeliveries] = useState('');
const [positivePickups, setPositivePickups] = useState('');
const [negativePickups, setNegativePickups] = useState('');
const [deliveryComments, setDeliveryComments] = useState('');
const [pickupComments, setPickupComments] = useState('');
const [startKm, setStartKm] = useState('');
const [endKm, setEndKm] = useState('');
const [editingBreak, setEditingBreak] = useState(null);
```

### New AdminSessionEditor Component

**File**: `src/components/AdminSessionEditor.jsx`

**Purpose**: Provide comprehensive editing interface for admin users

**Features**:
- Edit all session fields including time tracking, deliveries, pickups, mileage
- Validation for all inputs
- Audit trail logging
- Modal-based interface

### Enhanced Performance Components

**Files**: 
- `src/components/Performance.jsx`
- `src/components/DriverPerformance.jsx`

**Key Changes**:
1. **Time-based KPIs**: Calculate and display work time, break time, total time
2. **Enhanced Charts**: Update charts to show time-based metrics prominently
3. **Detailed Tables**: Include mileage and comment data in reporting tables

## Data Flow and State Management

### Session Data Structure (Enhanced)

```javascript
const sessionSchema = {
  id: 'uuid',
  user_id: 'uuid',
  date: 'timestamp',
  start_time: 'timestamp',
  end_time: 'timestamp',
  status: 'enum', // 'working', 'on-break', 'ended'
  route_number: 'string',
  
  // Legacy fields (calculated)
  deliveries: 'integer', // positive_deliveries + negative_deliveries
  pickups: 'integer',    // positive_pickups + negative_pickups
  
  // New enhanced fields
  positive_deliveries: 'integer',
  negative_deliveries: 'integer',
  positive_pickups: 'integer',
  negative_pickups: 'integer',
  delivery_comments: 'text',
  pickup_comments: 'text',
  start_km: 'decimal',
  end_km: 'decimal',
  total_km: 'decimal', // calculated: end_km - start_km
  
  // Existing
  breaks: 'jsonb' // [{ start: timestamp, end: timestamp }]
};
```

### Calculation Functions

```javascript
// Calculate total deliveries/pickups for backward compatibility
const calculateTotals = (session) => ({
  ...session,
  deliveries: (session.positive_deliveries || 0) + (session.negative_deliveries || 0),
  pickups: (session.positive_pickups || 0) + (session.negative_pickups || 0),
  total_km: session.end_km && session.start_km ? 
    (session.end_km - session.start_km) : null
});

// Enhanced time calculations
const calculateTimeMetrics = (session) => {
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  const totalTime = end - start;
  
  const breakTime = (session.breaks || []).reduce((total, brk) => {
    if (brk.end) {
      return total + (new Date(brk.end) - new Date(brk.start));
    }
    return total;
  }, 0);
  
  const workTime = totalTime - breakTime;
  
  return {
    totalTime: totalTime / (1000 * 60 * 60), // hours
    breakTime: breakTime / (1000 * 60 * 60), // hours
    workTime: workTime / (1000 * 60 * 60)    // hours
  };
};
```

## User Interface Design

### Enhanced End-of-Day Form

```jsx
<form onSubmit={submitEndDay}>
  <label>Route Number</label>
  <input type="text" value={routeNumber} onChange={(e) => setRouteNumber(e.target.value)} required />
  
  <div className="delivery-pickup-grid">
    <div className="delivery-section">
      <h5>📦 Deliveries</h5>
      <label>Successful Deliveries</label>
      <input type="number" value={positiveDeliveries} onChange={(e) => setPositiveDeliveries(e.target.value)} min="0" />
      
      <label>Failed Deliveries</label>
      <input type="number" value={negativeDeliveries} onChange={(e) => setNegativeDeliveries(e.target.value)} min="0" />
      
      {negativeDeliveries > 0 && (
        <>
          <label>Reason for Failed Deliveries (Optional)</label>
          <textarea value={deliveryComments} onChange={(e) => setDeliveryComments(e.target.value)} 
                   placeholder="e.g., Customer not home, wrong address..." />
        </>
      )}
      
      <div className="total-display">
        Total Deliveries: {(parseInt(positiveDeliveries) || 0) + (parseInt(negativeDeliveries) || 0)}
      </div>
    </div>
    
    <div className="pickup-section">
      <h5>📥 Pickups</h5>
      <label>Successful Pickups</label>
      <input type="number" value={positivePickups} onChange={(e) => setPositivePickups(e.target.value)} min="0" />
      
      <label>Failed Pickups</label>
      <input type="number" value={negativePickups} onChange={(e) => setNegativePickups(e.target.value)} min="0" />
      
      {negativePickups > 0 && (
        <>
          <label>Reason for Failed Pickups (Optional)</label>
          <textarea value={pickupComments} onChange={(e) => setPickupComments(e.target.value)} 
                   placeholder="e.g., Package not ready, business closed..." />
        </>
      )}
      
      <div className="total-display">
        Total Pickups: {(parseInt(positivePickups) || 0) + (parseInt(negativePickups) || 0)}
      </div>
    </div>
  </div>
  
  <div className="mileage-section">
    <h5>🚗 Vehicle Mileage</h5>
    <label>Ending KM</label>
    <input type="number" value={endKm} onChange={(e) => setEndKm(e.target.value)} 
           step="0.1" min={startKm} required />
    
    {startKm && endKm && (
      <div className="total-display">
        Distance Driven: {(parseFloat(endKm) - parseFloat(startKm)).toFixed(1)} KM
      </div>
    )}
  </div>
</form>
```

### Editable Breaks Interface

```jsx
<div className="breaks-list">
  {currentSession.breaks.map((brk, idx) => (
    <div key={idx} className="break-item">
      {editingBreak === idx ? (
        <div className="break-edit-form">
          <input type="time" value={formatTimeForInput(brk.start)} 
                 onChange={(e) => updateBreakTime(idx, 'start', e.target.value)} />
          <span>to</span>
          <input type="time" value={formatTimeForInput(brk.end)} 
                 onChange={(e) => updateBreakTime(idx, 'end', e.target.value)} />
          <button onClick={() => saveBreakEdit(idx)}>✓</button>
          <button onClick={() => setEditingBreak(null)}>✗</button>
        </div>
      ) : (
        <div className="break-display">
          <span>Break {idx + 1}</span>
          <span>{formatTime(brk.start)} - {formatTime(brk.end)}</span>
          <button onClick={() => setEditingBreak(idx)}>✏️ Edit</button>
        </div>
      )}
    </div>
  ))}
</div>
```

### Enhanced Admin Dashboard

**New KPI Cards**:
```jsx
const timeBasedKPIs = [
  { icon: '⏰', label: 'Work Time', value: `${workTime.toFixed(1)}h`, color: '#10b981' },
  { icon: '☕', label: 'Break Time', value: `${breakTime.toFixed(1)}h`, color: '#f59e0b' },
  { icon: '🕐', label: 'Total Time', value: `${totalTime.toFixed(1)}h`, color: '#6366f1' },
  { icon: '🚗', label: 'Distance', value: `${totalKm.toFixed(1)} KM`, color: '#ef4444' }
];
```

## Validation Rules

### Input Validation

```javascript
const validateSession = (sessionData) => {
  const errors = [];
  
  // Mileage validation
  if (sessionData.end_km && sessionData.start_km) {
    if (parseFloat(sessionData.end_km) <= parseFloat(sessionData.start_km)) {
      errors.push('Ending KM must be greater than starting KM');
    }
  }
  
  // Delivery/pickup validation
  if (sessionData.negative_deliveries > (sessionData.positive_deliveries + sessionData.negative_deliveries)) {
    errors.push('Failed deliveries cannot exceed total delivery attempts');
  }
  
  if (sessionData.negative_pickups > (sessionData.positive_pickups + sessionData.negative_pickups)) {
    errors.push('Failed pickups cannot exceed total pickup attempts');
  }
  
  // Time sequence validation
  if (sessionData.breaks) {
    sessionData.breaks.forEach((brk, idx) => {
      if (brk.end && new Date(brk.end) <= new Date(brk.start)) {
        errors.push(`Break ${idx + 1}: End time must be after start time`);
      }
    });
  }
  
  return errors;
};
```

## Testing Strategy

### Property-Based Testing Framework
**Framework**: fast-check (JavaScript property-based testing library)

### Correctness Properties

#### Property 1: Total Calculation Consistency
**Validates: Requirements 1.5**
```javascript
// Property: Total deliveries always equals positive + negative deliveries
fc.property(
  fc.integer({ min: 0, max: 100 }), // positive_deliveries
  fc.integer({ min: 0, max: 100 }), // negative_deliveries
  (positive, negative) => {
    const session = { positive_deliveries: positive, negative_deliveries: negative };
    const calculated = calculateTotals(session);
    return calculated.deliveries === positive + negative;
  }
);
```

#### Property 2: Mileage Calculation Accuracy
**Validates: Requirements 4.3**
```javascript
// Property: Total KM always equals end KM minus start KM
fc.property(
  fc.float({ min: 0, max: 999999, noNaN: true }), // start_km
  fc.float({ min: 0, max: 999999, noNaN: true }), // end_km
  (start, end) => {
    fc.pre(end > start); // Precondition: end must be greater than start
    const session = { start_km: start, end_km: end };
    const calculated = calculateTotals(session);
    return Math.abs(calculated.total_km - (end - start)) < 0.01; // Allow for floating point precision
  }
);
```

#### Property 3: Time Sequence Validation
**Validates: Requirements 2.3**
```javascript
// Property: Break end times must always be after start times
fc.property(
  fc.array(fc.record({
    start: fc.date(),
    end: fc.date()
  })),
  (breaks) => {
    const validBreaks = breaks.filter(brk => brk.end > brk.start);
    const errors = validateSession({ breaks: validBreaks });
    return !errors.some(error => error.includes('End time must be after start time'));
  }
);
```

#### Property 4: Work Time Calculation
**Validates: Requirements 6.1, 6.2, 6.3**
```javascript
// Property: Work time + break time should equal total time
fc.property(
  fc.date(), // start_time
  fc.date(), // end_time  
  fc.array(fc.record({ start: fc.date(), end: fc.date() })), // breaks
  (startTime, endTime, breaks) => {
    fc.pre(endTime > startTime);
    const validBreaks = breaks.filter(brk => 
      brk.end > brk.start && 
      brk.start >= startTime && 
      brk.end <= endTime
    );
    
    const session = {
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      breaks: validBreaks.map(brk => ({
        start: brk.start.toISOString(),
        end: brk.end.toISOString()
      }))
    };
    
    const metrics = calculateTimeMetrics(session);
    const tolerance = 0.001; // 1 millisecond tolerance
    return Math.abs(metrics.workTime + metrics.breakTime - metrics.totalTime) < tolerance;
  }
);
```

### Unit Testing Strategy

**Framework**: Vitest

**Key Test Areas**:
1. **Form Validation**: Test all input validation rules
2. **Calculation Functions**: Test delivery/pickup totals, mileage, time calculations
3. **State Management**: Test component state updates and persistence
4. **Admin Permissions**: Test that only admins can edit records
5. **Audit Logging**: Test that changes are properly logged

## Implementation Plan

### Phase 1: Database Schema Updates
1. Add new columns to sessions table
2. Create audit log table
3. Update database policies
4. Create migration scripts

### Phase 2: Core Component Updates
1. Enhance TimeTracking component with new form fields
2. Add break editing functionality
3. Update session save/load logic
4. Implement validation functions

### Phase 3: Admin Features
1. Create AdminSessionEditor component
2. Add admin editing interface to DriverPerformance
3. Implement audit logging
4. Add edit history viewing

### Phase 4: Enhanced Reporting
1. Update Performance component with time-based KPIs
2. Enhance charts and tables
3. Add mileage and comment data to reports
4. Update dashboard layouts

### Phase 5: Testing and Validation
1. Implement property-based tests
2. Add comprehensive unit tests
3. Perform user acceptance testing
4. Performance optimization

## Security Considerations

### Row Level Security (RLS)
- Maintain existing RLS policies for sessions table
- Add RLS policies for audit log table
- Ensure drivers can only edit their own current session
- Ensure admins can edit any session

### Input Sanitization
- Sanitize all text inputs (comments, route numbers)
- Validate numeric inputs (mileage, delivery counts)
- Prevent SQL injection through parameterized queries

### Audit Trail
- Log all admin edits with user ID and timestamp
- Store both old and new values for accountability
- Provide audit trail viewing for administrators

## Performance Considerations

### Database Optimization
- Add indexes on frequently queried fields (user_id, date)
- Consider partitioning sessions table by date for large datasets
- Optimize break time calculations with database functions

### Frontend Optimization
- Implement debounced input validation
- Use React.memo for performance-critical components
- Lazy load admin editing components

## Migration Strategy

### Backward Compatibility
- Keep existing deliveries/pickups columns populated
- Gradually migrate existing data to new structure
- Provide fallback logic for missing new fields

### Data Migration Script
```sql
-- Migrate existing data to new structure
UPDATE sessions 
SET 
  positive_deliveries = COALESCE(deliveries, 0),
  negative_deliveries = 0,
  positive_pickups = COALESCE(pickups, 0),
  negative_pickups = 0
WHERE positive_deliveries IS NULL;
```

This design provides a comprehensive enhancement to the transport tracker system while maintaining backward compatibility and ensuring data integrity through proper validation and testing strategies.