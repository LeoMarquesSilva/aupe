import React, { createContext, useContext } from 'react';

export type AppShellLayoutValue = {
  isMobileShell: boolean;
  sidebarCollapsed: boolean;
  /** Largura atual da sidebar em px (desktop); 0 quando o drawer é overlay (mobile). */
  sidebarWidthPx: number;
};

const defaultValue: AppShellLayoutValue = {
  isMobileShell: false,
  sidebarCollapsed: false,
  sidebarWidthPx: 0,
};

export const AppShellLayoutContext = createContext<AppShellLayoutValue>(defaultValue);

export function useAppShellLayout(): AppShellLayoutValue {
  return useContext(AppShellLayoutContext);
}
