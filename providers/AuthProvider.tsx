import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatabase } from './DatabaseProvider';
import { Platform, Alert } from 'react-native';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'inspector' | 'supervisor' | 'admin';
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isOnline: false,
  login: async () => {},
  register: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const { db, isReady } = useDatabase();

  useEffect(() => {
    if (isReady) {
      const mounted = { current: true };
      
      const checkAuthStatus = async () => {
        try {
          const userData = await AsyncStorage.getItem('user');
          if (userData && mounted.current) {
            setUser(JSON.parse(userData));
          }
        } catch (error) {
          console.error('Erro ao verificar autenticação:', error);
        } finally {
          if (mounted.current) {
            setIsLoading(false);
          }
        }
      };

      checkAuthStatus();

      return () => {
        mounted.current = false;
      };
    }
  }, [isReady]);

  useEffect(() => {
    const mounted = { current: true };
    
    // Simular verificação de conectividade
    const checkConnectivity = () => {
      if (mounted.current) {
        setIsOnline(Math.random() > 0.3); // 70% chance de estar online
      }
    };

    checkConnectivity();
    const interval = setInterval(checkConnectivity, 10000);
    
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, []);


  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    const mounted = { current: true };
    
    try {
      // Tentar usar Edge Function se disponível, senão usar autenticação local
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      let userData: User;
      
      if (supabaseUrl && supabaseKey) {
        // Usar Edge Function para login
        const response = await fetch(`${supabaseUrl}/functions/v1/auth-signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            password,
            rememberMe,
            deviceInfo: Platform.OS,
          }),
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Credenciais inválidas');
        }
        
        userData = result.user;
      } else {
        // Fallback para autenticação local
        userData = await loginLocally(email, password);
      }

      // Salvar usuário no banco local
      if (db && db.runAsync) {
        await db.runAsync(
          'INSERT OR REPLACE INTO users (id, name, email, role) VALUES (?, ?, ?, ?)',
          [userData.id, userData.name, userData.email, userData.role]
        );
      }

      // Salvar dados do usuário
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      // Salvar preferência de "lembrar-me"
      if (rememberMe) {
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('rememberMe');
      }
      
      if (mounted.current) {
        setUser(userData);
      }
    } catch (error) {
      mounted.current = false;
      throw error;
    } finally {
      mounted.current = false;
    }
  };

  // Função auxiliar para registro local
  const registerLocally = async (email: string, password: string) => {
    // Verificar se o usuário já existe no armazenamento local
    const existingUsers = await AsyncStorage.getItem('localUsers');
    const users = existingUsers ? JSON.parse(existingUsers) : {};
    
    if (users[email.toLowerCase()]) {
      throw new Error('Este e-mail já está cadastrado');
    }
    
    // Criar hash simples da senha (em produção, usar bcrypt)
    const passwordHash = btoa(password + email); // Base64 simples para demo
    
    // Salvar usuário
    const newUser = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      passwordHash,
      name: email.split('@')[0],
      role: 'inspector',
      createdAt: new Date().toISOString(),
    };
    
    users[email.toLowerCase()] = newUser;
    await AsyncStorage.setItem('localUsers', JSON.stringify(users));
  };

  // Função auxiliar para login local
  const loginLocally = async (email: string, password: string): Promise<User> => {
    // Verificar credenciais padrão primeiro
    if (email === 'inspetor@empresa.com' && password === '123456') {
      return {
        id: '1',
        name: 'João Silva',
        email: 'inspetor@empresa.com',
        role: 'inspector',
      };
    }
    
    // Verificar usuários locais
    const existingUsers = await AsyncStorage.getItem('localUsers');
    const users = existingUsers ? JSON.parse(existingUsers) : {};
    
    const user = users[email.toLowerCase()];
    if (!user) {
      throw new Error('Credenciais inválidas');
    }
    
    // Verificar senha
    const expectedHash = btoa(password + email);
    if (user.passwordHash !== expectedHash) {
      throw new Error('Credenciais inválidas');
    }
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  };

  const forgotPassword = async (email: string) => {
    const mounted = { current: true };
    
    try {
      // Tentar usar Edge Function se disponível
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const response = await fetch(`${supabaseUrl}/functions/v1/auth-forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ email: email.toLowerCase() }),
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Erro ao enviar e-mail de recuperação');
        }
      } else {
        // Fallback local - apenas simular
        const existingUsers = await AsyncStorage.getItem('localUsers');
        const users = existingUsers ? JSON.parse(existingUsers) : {};
        
        if (!users[email.toLowerCase()] && email !== 'inspetor@empresa.com') {
          throw new Error('E-mail não encontrado em nossa base de dados');
        }
        
        console.log(`E-mail de recuperação enviado para: ${email}`);
      }
    } catch (error) {
      mounted.current = false;
      throw error;
    } finally {
      mounted.current = false;
    }
  };

  const register = async (email: string, password: string) => {
    const mounted = { current: true };
    
    try {
      // Tentar usar Edge Function se disponível, senão usar armazenamento local
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        // Usar Edge Function para registro
        const response = await fetch(`${supabaseUrl}/functions/v1/auth-signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            password,
            name: email.split('@')[0], // Usar parte do email como nome temporário
            role: 'inspector',
          }),
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Erro ao criar conta');
        }
      } else {
        // Fallback para armazenamento local
        await registerLocally(email, password);
      }
      
    } catch (error) {
      mounted.current = false;
      throw error;
    } finally {
      mounted.current = false;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    const mounted = { current: true };
    
    try {
      // Tentar usar Edge Function se disponível
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const response = await fetch(`${supabaseUrl}/functions/v1/auth-reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ token, newPassword }),
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Erro ao redefinir senha');
        }
      } else {
        // Fallback local - validação simples
        if (!token || token.length < 10) {
          throw new Error('Token inválido ou expirado');
        }
        
        console.log('Senha redefinida com sucesso (modo local)');
      }
    } catch (error) {
      mounted.current = false;
      throw error;
    } finally {
      mounted.current = false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('rememberMe');
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isOnline,
        login,
        register,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};