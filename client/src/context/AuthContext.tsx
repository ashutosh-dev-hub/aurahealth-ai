import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  switchRoleDemo: (role: Role, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('aura_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('aura_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get<{ success: boolean; data: User }>('/auth/me');
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Failed to verify stored user session:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('aura_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('aura_token');
    setToken(null);
    setUser(null);
  };

  const switchRoleDemo = async (role: Role, emailOverride?: string) => {
    let email = 'patient.john@aurahealth.ai';
    let password = 'Password@123';

    if (emailOverride) {
      email = emailOverride;
    } else if (role === 'ADMIN') {
      email = 'admin@aurahealth.ai';
      password = 'Admin@123';
    } else if (role === 'DOCTOR') {
      email = 'dr.sarah@aurahealth.ai';
      password = 'Password@123';
    } else if (role === 'PATIENT') {
      email = 'patient.john@aurahealth.ai';
      password = 'Password@123';
    }

    try {
      const response = await api.post<{ success: boolean; data: { token: string; user: User } }>('/auth/login', {
        email,
        password,
      });

      if (response.success && response.data) {
        login(response.data.token, response.data.user);
      }
    } catch (err: any) {
      console.error('Failed to switch demo role:', err);
      alert(`Login failed: ${err.message}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchRoleDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
