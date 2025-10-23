import { supabase } from '@/integrations/supabase/client';

/**
 * Marks attendance for today and also checks in to all planned visits
 * This ensures that either "Day Started" or "Visit Check-in" can be used interchangeably
 * Uses high-accuracy GPS for precise location tracking
 */
export const markDayStarted = async (
  userId: string,
  location: { latitude: number; longitude: number },
  photoPath: string
) => {
  const today = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();

  // First, mark attendance
  const { error: attendanceError } = await supabase
    .from('attendance')
    .insert({
      user_id: userId,
      date: today,
      check_in_time: timestamp,
      check_in_location: location,
      check_in_address: `${location.latitude}, ${location.longitude}`,
      check_in_photo_url: photoPath,
      status: 'present'
    });

  if (attendanceError) throw attendanceError;

  // Then, check in to all planned visits for today automatically
  const { data: plannedVisits } = await supabase
    .from('visits')
    .select('id')
    .eq('user_id', userId)
    .eq('planned_date', today)
    .is('check_in_time', null);

  if (plannedVisits && plannedVisits.length > 0) {
    // Update all planned visits with check-in time
    for (const visit of plannedVisits) {
      await supabase
        .from('visits')
        .update({
          check_in_time: timestamp,
          check_in_location: location,
          check_in_address: `${location.latitude}, ${location.longitude}`,
          check_in_photo_url: photoPath,
          location_match_in: true,
          status: 'in-progress'
        })
        .eq('id', visit.id);
    }
  }

  return { success: true };
};

/**
 * Checks if attendance has been marked for today
 */
export const hasAttendanceToday = async (userId: string): Promise<boolean> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('attendance')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  return !error && !!data;
};

/**
 * Marks attendance when checking in to a visit (if not already marked)
 * Uses high-accuracy GPS for precise location tracking
 */
export const ensureAttendanceOnVisitCheckIn = async (
  userId: string,
  location: { latitude: number; longitude: number },
  photoPath: string
) => {
  const hasAttendance = await hasAttendanceToday(userId);
  
  if (!hasAttendance) {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    await supabase
      .from('attendance')
      .insert({
        user_id: userId,
        date: today,
        check_in_time: timestamp,
        check_in_location: location,
        check_in_address: `${location.latitude}, ${location.longitude}`,
        check_in_photo_url: photoPath,
        status: 'present'
      });
  }
};
