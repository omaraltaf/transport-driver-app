// Audit logging utility for tracking admin edits to session records
import { supabase } from './supabase';

/**
 * Log an edit to a session field for audit purposes
 * @param {string} sessionId - The ID of the session being edited
 * @param {string} fieldName - The name of the field being changed
 * @param {any} oldValue - The previous value
 * @param {any} newValue - The new value
 * @param {string} editedBy - The ID of the user making the edit
 */
export const logSessionEdit = async (sessionId, fieldName, oldValue, newValue, editedBy) => {
  try {
    // Only log if values are actually different
    if (oldValue === newValue) {
      return;
    }

    const { data, error } = await supabase
      .from('session_edit_history')
      .insert([{
        session_id: sessionId,
        field_name: fieldName,
        old_value: oldValue ? String(oldValue) : null,
        new_value: newValue ? String(newValue) : null,
        edited_by: editedBy
      }]);

    if (error) {
      console.error('Error logging session edit:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to log session edit:', error);
    throw error;
  }
};

/**
 * Log multiple field edits in a single transaction
 * @param {string} sessionId - The ID of the session being edited
 * @param {Array} changes - Array of {fieldName, oldValue, newValue} objects
 * @param {string} editedBy - The ID of the user making the edits
 */
export const logMultipleSessionEdits = async (sessionId, changes, editedBy) => {
  try {
    const edits = changes
      .filter(change => change.oldValue !== change.newValue)
      .map(change => ({
        session_id: sessionId,
        field_name: change.fieldName,
        old_value: change.oldValue ? String(change.oldValue) : null,
        new_value: change.newValue ? String(change.newValue) : null,
        edited_by: editedBy
      }));

    if (edits.length === 0) {
      return;
    }

    const { data, error } = await supabase
      .from('session_edit_history')
      .insert(edits);

    if (error) {
      console.error('Error logging multiple session edits:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to log multiple session edits:', error);
    throw error;
  }
};

/**
 * Get edit history for a specific session
 * @param {string} sessionId - The ID of the session
 * @returns {Array} Array of edit history records
 */
export const getSessionEditHistory = async (sessionId) => {
  try {
    const { data, error } = await supabase
      .from('session_edit_history')
      .select(`
        *,
        editor:edited_by (
          id,
          name,
          username
        )
      `)
      .eq('session_id', sessionId)
      .order('edited_at', { ascending: false });

    if (error) {
      console.error('Error fetching session edit history:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch session edit history:', error);
    throw error;
  }
};

/**
 * Get all edit history for admin dashboard
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of records to return
 * @param {string} options.userId - Filter by specific user ID
 * @param {Date} options.startDate - Filter edits after this date
 * @param {Date} options.endDate - Filter edits before this date
 * @returns {Array} Array of edit history records
 */
export const getAllEditHistory = async (options = {}) => {
  try {
    let query = supabase
      .from('session_edit_history')
      .select(`
        *,
        session:session_id (
          id,
          date,
          route_number,
          user:user_id (
            id,
            name,
            username
          )
        ),
        editor:edited_by (
          id,
          name,
          username
        )
      `);

    // Apply filters
    if (options.userId) {
      query = query.eq('edited_by', options.userId);
    }

    if (options.startDate) {
      query = query.gte('edited_at', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('edited_at', options.endDate.toISOString());
    }

    // Apply limit and ordering
    query = query
      .order('edited_at', { ascending: false })
      .limit(options.limit || 100);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all edit history:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch all edit history:', error);
    throw error;
  }
};

/**
 * Get edit statistics for admin dashboard
 * @returns {Object} Statistics about edits
 */
export const getEditStatistics = async () => {
  try {
    // Get total edits count
    const { count: totalEdits, error: countError } = await supabase
      .from('session_edit_history')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Get edits by admin
    const { data: editsByAdmin, error: adminError } = await supabase
      .from('session_edit_history')
      .select(`
        edited_by,
        editor:edited_by (
          name,
          username
        )
      `);

    if (adminError) throw adminError;

    // Count edits per admin
    const adminEditCounts = editsByAdmin.reduce((acc, edit) => {
      const adminId = edit.edited_by;
      if (!acc[adminId]) {
        acc[adminId] = {
          admin: edit.editor,
          count: 0
        };
      }
      acc[adminId].count++;
      return acc;
    }, {});

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentEdits, error: recentError } = await supabase
      .from('session_edit_history')
      .select('*', { count: 'exact', head: true })
      .gte('edited_at', sevenDaysAgo.toISOString());

    if (recentError) throw recentError;

    return {
      totalEdits: totalEdits || 0,
      recentEdits: recentEdits || 0,
      adminEditCounts: Object.values(adminEditCounts),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to fetch edit statistics:', error);
    throw error;
  }
};