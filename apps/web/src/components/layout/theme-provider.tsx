'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme.store';

/**
 * Mounts invisibly in RootLayout.
 * On first render it reads localStorage and applies the saved theme
 * (sets data-theme on <html> and updates --background CSS variable).
 */
export function ThemeProvider() {
  const loadFromStorage = useThemeStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return null;
}