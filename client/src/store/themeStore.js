import { create } from 'zustand';

const stored = localStorage.getItem('theme');
const initial = stored === 'dark';

if (initial) document.documentElement.classList.add('dark');

export const useThemeStore = create((set) => ({
  isDark: initial,
  toggleTheme: () => set((s) => {
    const next = !s.isDark;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    return { isDark: next };
  }),
}));
