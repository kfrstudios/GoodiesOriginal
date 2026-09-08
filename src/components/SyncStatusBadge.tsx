import { useState, useEffect } from 'react';
import { Cloud, CloudCheck, CloudOff, RefreshCw, AlertCircle, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { syncEngine } from '../services/syncEngine';
import { SyncStatusInfo } from '../types';

export function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatusInfo>(syncEngine.getStatus());
  const [isOpen, setIsOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await syncEngine.triggerSync();
    } finally {
      setTimeout(() => setIsManualSyncing(false), 600);
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Noch nicht synchronisiert';
    const date = new Date(ts);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        id="sync-status-indicator-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
          status.state === 'offline'
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            : status.state === 'syncing' || isManualSyncing
            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30'
            : status.state === 'error'
            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
        }`}
        title="Synchronisationsstatus & Offlinemodus anzeigen"
      >
        {status.state === 'offline' ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Offline</span>
            {status.pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {status.pendingCount}
              </span>
            )}
          </>
        ) : status.state === 'syncing' || isManualSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-spin" />
            <span className="hidden sm:inline">Synchronisiere...</span>
          </>
        ) : status.state === 'error' ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span className="hidden sm:inline">Sync-Fehler</span>
          </>
        ) : (
          <>
            <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Cloud Sync</span>
          </>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-4 z-50 text-zinc-900 dark:text-zinc-100 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Cloud & Offline-Status
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  status.isOnline
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}
              >
                {status.isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {status.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span>Ausstehende Änderungen:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {status.pendingCount === 0 ? 'Keine (alles aktuell)' : `${status.pendingCount} lokal in Queue`}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span>Letzter Cloud-Abgleich:</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {formatLastSync(status.lastSyncTimestamp)}
                </span>
              </div>
              {status.lastError && (
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] leading-tight">
                  {status.lastError}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="manual-sync-trigger-btn"
                onClick={handleManualSync}
                disabled={!status.isOnline || isManualSyncing}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                <span>{isManualSyncing ? 'Wird abgeglichen...' : 'Jetzt synchronisieren'}</span>
              </button>
            </div>

            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center leading-relaxed">
              Offline-Änderungen werden lokal gesichert und automatisch mit Firebase synchronisiert, sobald du wieder verbunden bist.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
