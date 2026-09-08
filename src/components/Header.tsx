import { Leaf, Shield, Search, Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProBadge } from './pro/ProDesignSystem';
import { SyncStatusBadge } from './SyncStatusBadge';

export function Header() {
  const { activeView, setActiveView, effectiveTier, openPaywall, isAdmin, isDarkMode, toggleTheme } = useApp();
  const isPro = effectiveTier === 'PRO';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-zinc-200/60 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <button
          type="button"
          onClick={() => setActiveView('home')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Leaf className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-lg tracking-tight text-zinc-900 leading-none">
                Goodies
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {isPro && (
                <div className="ml-1">
                  <ProBadge size="xs" label="PRO" variant="gold" />
                </div>
              )}
            </div>
            <p className="text-[11px] font-medium text-zinc-400 leading-none mt-0.5">
              Food & Nutrition
            </p>
          </div>
        </button>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Cloud Sync & Offline Status */}
          <SyncStatusBadge />

          {/* Theme switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
            title={isDarkMode ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
            aria-label={isDarkMode ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-5 h-5 text-zinc-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {activeView !== 'search' && (
            <button
              type="button"
              onClick={() => setActiveView('search')}
              className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
              title="Produkte suchen"
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          {!isPro ? (
            <ProBadge 
              size="sm" 
              label="PRO" 
              variant="gold" 
              onClick={() => openPaywall('general')} 
            />
          ) : null}

          {/* Admin Hub Toggle - Only visible to Admins */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveView(activeView === 'admin' ? 'home' : 'admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                activeView === 'admin'
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Admin Hub</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
