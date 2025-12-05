import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useVanSales = () => {
  const [isVanSalesEnabled, setIsVanSalesEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Check feature_flags table for van_sales feature
    const { data, error } = await supabase
      .from('feature_flags')
      .select('is_enabled')
      .eq('feature_key', 'van_sales')
      .maybeSingle();
    
    if (error) {
      console.error('Error loading van sales settings:', error);
      // Fallback to van_sales_settings table for backward compatibility
      const { data: legacyData } = await supabase
        .from('van_sales_settings')
        .select('is_enabled')
        .maybeSingle();
      
      if (legacyData) {
        setIsVanSalesEnabled(legacyData.is_enabled);
      }
    } else if (data) {
      setIsVanSalesEnabled(data.is_enabled);
    }
    setLoading(false);
  };

  return { isVanSalesEnabled, loading };
};
