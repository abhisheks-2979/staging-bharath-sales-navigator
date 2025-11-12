import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLocationFeature = () => {
  const [isLocationEnabled, setIsLocationEnabled] = useState(false); // Default to false to prevent flickering
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    
    // Subscribe to changes in feature flags
    const channel = supabase
      .channel('location-feature-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feature_flags',
        filter: 'feature_key=eq.location_check_in_enabled'
      }, (payload) => {
        if (payload.new && 'is_enabled' in payload.new) {
          setIsLocationEnabled(payload.new.is_enabled as boolean);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('is_enabled')
      .eq('feature_key', 'location_check_in_enabled')
      .maybeSingle();
    
    if (error) {
      console.error('Error loading location feature settings:', error);
    } else if (data) {
      setIsLocationEnabled(data.is_enabled);
    }
    setLoading(false);
  };

  return { isLocationEnabled, loading };
};
