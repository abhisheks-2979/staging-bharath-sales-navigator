import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface HierarchyUser {
  id: string;
  full_name: string;
  username: string;
  profile_picture_url?: string;
  role_name?: string;
  manager_id?: string;
  secondary_manager_id?: string;
  directReports: HierarchyUser[];
}

interface UserHierarchyProps {
  className?: string;
}

// Color palette for different hierarchy levels
const levelColors = [
  'bg-pink-500',      // Level 0 - Top (CEO/Admin)
  'bg-slate-700',     // Level 1
  'bg-purple-500',    // Level 2
  'bg-blue-500',      // Level 3
  'bg-green-500',     // Level 4
  'bg-amber-500',     // Level 5+
];

const getLevelColor = (level: number): string => {
  return levelColors[Math.min(level, levelColors.length - 1)];
};

interface UserNodeProps {
  user: HierarchyUser;
  level?: number;
  isLast?: boolean;
  parentHasMoreChildren?: boolean;
}

const OrgNode = ({ user, level = 0 }: { user: HierarchyUser; level?: number }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasReports = user.directReports.length > 0;
  const colorClass = getLevelColor(level);

  return (
    <div className="flex flex-col items-center">
      {/* User Node */}
      <div 
        className={cn(
          "relative flex flex-col items-center cursor-pointer group",
          hasReports && "mb-2"
        )}
        onClick={() => hasReports && setIsExpanded(!isExpanded)}
      >
        {/* Avatar with colored background */}
        <div className={cn(
          "relative rounded-full p-1 transition-transform group-hover:scale-105",
          colorClass
        )}>
          <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-background">
            <AvatarImage src={user.profile_picture_url} />
            <AvatarFallback className="bg-background text-foreground font-semibold text-sm">
              {user.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          {/* Expand/Collapse indicator */}
          {hasReports && (
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm border">
              {isExpanded ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Name and Role */}
        <div className="mt-1 text-center max-w-[100px] md:max-w-[120px]">
          <p className="text-xs font-medium truncate" title={user.full_name || user.username}>
            {user.full_name || user.username}
          </p>
          <p className="text-[10px] text-muted-foreground truncate" title={user.role_name}>
            {user.role_name || 'No Role'}
          </p>
        </div>
      </div>

      {/* Vertical connector line to children */}
      {hasReports && isExpanded && (
        <>
          <div className="w-px h-4 bg-border" />
          
          {/* Horizontal connector and children container */}
          <div className="relative">
            {/* Horizontal line spanning all children */}
            {user.directReports.length > 1 && (
              <div 
                className="absolute top-0 h-px bg-border"
                style={{
                  left: '50%',
                  right: '50%',
                  transform: 'translateX(-50%)',
                  width: `calc(100% - 60px)`
                }}
              />
            )}
            
            {/* Children */}
            <div className="flex gap-2 md:gap-4">
              {user.directReports.map((report, index) => (
                <div key={report.id} className="flex flex-col items-center">
                  {/* Vertical line from horizontal connector to child */}
                  <div className="w-px h-4 bg-border" />
                  <OrgNode user={report} level={level + 1} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const UserHierarchy: React.FC<UserHierarchyProps> = ({ className }) => {
  const [hierarchy, setHierarchy] = useState<HierarchyUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHierarchy();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('hierarchy-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchHierarchy();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => {
        fetchHierarchy();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, profile_picture_url');
      
      if (profileError) throw profileError;

      // Fetch employee relationships
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('user_id, manager_id, secondary_manager_id');
      
      if (empError) throw empError;

      // Fetch user_profiles (users with security profiles/roles)
      const { data: userProfiles, error: upError } = await supabase
        .from('user_profiles')
        .select('user_id, profile_id');
      
      if (upError) throw upError;

      // Fetch security_profiles
      const { data: securityProfiles, error: spError } = await supabase
        .from('security_profiles')
        .select('id, name');
      
      if (spError) throw spError;

      // Build hierarchy map - include all users who have a role assigned
      const userMap = new Map<string, HierarchyUser>();
      const childToParent = new Map<string, string>();

      // First, add all users who have roles assigned
      userProfiles?.forEach(up => {
        const profile = profiles?.find(p => p.id === up.user_id);
        if (!profile) return;
        
        const emp = employees?.find(e => e.user_id === up.user_id);
        const secProfile = securityProfiles?.find(sp => sp.id === up.profile_id);
        const roleName = secProfile?.name;
        
        userMap.set(up.user_id, {
          id: up.user_id,
          full_name: profile.full_name || '',
          username: profile.username || '',
          profile_picture_url: profile.profile_picture_url,
          role_name: roleName,
          manager_id: emp?.manager_id,
          secondary_manager_id: emp?.secondary_manager_id,
          directReports: []
        });

        if (emp?.manager_id) {
          childToParent.set(up.user_id, emp.manager_id);
        }
      });

      // Also add managers who might not have a security profile assignment
      employees?.forEach(emp => {
        if (emp.manager_id && !userMap.has(emp.manager_id)) {
          const profile = profiles?.find(p => p.id === emp.manager_id);
          if (profile) {
            const managerProfile = userProfiles?.find(up => up.user_id === emp.manager_id);
            const secProfile = managerProfile 
              ? securityProfiles?.find(sp => sp.id === managerProfile.profile_id)
              : null;
            
            userMap.set(emp.manager_id, {
              id: emp.manager_id,
              full_name: profile.full_name || '',
              username: profile.username || '',
              profile_picture_url: profile.profile_picture_url,
              role_name: secProfile?.name || 'Manager',
              manager_id: undefined,
              secondary_manager_id: undefined,
              directReports: []
            });
          }
        }
      });

      // Build parent-child relationships
      childToParent.forEach((managerId, userId) => {
        const manager = userMap.get(managerId);
        const user = userMap.get(userId);
        if (manager && user) {
          manager.directReports.push(user);
        }
      });

      // Find root nodes (users without managers or whose managers aren't in the map)
      const rootNodes: HierarchyUser[] = [];
      const superAdmins: HierarchyUser[] = [];
      
      userMap.forEach((user, userId) => {
        const managerId = childToParent.get(userId);
        if (!managerId || !userMap.has(managerId)) {
          if (user.role_name === 'System Administrator' || user.role_name === 'Super Admin') {
            superAdmins.push(user);
          } else {
            rootNodes.push(user);
          }
        }
      });

      // Sort direct reports by name for each user
      userMap.forEach(user => {
        user.directReports.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      });

      // Sort root nodes by name
      rootNodes.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      superAdmins.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      
      setHierarchy([...superAdmins, ...rootNodes]);
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Hierarchy
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hierarchy.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No users with hierarchy configured</p>
            <p className="text-sm">Assign managers to users to build the hierarchy</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex justify-center min-w-max py-4">
              <div className="flex gap-8">
                {hierarchy.map((user) => (
                  <OrgNode key={user.id} user={user} level={0} />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserHierarchy;
