import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface JointSalesManager {
  id: string;
  full_name: string;
  profile_picture_url?: string;
}

export interface JointSalesFeedback {
  id?: string;
  visit_id?: string;
  retailer_id: string;
  manager_id: string;
  fse_user_id: string;
  beat_plan_id?: string;
  feedback_date: string;
  
  // Ratings
  branding_rating?: number;
  retailing_rating?: number;
  pricing_feedback_rating?: number;
  schemes_rating?: number;
  competition_rating?: number;
  product_feedback_rating?: number;
  sampling_rating?: number;
  distributor_feedback_rating?: number;
  sales_trends_rating?: number;
  future_growth_rating?: number;
  
  // Dropdowns
  branding_status?: string;
  shelf_visibility?: string;
  pricing_compliance?: string;
  scheme_awareness?: string;
  competition_presence?: string;
  sampling_status?: string;
  distributor_service?: string;
  sales_trend?: string;
  growth_potential?: string;
  
  // Notes
  retailer_notes?: string;
  conversation_highlights?: string;
  action_items?: string;
  additional_notes?: string;
}

export interface JointSalesSession {
  manager_id: string;
  manager_name: string;
  beat_name: string;
  session_date: string;
  retailers_visited: number;
  feedback_count: number;
}

export const useJointSales = () => {
  const { user } = useAuth();
  const [managers, setManagers] = useState<JointSalesManager[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch available managers (for FSEs to select when planning joint sales)
  const fetchManagers = async () => {
    if (!user) return [];
    
    try {
      // Get user's manager from employees table
      const { data: employeeData } = await supabase
        .from('employees')
        .select('manager_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!employeeData?.manager_id) return [];

      // Get manager's profile
      const { data: managerProfile } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .eq('id', employeeData.manager_id)
        .maybeSingle();

      if (managerProfile) {
        setManagers([managerProfile]);
        return [managerProfile];
      }

      return [];
    } catch (error) {
      console.error('Error fetching managers:', error);
      return [];
    }
  };

  // Submit joint sales feedback
  const submitJointSalesFeedback = async (feedback: JointSalesFeedback) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('joint_sales_feedback')
        .insert({
          ...feedback,
          manager_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update session tracking
      await updateJointSalesSession(
        feedback.fse_user_id,
        feedback.beat_plan_id,
        feedback.feedback_date
      );

      return data;
    } catch (error) {
      console.error('Error submitting joint sales feedback:', error);
      throw error;
    }
  };

  // Update joint sales session tracking
  const updateJointSalesSession = async (
    fseUserId: string,
    beatPlanId?: string,
    sessionDate?: string
  ) => {
    if (!user || !sessionDate) return;

    try {
      // Get beat plan details
      const { data: beatPlan } = await supabase
        .from('beat_plans')
        .select('beat_id, beat_name')
        .eq('id', beatPlanId || '')
        .maybeSingle();

      // Check if session exists
      const { data: existingSession } = await supabase
        .from('joint_sales_sessions')
        .select('*')
        .eq('manager_id', user.id)
        .eq('fse_user_id', fseUserId)
        .eq('session_date', sessionDate)
        .eq('beat_plan_id', beatPlanId || '')
        .maybeSingle();

      // Get feedback count
      const { count } = await supabase
        .from('joint_sales_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('manager_id', user.id)
        .eq('fse_user_id', fseUserId)
        .eq('feedback_date', sessionDate);

      if (existingSession) {
        // Update existing session
        await supabase
          .from('joint_sales_sessions')
          .update({
            total_feedback_captured: count || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSession.id);
      } else {
        // Create new session
        await supabase
          .from('joint_sales_sessions')
          .insert({
            manager_id: user.id,
            fse_user_id: fseUserId,
            beat_plan_id: beatPlanId,
            session_date: sessionDate,
            beat_id: beatPlan?.beat_id,
            beat_name: beatPlan?.beat_name,
            total_feedback_captured: count || 0,
          });
      }
    } catch (error) {
      console.error('Error updating joint sales session:', error);
    }
  };

  // Get joint sales sessions for a manager
  const getJointSalesSessions = async (startDate: string, endDate: string): Promise<JointSalesSession[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('joint_sales_sessions')
        .select(`
          *,
          profiles:fse_user_id (full_name)
        `)
        .eq('manager_id', user.id)
        .gte('session_date', startDate)
        .lte('session_date', endDate)
        .order('session_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(session => ({
        manager_id: session.manager_id,
        manager_name: (session as any).profiles?.full_name || 'Unknown',
        beat_name: session.beat_name || 'Unknown Beat',
        session_date: session.session_date,
        retailers_visited: session.total_retailers_visited || 0,
        feedback_count: session.total_feedback_captured || 0,
      }));
    } catch (error) {
      console.error('Error fetching joint sales sessions:', error);
      return [];
    }
  };

  // Get joint sales feedback for a specific beat plan
  const getJointSalesFeedback = async (beatPlanId: string) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('joint_sales_feedback')
        .select(`
          *,
          retailers (name, address)
        `)
        .eq('beat_plan_id', beatPlanId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching joint sales feedback:', error);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      fetchManagers();
    }
  }, [user]);

  return {
    managers,
    loading,
    fetchManagers,
    submitJointSalesFeedback,
    getJointSalesSessions,
    getJointSalesFeedback,
  };
};
