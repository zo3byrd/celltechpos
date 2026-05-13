import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      licenseError: null,
      setAuth: (token, user) => set({ token, user, licenseError: null }),
      logout: () => set({ token: null, user: null, licenseError: null }),
      setLicenseError: (err) => set({ licenseError: err }),
      clearLicenseError: () => set({ licenseError: null }),
    }),
    { name: 'wireless-pos-auth' }
  )
);
