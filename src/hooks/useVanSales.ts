import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useVanSales = () => {
  const [isVanSalesEnabled, setIsVanSalesEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('van_sales_settings')
      .select('is_enabled')
      .maybeSingle();
    
    if (error) {
      console.error('Error loading van sales settings:', error);
    } else if (data) {
      setIsVanSalesEnabled(data.is_enabled);
    }
    setLoading(false);
  };

  return { isVanSalesEnabled, loading };
};
