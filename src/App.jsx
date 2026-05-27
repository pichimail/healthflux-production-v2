import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import { base44 } from '@/api/base44Client';
import { PLAN_DEFAULTS, resolveFeatureFlags } from '@/lib/FeatureFlagsContext';

// Bind page components to route registry (breaks circular dep)
bindPages(PAGES);

function LayoutWrapper({ children, pageId }) {
  if (Layout) {
    return <Layout currentPageName={pageId}>{children}</Layout>;
  }
  return children;
}

function ProtectedRoute({ children, pageId, requiresAuth, requiresAdmin, featureKey }) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, authError, user } = useAuth();
  const [adminAccess, setAdminAccess] = useState({ status: 'idle' });
  const [featureAccess, setFeatureAccess] = useState({ status: 'idle' });
  const [featureRefreshNonce, setFeatureRefreshNonce] = useState(0);

  useEffect(() => {
    if (!isLoadingAuth && requiresAuth && !isAuthenticated) {
      navigate('/auth', { replace: true, state: { returnTo: window.location.pathname } });
    }
  }, [isLoadingAuth, requiresAuth, isAuthenticated, navigate]);

  useEffect(() => {
    let cancelled = false;

    if (!requiresAdmin) {
      setAdminAccess({ status: 'idle' });
      return undefined;
    }

    if (isLoadingAuth || !isAuthenticated) {
      setAdminAccess({ status: 'idle' });
      return undefined;
    }

    // The auth context only knows Supabase auth state; role lives in the app user record.
    setAdminAccess({ status: 'loading' });

    const checkAdminAccess = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (cancelled) return;
        setAdminAccess({
          status: currentUser?.role === 'admin' ? 'allowed' : 'denied',
        });
      } catch {
        if (cancelled) return;
        setAdminAccess({ status: 'denied' });
      }
    };

    checkAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoadingAuth, requiresAdmin, user?.id]);

  useEffect(() => {
    let cancelled = false;

    if (!featureKey) {
      setFeatureAccess({ status: 'idle' });
      return undefined;
    }

    if (isLoadingAuth || !isAuthenticated) {
      setFeatureAccess({ status: 'idle' });
      return undefined;
    }

    setFeatureAccess({ status: 'loading' });

    const checkFeatureAccess = async () => {
      try {
        const currentUser = await base44.auth.me();
        const [subs = [], assignments = []] = await Promise.all([
          base44.entities.UserSubscription.filter({ user_email: currentUser.email }).catch(() => []),
          base44.entities.FeatureFlagAssignment.list('-created_date', 1000).catch(() => []),
        ]);
        const activeSub = (Array.isArray(subs) ? subs : []).find((s) => s.status === 'active' || s.status === 'trialing');
        const plan = activeSub?.plan_key || 'free';
        const resolved = resolveFeatureFlags(Array.isArray(assignments) ? assignments : [], plan, currentUser.email);
        const defaultForPlan = (PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.free)?.[featureKey] ?? false;
        const enabled = resolved?.[featureKey] ?? defaultForPlan;
        if (cancelled) return;
        setFeatureAccess({ status: enabled ? 'allowed' : 'denied' });
      } catch {
        if (cancelled) return;
        setFeatureAccess({ status: 'denied' });
      }
    };

    checkFeatureAccess();

    return () => {
      cancelled = true;
    };
  }, [featureKey, isAuthenticated, isLoadingAuth, user?.id, featureRefreshNonce]);

  useEffect(() => {
    if (!featureKey || !isAuthenticated) return undefined;
    const unsub = base44.entities.FeatureFlagAssignment.subscribe(() => {
      setFeatureRefreshNonce((n) => n + 1);
    });
    return unsub;
  }, [featureKey, isAuthenticated]);

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
    return null;
  }

  if (requiresAdmin && isAuthenticated && adminAccess.status !== 'allowed' && adminAccess.status !== 'denied') {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--hf-bg)', color: 'var(--hf-text)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
      </div>
    );
  }

  if (requiresAdmin && adminAccess.status === 'denied') {
    return <Navigate to={defaultAuthenticatedRoute} replace />;
  }

  if (featureKey && isAuthenticated && featureAccess.status !== 'allowed' && featureAccess.status !== 'denied') {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--hf-bg)', color: 'var(--hf-text)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
      </div>
    );
  }

  if (featureKey && featureAccess.status === 'denied') {
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
          const featureKey = r.featureKey;

          const element = requiresAuth || requiresAdmin ? (
            <ProtectedRoute pageId={r.id} requiresAuth={requiresAuth} requiresAdmin={requiresAdmin} featureKey={featureKey}>
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
