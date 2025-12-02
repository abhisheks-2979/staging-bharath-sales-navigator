import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LicenseConfig {
  field_sales_enabled: boolean;
  institutional_sales_enabled: boolean;
  license_type: string;
}

export const useInstitutionalAccess = () => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [licenseConfig, setLicenseConfig] = useState<LicenseConfig | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Check feature flag
        const { data: featureFlag } = await supabase
          .from('feature_flags')
          .select('is_enabled')
          .eq('feature_key', 'institutional_sales')
          .single();

        // Check license config
        const { data: license } = await supabase
          .from('license_config')
          .select('*')
          .limit(1)
          .single();

        const isEnabled = featureFlag?.is_enabled && license?.institutional_sales_enabled;
        setHasAccess(isEnabled || false);
        setLicenseConfig(license as LicenseConfig);
      } catch (error) {
        console.error('Error checking institutional access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  return { hasAccess, loading, licenseConfig };
};
