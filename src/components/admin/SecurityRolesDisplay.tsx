import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SecurityProfile {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  user_count: number;
}

interface SecurityRolesDisplayProps {
  className?: string;
}

const roleColors: Record<string, string> = {
  'Super Admin': 'bg-red-500/10 text-red-600 border-red-500/20',
  'System Administrator': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Sales Manager': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Product Manager': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Field Sales Executive': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Data Viewer': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

const SecurityRolesDisplay: React.FC<SecurityRolesDisplayProps> = ({ className }) => {
  const [roles, setRoles] = useState<SecurityProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      
      // Fetch security profiles
      const { data: profiles, error: profileError } = await supabase
        .from('security_profiles')
        .select('id, name, description, is_system')
        .order('name');
      
      if (profileError) throw profileError;

      // Fetch user counts per profile
      const { data: userCounts, error: countError } = await supabase
        .from('user_profiles')
        .select('profile_id');
      
      if (countError) throw countError;

      // Count users per profile
      const countMap = new Map<string, number>();
      userCounts?.forEach(up => {
        const current = countMap.get(up.profile_id) || 0;
        countMap.set(up.profile_id, current + 1);
      });

      const rolesWithCounts: SecurityProfile[] = (profiles || []).map(profile => ({
        ...profile,
        user_count: countMap.get(profile.id) || 0
      }));

      setRoles(rolesWithCounts);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (name: string) => {
    return roleColors[name] || 'bg-muted text-muted-foreground border-border';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Roles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-md ${getRoleColor(role.name)}`}
            >
              <div className="flex flex-col h-full">
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">{role.name}</h3>
                {role.description && (
                  <p className="text-xs opacity-70 mb-2 line-clamp-2">{role.description}</p>
                )}
                <div className="mt-auto flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  <span className="font-medium">{role.user_count} users</span>
                </div>
                {role.is_system && (
                  <Badge variant="outline" className="absolute top-2 right-2 text-[10px] px-1.5 py-0">
                    System
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {roles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No security profiles found</p>
            <p className="text-sm">Create profiles in Security & Access Control</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityRolesDisplay;
