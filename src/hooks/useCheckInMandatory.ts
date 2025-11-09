import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useCheckInMandatory = () => {
  const [isCheckInMandatory, setIsCheckInMandatory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('is_enabled')
      .eq('feature_key', 'check_in_mandatory_for_order')
      .maybeSingle();
    
    if (error) {
      console.error('Error loading check-in mandatory settings:', error);
    } else if (data) {
      setIsCheckInMandatory(data.is_enabled);
    }
    setLoading(false);
  };

  return { isCheckInMandatory, loading };
};
