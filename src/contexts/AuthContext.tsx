import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

import { AppRole, Profile, School, AcademicYear } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  school: School | null;
  academicYear: AcademicYear | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, gradeLevel?: number) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setSchool: (school: School | null) => void;
  setAcademicYear: (year: AcademicYear | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();



    if (profileData) {
      const pData = profileData as any;
      setProfile(pData as Profile);

      // Fetch school if associated
      if (pData.school_id) {
        const { data: schoolData } = await (supabase as any)
          .from('schools')
          .select('*')
          .eq('id', pData.school_id)
          .single();
        if (schoolData) setSchool(schoolData as School);
      } else {
        // [New] Default to MABDC for admins if no school is set
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        const userRoles = roleData?.map(r => r.role) || [];

        if (userRoles.includes('admin')) {
          const { data: mabdcSchool } = await (supabase as any)
            .from('schools')
            .select('*')
            .eq('short_name', 'MABDC')
            .single();

          if (mabdcSchool) setSchool(mabdcSchool as School);
        }
      }

      // Fetch academic year if associated
      if (pData.academic_year_id) {
        const { data: ayData } = await (supabase as any)
          .from('academic_years')
          .select('*')
          .eq('id', pData.academic_year_id)
          .single();
        if (ayData) setAcademicYear(ayData as AcademicYear);
      } else {
        // [New] Default to 2026-2027 for admins if no academic year is set
        // Re-check role if needed, or rely on logic that runs after
        // Note: To avoid duplicate role fetching, we do a quick check here similar to above
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        const userRoles = roleData?.map(r => r.role) || [];

        if (userRoles.includes('admin')) {
          const { data: defaultAy } = await (supabase as any)
            .from('academic_years')
            .select('*')
            .eq('label', '2026-2027')
            .single();

          if (defaultAy) setAcademicYear(defaultAy as AcademicYear);
        }
      }
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (roleData) {
      setRoles(roleData.map(r => r.role as AppRole));
    } else {
      setRoles([]);
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
          setRoles([]);
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
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        const userRoles = roleData?.map(r => r.role) || ['student'];

        console.log(`[Auth] User logged in: ${email} (${userRoles.join(', ')}). Notifying admin...`);

        const { data, error: invokeError } = await supabase.functions.invoke('notify-admin', {
          body: {
            type: 'login',
            user_email: email,
            user_role: userRoles[0], // approximate for old API
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
    setRoles([]);
    setSchool(null);
    setAcademicYear(null);
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
    roles,
    school,
    academicYear,
    isAdmin: roles.includes('admin'),
    isTeacher: roles.includes('teacher'),
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    setSchool,
    setAcademicYear,
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
