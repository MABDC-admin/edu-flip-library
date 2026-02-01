import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'student' | 'teacher';

interface Profile {
  id: string;
  name: string;
  grade_level: number | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, gradeLevel?: number) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleData) {
      setRole(roleData.role as AppRole);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Defer Supabase calls with setTimeout
        if (newSession?.user) {
          setTimeout(() => {
            fetchProfile(newSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }

        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      // Get role after sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch role to send in notification
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
        const userRole = roleData?.role || 'student';

        console.log(`[Auth] User logged in: ${email} (${userRole}). Notifying admin...`);

        const { data, error: invokeError } = await supabase.functions.invoke('notify-admin', {
          body: {
            type: 'login',
            user_email: email,
            user_role: userRole,
          }
        });

        if (invokeError) {
          console.error('[Auth] Admin notification failed:', invokeError);
        } else {
          console.log('[Auth] Admin notification sent:', data);
        }
      }
    }
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string, gradeLevel?: number) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error, data: sessionData } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          grade_level: gradeLevel || 1,
        },
      },
    });

    if (!error && sessionData?.user) {
      console.log(`[Auth] New registration: ${email}. Notifying admin...`);
      supabase.functions.invoke('notify-admin', {
        body: {
          type: 'registration',
          user_email: email,
          user_role: 'student', // Default for signups
        }
      });
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    isAdmin: role === 'admin',
    isTeacher: role === 'teacher',
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
