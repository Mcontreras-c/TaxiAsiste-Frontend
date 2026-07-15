import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UsuarioAuth } from '../types';
import { login as apiLogin, logout as apiLogout } from '../api/auth';

interface AuthState {
  usuario: UsuarioAuth | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await apiLogin(username, password);
          set({
            usuario: data.usuario,
            token: data.access,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: any) {
          const msg = err?.response?.data?.detail ?? 'Error al iniciar sesión.';
          set({ error: msg, isLoading: false });
        }
      },

      logout: () => {
        apiLogout();
        set({ usuario: null, token: null, isAuthenticated: false, error: null });
      },
    }),
    {
      name: 'taxiasiste-auth',
      partialize: (state) => ({
        usuario: state.usuario,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
