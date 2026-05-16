import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      plan: 'trial',
      licenseError: null,
      onboardingDone: false,
      setAuth: (token, user, plan, refreshToken) => set({ token, refreshToken: refreshToken ?? null, user, plan: plan || 'trial', licenseError: null }),
      logout: () => set({ token: null, refreshToken: null, user: null, plan: 'trial', licenseError: null, onboardingDone: false }),
      setLicenseError: (err) => set({ licenseError: err }),
      clearLicenseError: () => set({ licenseError: null }),
      resetOnboarding: () => set({ onboardingDone: false }),
      setOnboardingDone: () => set({ onboardingDone: true }),
    }),
    { name: 'wireless-pos-auth' }
  )
);
