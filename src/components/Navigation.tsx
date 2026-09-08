import { Home, Bookmark, Flame, History, User, ScanLine } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { AppView } from '../types';

export function Navigation() {
  const { activeView, setActiveView } = useApp();

  // Exakt 5 Punkte mit Tracker in der Mitte
  const navItems: { view: AppView; label: string; icon: typeof Home }[] = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'lists', label: 'Listen', icon: Bookmark },
    { view: 'tracker', label: 'Tracker', icon: Flame },
    { view: 'history', label: 'Verlauf', icon: History },
    { view: 'profile', label: 'Profil', icon: User },
  ];

  // Im Admin-Modus oder im Vollbild-Scanner die Leiste ausblenden
  if (activeView === 'admin' || activeView === 'scanner') return null;

  return (
    <>
      {/* Kompakter Primary-Action-Button oberhalb der Navigation */}
      <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => setActiveView('scanner')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-full shadow-lg shadow-emerald-900/20 border border-emerald-400/40 flex items-center gap-2 transition-all group"
          title="Barcode scannen"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center group-hover:rotate-12 transition-transform">
            <ScanLine className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="tracking-tight whitespace-nowrap">Barcode scannen</span>
        </motion.button>
      </div>

      {/* Untere Navigation: Exakt 5 Punkte */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#171a20]/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 pb-safe">
        <div className="max-w-md mx-auto px-4 py-1.5 flex items-center justify-between">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.view;
            const isCenterTracker = item.view === 'tracker';

            return (
              <motion.button
                key={item.view}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setActiveView(item.view)}
                className={`relative flex flex-col items-center py-1.5 px-3 rounded-xl transition-colors focus:outline-none ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-emerald-600 dark:text-emerald-400' : ''}`} />
                  {isCenterTracker && (
                    <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </div>
                <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400"
                    transition={{ type: 'spring', damping: 26, stiffness: 350 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
