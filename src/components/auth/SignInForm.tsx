import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PermissionRequestModal } from './PermissionRequestModal';
import { hasRequestedPermissions } from '@/utils/permissionManager';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInFormData = z.infer<typeof signInSchema>;

interface SignInFormProps {
  role?: 'admin' | 'user';
}

export const SignInForm = ({ role }: SignInFormProps) => {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Check permissions after component mounts (non-blocking)
  useEffect(() => {
    // Delay permission check to not block initial app load
    const timer = setTimeout(() => {
      if (!hasRequestedPermissions()) {
        setShowPermissionModal(true);
      }
    }, 2000); // Show after 2 seconds to not block navigation
    
    return () => clearTimeout(timer);
  }, []);

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password, role);
      // Don't block navigation with permission modal
    } catch (error) {
      // Error is already handled by the signIn function
    }
    setIsLoading(false);
  };

  const handlePermissionComplete = () => {
    setShowPermissionModal(false);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : `Sign In${role ? ` as ${role.charAt(0).toUpperCase() + role.slice(1)}` : ''}`}
          </Button>
        </form>
      </Form>

      <PermissionRequestModal
        open={showPermissionModal}
        onComplete={handlePermissionComplete}
      />
    </>
  );
};