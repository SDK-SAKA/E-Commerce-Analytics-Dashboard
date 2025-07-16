import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('dashboard_users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return 'staff';
      }
      
      return data?.role || 'staff';
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'staff';
    }
  };

  const updateAuthState = async (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    
    if (newSession?.user) {
      try {
        const role = await fetchUserRole(newSession.user.id);
        setUserRole(role);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('staff');
      }
    } else {
      setUserRole(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        // Prevent multiple initializations
        if (isInitialized) return;

        // Get initial session without triggering refresh
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Initial session error:', error);
          if (mounted) {
            setLoading(false);
            setIsInitialized(true);
          }
          return;
        }

        if (mounted) {
          await updateAuthState(session);
          setLoading(false);
          setIsInitialized(true);
        }

      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    const setupAuthListener = () => {
      // Set up auth state listener
      authSubscription = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted || !isInitialized) return;

          console.log('Auth event:', event);

          // Handle different events appropriately
          switch (event) {
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED':
              if (session) {
                await updateAuthState(session);
              }
              break;
              
            case 'SIGNED_OUT':
              setSession(null);
              setUser(null);
              setUserRole(null);
              break;
              
            default:
              // For other events, only update if we have a valid session
              if (session) {
                await updateAuthState(session);
              }
              break;
          }
          
          if (mounted) {
            setLoading(false);
          }
        }
      );
    };

    // Initialize auth first, then set up listener
    initializeAuth().then(() => {
      if (mounted) {
        setupAuthListener();
      }
    });

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.data?.subscription?.unsubscribe();
      }
    };
  }, [isInitialized]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear state even if signOut fails
      setSession(null);
      setUser(null);
      setUserRole(null);
      setLoading(false);
      throw error;
    }
  };

  const value = {
    user,
    session,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};