/**
 * Offline Synchronization & Conflict Resolution Engine for Goodies
 * 
 * Rules:
 * 1. Immediate local persistence with timestamp and unique ID
 * 2. Automatic sync on internet reconnection and app lifecycle
 * 3. Last-Write-Wins (LWW) with verified timestamps for direct overwrites
 * 4. Multi-device additive merging for Shopping Lists, Meal Logs, and Water Logs
 * 5. Water entries logged individually as WaterLogEntry records to prevent total overwrite collisions
 * 6. Deduplicated Scan History with deletion tombstones
 * 7. Transparent Sync Status reporting ('synced' | 'offline' | 'syncing' | 'error')
 */

import {
  SyncStatusInfo,
  SyncStatusState,
  WaterLogEntry,
  ShoppingList,
  MealLogItem,
  ScanHistoryItem,
  CustomFoodItem,
  UserProfile,
  AppReportItem
} from '../types';
import {
  saveUserDoc,
  saveUserShoppingListDoc,
  deleteUserShoppingListDoc,
  saveUserDailyTrackerDoc,
  fetchUserDailyTracker,
  saveUserScanHistoryDoc,
  clearAllUserScanHistoryDocs,
  saveUserCustomFoodDoc,
  deleteUserCustomFoodDoc,
  saveAppReportToFirestore,
  addUserFavoriteDoc,
  removeUserFavoriteDoc,
  fetchUserShoppingLists
} from './firebase';

export type QueuedOperationType =
  | 'UPDATE_PROFILE'
  | 'SAVE_LIST'
  | 'RENAME_LIST'
  | 'DELETE_LIST'
  | 'SAVE_MEAL_LOG'
  | 'REMOVE_MEAL_LOG'
  | 'ADD_WATER_LOG'
  | 'RESET_WATER'
  | 'ADD_SCAN'
  | 'CLEAR_SCANS'
  | 'TOGGLE_FAVORITE'
  | 'SAVE_CUSTOM_FOOD'
  | 'DELETE_CUSTOM_FOOD'
  | 'SUBMIT_REPORT';

export interface QueuedChange {
  id: string;
  uid: string;
  type: QueuedOperationType;
  entityId: string;
  payload: any;
  timestamp: number;
  isoTimestamp: string;
  retryCount: number;
  lastError?: string;
}

type SyncListener = (status: SyncStatusInfo) => void;

class GoodiesSyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private currentUid: string | null = null;
  private lastSyncTimestamp: number | null = null;
  private lastError: string | null = null;
  private periodicIntervalId: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen to browser online/offline events
      window.addEventListener('online', () => {
        this.notifyStatus();
        this.triggerSync();
      });

      window.addEventListener('offline', () => {
        this.notifyStatus();
      });

      // Also trigger on window focus
      window.addEventListener('focus', () => {
        if (navigator.onLine) {
          this.triggerSync();
        }
      });

      // Periodic check every 25 seconds
      this.periodicIntervalId = window.setInterval(() => {
        if (navigator.onLine && this.getPendingCount() > 0) {
          this.triggerSync();
        }
      }, 25000);
    }
  }

  public setUid(uid: string | null) {
    this.currentUid = uid;
    this.notifyStatus();
    if (uid && navigator.onLine) {
      this.triggerSync();
    }
  }

  private getQueueKey(uid: string): string {
    return `goodies_sync_queue_${uid}`;
  }

  private getTombstonesKey(uid: string, entity: string): string {
    return `goodies_tombstones_${uid}_${entity}`;
  }

  public getQueue(uid: string = this.currentUid || ''): QueuedChange[] {
    if (!uid) return [];
    try {
      const raw = localStorage.getItem(this.getQueueKey(uid));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(uid: string, queue: QueuedChange[]): void {
    if (!uid) return;
    try {
      localStorage.setItem(this.getQueueKey(uid), JSON.stringify(queue));
    } catch (err) {
      console.warn('Could not persist sync queue:', err);
    }
  }

  public getPendingCount(): number {
    if (!this.currentUid) return 0;
    return this.getQueue(this.currentUid).length;
  }

  public getStatus(): SyncStatusInfo {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const pendingCount = this.getPendingCount();

    let state: SyncStatusState = 'synced';
    if (!isOnline) {
      state = 'offline';
    } else if (this.isSyncing) {
      state = 'syncing';
    } else if (this.lastError) {
      state = 'error';
    } else if (pendingCount > 0) {
      state = 'syncing';
    }

    return {
      state,
      pendingCount,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastError: this.lastError,
      isOnline
    };
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyStatus(): void {
    const status = this.getStatus();
    this.listeners.forEach((fn) => {
      try {
        fn(status);
      } catch (e) {
        console.warn('Sync status listener error:', e);
      }
    });
  }

  /**
   * Enqueue a mutation for immediate local persistence and reliable background sync
   */
  public enqueue(
    type: QueuedOperationType,
    entityId: string,
    payload: any,
    uid: string = this.currentUid || ''
  ): QueuedChange {
    const now = Date.now();
    const change: QueuedChange = {
      id: `chg_${now}_${Math.random().toString(36).slice(2, 7)}`,
      uid,
      type,
      entityId,
      payload,
      timestamp: now,
      isoTimestamp: new Date(now).toISOString(),
      retryCount: 0
    };

    if (uid) {
      const queue = this.getQueue(uid);
      // For certain single-value mutations (e.g. UPDATE_PROFILE), keep latest to avoid queue bloat
      if (type === 'UPDATE_PROFILE') {
        const filtered = queue.filter((q) => q.type !== 'UPDATE_PROFILE');
        this.saveQueue(uid, [...filtered, change]);
      } else {
        this.saveQueue(uid, [...queue, change]);
      }
    }

    this.notifyStatus();

    // Trigger sync if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => this.triggerSync(), 50);
    }

    return change;
  }

  /**
   * Record a tombstone so an older sync doesn't resurrect deleted records
   */
  public recordTombstone(entity: string, id: string, uid: string = this.currentUid || ''): void {
    if (!uid) return;
    try {
      const key = this.getTombstonesKey(uid, entity);
      const raw = localStorage.getItem(key);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      map[id] = Date.now();
      localStorage.setItem(key, JSON.stringify(map));
    } catch {}
  }

  public isDeletedTombstone(entity: string, id: string, itemTimestamp?: number, uid: string = this.currentUid || ''): boolean {
    if (!uid) return false;
    try {
      const key = this.getTombstonesKey(uid, entity);
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const map: Record<string, number> = JSON.parse(raw);
      const deletedAt = map[id];
      if (!deletedAt) return false;
      if (!itemTimestamp) return true;
      return deletedAt >= itemTimestamp;
    } catch {
      return false;
    }
  }

  /**
   * Main sync processing loop: FIFO execution with conflict resolution
   */
  public async triggerSync(): Promise<{ success: boolean; syncedCount: number }> {
    if (this.isSyncing) return { success: false, syncedCount: 0 };
    if (!this.currentUid) return { success: false, syncedCount: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notifyStatus();
      return { success: false, syncedCount: 0 };
    }

    const uid = this.currentUid;
    const queue = this.getQueue(uid);
    if (queue.length === 0) {
      this.lastError = null;
      this.notifyStatus();
      return { success: true, syncedCount: 0 };
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notifyStatus();

    let syncedCount = 0;
    const remainingQueue: QueuedChange[] = [];

    for (const change of queue) {
      try {
        await this.processChange(uid, change);
        syncedCount++;
      } catch (err: any) {
        console.warn(`Sync failed for change ${change.id} (${change.type}):`, err);
        change.retryCount = (change.retryCount || 0) + 1;
        change.lastError = err?.message || 'Netzwerkfehler';
        this.lastError = change.lastError || 'Synchronisation fehlgeschlagen';
        remainingQueue.push(change);
      }
    }

    this.saveQueue(uid, remainingQueue);
    this.isSyncing = false;
    this.lastSyncTimestamp = Date.now();
    this.notifyStatus();

    return {
      success: remainingQueue.length === 0,
      syncedCount
    };
  }

  /**
   * Process a single queued change according to conflict rules
   */
  private async processChange(uid: string, change: QueuedChange): Promise<void> {
    switch (change.type) {
      case 'UPDATE_PROFILE': {
        const rawPayload = change.payload;
        const profile: UserProfile = {
          ...(typeof rawPayload === 'object' ? rawPayload : {}),
          id: uid,
          uid: uid
        };
        await saveUserDoc(profile);
        break;
      }

      case 'SAVE_LIST':
      case 'RENAME_LIST': {
        const localList = change.payload as ShoppingList;
        // Check if list exists in Cloud and merge items additively (Rule 6)
        const cloudLists = await fetchUserShoppingLists(uid);
        const existingCloudList = cloudLists.find((l) => l.id === localList.id);

        if (existingCloudList) {
          // LWW for title based on timestamp
          const localTimestamp = change.timestamp || Date.now();
          const cloudTimestamp = existingCloudList.timestamp || 0;
          const finalTitle = localTimestamp >= cloudTimestamp ? localList.title : existingCloudList.title;

          // Merge items additively by item.id
          const itemMap = new Map<string, any>();
          (existingCloudList.items || []).forEach((item) => {
            if (!this.isDeletedTombstone('shopping_items', item.id, item.updatedAt ? new Date(item.updatedAt).getTime() : undefined, uid)) {
              itemMap.set(item.id, item);
            }
          });
          (localList.items || []).forEach((item) => {
            if (!this.isDeletedTombstone('shopping_items', item.id, item.updatedAt ? new Date(item.updatedAt).getTime() : undefined, uid)) {
              // If exists in both, keep the one with newer updatedAt
              if (itemMap.has(item.id)) {
                const cloudItem = itemMap.get(item.id);
                const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
                const localTime = item.updatedAt ? new Date(item.updatedAt).getTime() : localTimestamp;
                itemMap.set(item.id, localTime >= cloudTime ? item : cloudItem);
              } else {
                itemMap.set(item.id, item);
              }
            }
          });

          const mergedList: ShoppingList = {
            ...localList,
            title: finalTitle,
            items: Array.from(itemMap.values()),
            updatedAt: new Date().toISOString(),
            timestamp: Math.max(localTimestamp, cloudTimestamp)
          };
          await saveUserShoppingListDoc(uid, mergedList);
        } else {
          await saveUserShoppingListDoc(uid, localList);
        }
        break;
      }

      case 'DELETE_LIST': {
        const listId = change.entityId;
        this.recordTombstone('shopping_lists', listId, uid);
        await deleteUserShoppingListDoc(uid, listId);
        break;
      }

      case 'ADD_WATER_LOG': {
        // Rule 7: Water entries are individual records merged into waterLogs array
        const { dateKey, entry } = change.payload as { dateKey: string; entry: WaterLogEntry };
        const cloudTracker = await fetchUserDailyTracker(uid, dateKey);

        const existingLogs: WaterLogEntry[] = cloudTracker?.waterLogs || [];
        // Additive merge by entry.id
        const logMap = new Map<string, WaterLogEntry>();
        existingLogs.forEach((l) => logMap.set(l.id, l));
        logMap.set(entry.id, entry);

        const mergedLogs = Array.from(logMap.values());
        // Calculate sum post reset
        const resetAt = cloudTracker?.resetWaterAt || 0;
        const validLogs = mergedLogs.filter((l) => l.timestamp >= resetAt);
        const totalWaterMl = validLogs.reduce((sum, l) => sum + (l.amountMl || 0), 0);

        await saveUserDailyTrackerDoc(uid, dateKey, {
          date: cloudTracker?.date || dateKey.replace('daily_', ''),
          waterMl: totalWaterMl,
          waterLogs: mergedLogs,
          meals: cloudTracker?.meals || []
        });
        break;
      }

      case 'RESET_WATER': {
        const { dateKey, resetTimestamp } = change.payload as { dateKey: string; resetTimestamp: number };
        const cloudTracker = await fetchUserDailyTracker(uid, dateKey);
        await saveUserDailyTrackerDoc(uid, dateKey, {
          date: cloudTracker?.date || dateKey.replace('daily_', ''),
          waterMl: 0,
          waterLogs: cloudTracker?.waterLogs || [],
          meals: cloudTracker?.meals || []
        });
        break;
      }

      case 'SAVE_MEAL_LOG': {
        const { dateKey, meal } = change.payload as { dateKey: string; meal: MealLogItem };
        const cloudTracker = await fetchUserDailyTracker(uid, dateKey);
        const existingMeals = cloudTracker?.meals || [];
        
        // Additive merge by meal.id
        const mealMap = new Map<string, MealLogItem>();
        existingMeals.forEach((m) => {
          if (!this.isDeletedTombstone('meals', m.id, undefined, uid)) {
            mealMap.set(m.id, m);
          }
        });
        mealMap.set(meal.id, meal);

        await saveUserDailyTrackerDoc(uid, dateKey, {
          date: cloudTracker?.date || dateKey.replace('daily_', ''),
          waterMl: cloudTracker?.waterMl ?? 0,
          waterLogs: cloudTracker?.waterLogs,
          meals: Array.from(mealMap.values())
        });
        break;
      }

      case 'REMOVE_MEAL_LOG': {
        const { dateKey, mealId } = change.payload as { dateKey: string; mealId: string };
        this.recordTombstone('meals', mealId, uid);
        const cloudTracker = await fetchUserDailyTracker(uid, dateKey);
        if (cloudTracker) {
          const updatedMeals = (cloudTracker.meals || []).filter((m) => m.id !== mealId);
          await saveUserDailyTrackerDoc(uid, dateKey, {
            date: cloudTracker.date,
            waterMl: cloudTracker.waterMl,
            waterLogs: cloudTracker.waterLogs,
            meals: updatedMeals
          });
        }
        break;
      }

      case 'ADD_SCAN': {
        const scanItem = change.payload as ScanHistoryItem;
        // Rule 8: Deduplicate and save
        await saveUserScanHistoryDoc(uid, scanItem);
        break;
      }

      case 'CLEAR_SCANS': {
        const { existingItems, clearedAt } = change.payload as { existingItems: ScanHistoryItem[]; clearedAt: number };
        this.recordTombstone('scan_history_all', 'cleared', uid);
        await clearAllUserScanHistoryDocs(uid, existingItems);
        break;
      }

      case 'TOGGLE_FAVORITE': {
        const { productId, action } = change.payload as { productId: string; action: 'add' | 'remove' };
        if (action === 'add') {
          await addUserFavoriteDoc(uid, productId);
        } else {
          await removeUserFavoriteDoc(uid, productId);
        }
        break;
      }

      case 'SAVE_CUSTOM_FOOD': {
        const food = change.payload as CustomFoodItem;
        await saveUserCustomFoodDoc(uid, food);
        break;
      }

      case 'DELETE_CUSTOM_FOOD': {
        const foodId = change.entityId;
        this.recordTombstone('custom_foods', foodId, uid);
        await deleteUserCustomFoodDoc(uid, foodId);
        break;
      }

      case 'SUBMIT_REPORT': {
        const report = change.payload as AppReportItem;
        await saveAppReportToFirestore(report);
        break;
      }

      default:
        console.warn('Unknown queued operation:', change.type);
    }
  }
}

export const syncEngine = new GoodiesSyncEngine();
