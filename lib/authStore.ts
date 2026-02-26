import { create } from "zustand";
import type { User, Fotografo } from "@/types/electron";

interface AuthStore {
  // ─── State ──────────────────────────────────────────────────────────────
  user: User | null;
  fotografo: Fotografo | null;
  loading: boolean;
  error: string | null;
  checked: boolean; // has session check been attempted?

  // ─── Actions ────────────────────────────────────────────────────────────
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  fotografo: null,
  loading: false,
  error: null,
  checked: false,

  login: async () => {
    set({ loading: true, error: null });
    try {
      const result = await window.electronAPI.login();
      if (result.success && result.user) {
        set({
          user: result.user,
          fotografo: result.fotografo ?? null,
          loading: false,
          checked: true,
        });
        return true;
      } else {
        set({
          loading: false,
          error: result.error || "Error al iniciar sesión",
        });
        return false;
      }
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await window.electronAPI.logout();
    } catch {
      // ignore
    }
    set({ user: null, fotografo: null, error: null });
  },

  checkSession: async () => {
    set({ loading: true });
    try {
      const result = await window.electronAPI.getSession();
      if (result.success && result.user) {
        set({
          user: result.user,
          fotografo: result.fotografo ?? null,
          loading: false,
          checked: true,
        });
      } else {
        set({ user: null, fotografo: null, loading: false, checked: true });
      }
    } catch {
      set({ user: null, fotografo: null, loading: false, checked: true });
    }
  },

  clearError: () => set({ error: null }),
}));
