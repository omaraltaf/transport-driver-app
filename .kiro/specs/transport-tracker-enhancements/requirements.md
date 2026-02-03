# Transport Tracker Enhancements - Requirements

## Overview
Based on user feedback from testing, this spec addresses critical improvements needed for the transport tracking system to better serve both drivers and administrators.

## User Stories

### Driver Experience Improvements

#### 1. Enhanced Delivery/Pickup Tracking
**As a driver**, I want to separately track positive deliveries, negative deliveries, and pickups so that I can provide accurate reporting of my daily activities.

**Current State**: Single "deliveries" and "pickups" number fields that don't distinguish between successful and unsuccessful attempts.

**Acceptance Criteria**:
- 1.1 Driver can enter positive deliveries (successful deliveries)
- 1.2 Driver can enter negative deliveries (failed delivery attempts)
- 1.3 Driver can enter positive pickups (successful pickups)  
- 1.4 Driver can enter negative pickups (failed pickup attempts)
- 1.5 Total deliveries and total pickups are automatically calculated
- 1.6 All fields are clearly labeled and intuitive

#### 2. Editable Time Tracking
**As a driver**, I want to edit break times after I've entered them so that I can correct mistakes when I forget to log breaks on time.

**Acceptance Criteria**:
- 2.1 Driver can edit the start time of any break
- 2.2 Driver can edit the end time of any break
- 2.3 Changes are validated to ensure logical time sequences
- 2.4 Edit functionality is easily accessible from the breaks display

#### 3. Comments and Failure Reasons
**As a driver**, I want to add comments explaining why deliveries or pickups failed so that there's proper documentation for follow-up.

**Acceptance Criteria**:
- 3.1 Driver can add comments for negative deliveries explaining the reason
- 3.2 Driver can add comments for negative pickups explaining the reason
- 3.3 Comments are optional but encouraged for failed attempts
- 3.4 Comments are stored and visible in reporting

#### 4. Vehicle Mileage Tracking
**As a driver**, I want to record my vehicle's starting and ending mileage so that mileage can be tracked for maintenance and reporting.

**Acceptance Criteria**:
- 4.1 Driver can enter starting KM at beginning of shift
- 4.2 Driver can enter ending KM at end of shift
- 4.3 Total KM driven is automatically calculated
- 4.4 KM fields are validated to ensure ending > starting

### Admin Experience Improvements

#### 5. Admin Record Editing
**As an admin**, I want to edit all driver records so that I can correct errors and maintain accurate data.

**Acceptance Criteria**:
- 5.1 Admin can edit all fields in any driver session record
- 5.2 Admin can edit delivery/pickup numbers and comments
- 5.3 Admin can edit time tracking data (start, end, breaks)
- 5.4 Admin can edit mileage data
- 5.5 Edit history is tracked for audit purposes

#### 6. Enhanced KPI Reporting
**As an admin**, I want to see work time, break time, and total time as key metrics instead of just number of breaks.

**Acceptance Criteria**:
- 6.1 Admin dashboard shows total work time per driver per day
- 6.2 Admin dashboard shows total break time per driver per day
- 6.3 Admin dashboard shows total time (work + break) per driver per day
- 6.4 Break count is still available but not the primary metric
- 6.5 Time-based KPIs are prominently displayed in charts and tables

## Technical Requirements

### Data Model Changes
- Extend sessions table to include separate positive/negative delivery and pickup fields
- Add mileage tracking fields (start_km, end_km, total_km)
- Add comments field for failure explanations
- Add edit history tracking for admin changes

### User Interface Changes
- Redesign end-of-day form with separate positive/negative fields
- Add inline editing for break times
- Add comment fields for negative deliveries/pickups
- Add mileage input fields
- Create admin editing interface for all session data
- Update performance dashboards with time-based KPIs

### Validation Rules
- Ending mileage must be greater than starting mileage
- Break end times must be after start times
- Negative delivery/pickup counts cannot exceed total attempts
- All time edits must maintain logical sequence

## Success Metrics
- Drivers can accurately report both successful and failed delivery/pickup attempts
- Break time corrections can be made easily when needed
- Failed delivery/pickup reasons are documented for follow-up
- Vehicle mileage is tracked for all shifts
- Admins can correct any data entry errors
- Time-based KPIs provide better insights than break counts alone

## Out of Scope
- Integration with external delivery management systems
- GPS tracking or automatic mileage calculation
- Mobile app development (web interface only)
- Real-time notifications or alerts