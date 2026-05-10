import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { BottomSheetProvider } from '@/lib/BottomSheetContext';
import { Toaster } from '@/components/ui/toaster';
import { routeRegistry, defaultAuthenticatedRoute, bindPages } from '@/lib/routes';
import { PAGES } from '@/pages.config';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import MarketingHome from '@/pages/MarketingHome';
import Layout from '@/Layout.jsx';

// Bind page components to route registry (breaks circular dep)
bindPages(PAGES);

function LayoutWrapper({ children, pageId }) {
  if (Layout) {
    return <Layout currentPageName={pageId}>{children}</Layout>;
  }
  return children;
}

function ProtectedRoute({ children, pageId, requiresAuth, requiresAdmin }) {
  const { isAuthenticated, isLoadingAuth, user, navigateToLogin, authError } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--hf-bg)', color: 'var(--hf-text)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (requiresAuth && !isAuthenticated) {
    navigateToLogin();
    return null;
  }

  if (requiresAdmin && user?.role !== 'admin') {
    return <Navigate to={defaultAuthenticatedRoute} replace />;
  }

  return (
    <LayoutWrapper pageId={pageId}>
      {children}
    </LayoutWrapper>
  );
}

function AppRoutes() {
  const { isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--hf-bg)', color: 'var(--hf-text)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      {/* MarketingHome explicit route — not in pagesConfig loop */}
      <Route path="/" element={
        <LayoutWrapper pageId="MarketingHome">
          <MarketingHome />
        </LayoutWrapper>
      } />
      <Route path="/MarketingHome" element={<Navigate to="/" replace />} />
      <Route path="/Landing" element={<Navigate to="/" replace />} />

      {routeRegistry
        .filter(r => r.id !== 'MarketingHome')
        .map((r) => {
          const PageComponent = r.component;
          if (!PageComponent) return null;

          const requiresAuth = r.requiresAuth;
          const requiresAdmin = r.requiresAdmin;

          const element = requiresAuth || requiresAdmin ? (
            <ProtectedRoute pageId={r.id} requiresAuth={requiresAuth} requiresAdmin={requiresAdmin}>
              <PageComponent />
            </ProtectedRoute>
          ) : (
            <LayoutWrapper pageId={r.id}>
              <PageComponent />
            </LayoutWrapper>
          );

          return (
            <React.Fragment key={r.id}>
              <Route path={r.path} element={element} />
              {r.legacyPaths
                .filter(lp => lp !== r.path)
                .map(lp => (
                  <Route key={lp} path={lp} element={<Navigate to={r.path} replace />} />
                ))}
            </React.Fragment>
          );
        })}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <BottomSheetProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster />
          </BrowserRouter>
        </BottomSheetProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}