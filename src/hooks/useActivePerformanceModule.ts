import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PerformanceModuleType = 'gamification' | 'target_actual' | 'none';

export const useActivePerformanceModule = () => {
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['performance-module-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_module_config')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  return {
    activeModule: (config?.active_module as PerformanceModuleType) || 'none',
    isGamificationActive: config?.active_module === 'gamification',
    isTargetActualActive: config?.active_module === 'target_actual',
    isLoading,
    error,
    config,
  };
};
