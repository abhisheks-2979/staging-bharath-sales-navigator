import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ChevronRight, Users, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

const UserNode = ({ user, level = 0 }: { user: HierarchyUser; level?: number }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasReports = user.directReports.length > 0;
  
  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${level === 0 ? 'bg-primary/5 border border-primary/20' : ''}`}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => hasReports && setIsExpanded(!isExpanded)}
      >
        {hasReports ? (
          <button className="p-0.5 hover:bg-muted rounded">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        
        <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
          <AvatarImage src={user.profile_picture_url} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
            {user.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{user.full_name || user.username}</p>
          <p className="text-xs text-muted-foreground truncate">{user.role_name || 'No Role Assigned'}</p>
        </div>
        
        {hasReports && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Users className="h-3 w-3" />
            <span>{user.directReports.length}</span>
          </div>
        )}
      </div>
      
      {isExpanded && hasReports && (
        <div className="relative">
          <div 
            className="absolute left-[18px] top-0 bottom-4 w-px bg-border"
            style={{ marginLeft: `${level * 24}px` }}
          />
          {user.directReports.map((report) => (
            <UserNode key={report.id} user={report} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const UserHierarchy: React.FC<UserHierarchyProps> = ({ className }) => {
  const [hierarchy, setHierarchy] = useState<HierarchyUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, profile_picture_url');
      
      if (profileError) throw profileError;

      // Fetch employee relationships
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('user_id, manager_id, secondary_manager_id');
      
      if (empError) throw empError;

      // Fetch user_profiles with security_profiles for role names
      const { data: userProfiles, error: upError } = await supabase
        .from('user_profiles')
        .select('user_id, profile_id, security_profiles(name)');
      
      if (upError) throw upError;

      // Build hierarchy map - include all users who have a role assigned
      const userMap = new Map<string, HierarchyUser>();
      const childToParent = new Map<string, string>();

      // First, add all users who have roles assigned
      userProfiles?.forEach(up => {
        const profile = profiles?.find(p => p.id === up.user_id);
        if (!profile) return;
        
        const emp = employees?.find(e => e.user_id === up.user_id);
        const roleName = (up.security_profiles as any)?.name;
        
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

      // Build parent-child relationships
      childToParent.forEach((managerId, userId) => {
        const manager = userMap.get(managerId);
        const user = userMap.get(userId);
        if (manager && user) {
          manager.directReports.push(user);
        }
      });

      // Find root nodes (users without managers)
      // Prioritize System Administrator (Super Admin) at the top
      const rootNodes: HierarchyUser[] = [];
      const superAdmins: HierarchyUser[] = [];
      
      userMap.forEach((user, userId) => {
        const managerId = childToParent.get(userId);
        if (!managerId || !userMap.has(managerId)) {
          // Check if this is a System Administrator (Super Admin)
          if (user.role_name === 'System Administrator') {
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
      
      // Super Admins first, then other root nodes
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
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
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
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {hierarchy.map((user) => (
              <UserNode key={user.id} user={user} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserHierarchy;
