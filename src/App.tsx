/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Toast } from './components/Toast';

import { AuthView } from './views/AuthView';
import { OnboardingView } from './views/OnboardingView';
import { HomeView } from './views/HomeView';
import { ScannerView } from './views/ScannerView';
import { ProductDetailView } from './views/ProductDetailView';
import { SearchView } from './views/SearchView';
import { TrackerView } from './views/TrackerView';
import { ListsView } from './views/ListsView';
import { ProfileView } from './views/ProfileView';
import { HistoryView } from './views/HistoryView';
import { ProModal } from './views/ProModal';
import { AdminView } from './views/AdminView';

function AppContent() {
  const { 
    activeView, 
    appAuthState, 
    setAppAuthState, 
    authErrorMessage,
    setAuthErrorMessage,
    handleAuthSuccess, 
    completeOnboarding, 
    user 
  } = useApp();

  // Scroll unconditionally to the top whenever active view or auth state changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);
    return () => clearTimeout(timer);
  }, [activeView, appAuthState]);

  // Loading state during auth check or initial session load
  if (appAuthState === 'INITIALIZING' || appAuthState === 'AUTH_LOADING') {
    return <LoadingScreen message="Goodies wird geladen …" />;
  }

  // Login & Registration view
  if (appAuthState === 'LOGIN') {
    return (
      <main className="min-h-screen bg-[#FAF9F6] text-zinc-900">
        <AuthView onAuthSuccess={handleAuthSuccess} />
        <Toast />
      </main>
    );
  }

  // First-time onboarding view
  if (appAuthState === 'ONBOARDING') {
    return (
      <main className="min-h-screen bg-[#FAF9F6] text-zinc-900">
        <OnboardingView 
          initialName={user.displayName || user.name} 
          onComplete={completeOnboarding} 
        />
        <Toast />
      </main>
    );
  }

  // Error fallback
  if (appAuthState === 'ERROR') {
    return (
      <main className="min-h-screen bg-[#FAF9F6] text-zinc-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-zinc-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto font-black text-lg">
            !
          </div>
          <h2 className="font-extrabold text-base text-zinc-900">Sitzung konnte nicht geladen werden</h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            {authErrorMessage || 'Bitte melde dich erneut an, um deine Goodies-Daten sicher zu laden.'}
          </p>
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setAuthErrorMessage(null);
                setAppAuthState('INITIALIZING');
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-all shadow-sm"
            >
              Erneut versuchen
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthErrorMessage(null);
                setAppAuthState('LOGIN');
              }}
              className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-2xl transition-all"
            >
              Zur Anmeldung
            </button>
          </div>
        </div>
        <Toast />
      </main>
    );
  }

  // Admin Hub has its own full-screen management layout
  if (activeView === 'admin') {
    return (
      <main className="min-h-screen bg-[#FAF9F6] text-zinc-900">
        <AdminView />
        <Toast />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-zinc-900 flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
      <Header />

      <main className="flex-1 w-full max-w-2xl mx-auto px-1 sm:px-4 pt-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
            {activeView === 'home' && <HomeView />}
            {activeView === 'scanner' && <ScannerView />}
            {activeView === 'product-detail' && <ProductDetailView />}
            {activeView === 'search' && <SearchView />}
            {activeView === 'tracker' && <TrackerView />}
            {activeView === 'lists' && <ListsView />}
            {activeView === 'history' && <HistoryView />}
            {activeView === 'profile' && <ProfileView />}
            {activeView === 'pro-modal' && <ProModal />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Navigation />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
