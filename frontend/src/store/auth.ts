import { create } from "zustand";
import type { UserSummary } from "../types";

interface AuthState {
  accessToken: string | null;
  currentUser: UserSummary | null;
  refreshToken: string | null;
  login: (accessToken: string, refreshToken: string | undefined, user: UserSummary) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

// Tokens are kept in memory only — never written to localStorage or sessionStorage
// to mitigate XSS token theft (T024 security requirement).
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  currentUser: null,

  login(accessToken, refreshToken, user) {
    set({ accessToken, refreshToken: refreshToken ?? null, currentUser: user });
  },

  setAccessToken(token) {
    set({ accessToken: token });
  },

  logout() {
    set({ accessToken: null, refreshToken: null, currentUser: null });
  },
}));
