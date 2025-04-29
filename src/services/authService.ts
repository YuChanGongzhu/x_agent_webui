import { supabase } from '../lib/supabase';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials extends LoginCredentials {
  role?: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

export const authService = {
  // Sign in with email and password
  login: async ({ email, password }: LoginCredentials) => {
    try {
      // We're using password hash in our DB, but we need to handle authentication manually
      const { data, error } = await supabase
        .from('users')
        .select('id, email, password_hash, role, is_active')
        .eq('email', email)
        .single();

      if (error || !data) {
        throw new Error('Invalid login credentials');
      }

      if (!data.is_active) {
        throw new Error('Account is inactive. Please contact an administrator.');
      }

      // In production, you should use a proper password hashing library like bcrypt
      // Here we're simulating password verification
      // In a real implementation, you would use bcrypt.compare or similar
      const isPasswordValid = data.password_hash === password; // Not secure, just for demo!
      
      if (!isPasswordValid) {
        throw new Error('Invalid login credentials');
      }

      // Store user data in localStorage (you may want to use more secure methods in production)
      const user: User = {
        id: data.id,
        email: data.email,
        role: data.role,
        is_active: data.is_active
      };
      
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to login');
    }
  },

  // Sign up new user
  signup: async ({ email, password, role = 'user' }: SignupCredentials) => {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // In a real application, you would hash the password before storage
      // Here we're storing the plain password as password_hash which is NOT secure
      // This is for demonstration only
      const { data, error } = await supabase
        .from('users')
        .insert([
          { 
            email, 
            password_hash: password, // You should hash this!
            role 
          }
        ])
        .select('id, email, role, is_active')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create account');
      }

      // Store user in localStorage
      const user: User = {
        id: data.id,
        email: data.email,
        role: data.role,
        is_active: data.is_active
      };
      
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create account');
    }
  },

  // Sign out
  logout: () => {
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!authService.getCurrentUser();
  },

  // Check if user is admin
  isAdmin: (): boolean => {
    const user = authService.getCurrentUser();
    return user?.role === 'admin';
  }
};
