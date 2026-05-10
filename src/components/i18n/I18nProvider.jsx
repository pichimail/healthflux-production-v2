/**
 * I18nProvider — initialises i18next before the app tree mounts.
 * Import this once at the top of Layout.js.
 *
 * MIGRATION (Next.js): Move to app/providers.tsx and wrap with <I18nextProvider>
 */
import './i18n';
import React from 'react';

export default function I18nProvider({ children }) {
  return <>{children}</>;
}