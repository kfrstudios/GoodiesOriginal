import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  Product, 
  UserProfile, 
  AppView, 
  AdminTab, 
  ScanHistoryItem, 
  ShoppingList, 
  ShoppingListItem,
  MealLogItem,
  MealType,
  UnknownBarcodeReport,
  CustomFoodItem,
  AppAuthState,
  AppFeature,
  FeatureLimitKey,
  PaywallContext,
  SubscriptionTier,
  AppTheme,
  AppReportItem
} from '../types';
import { 
  getInitialProducts, 
  getProducts,
  createProduct,
  updateProduct as updateProductInService,
  archiveProduct,
  upsertProduct,
  saveProducts, 
  getUnknownBarcodes, 
  fetchUnknownBarcodesFromFirestore,
  reportUnknownBarcode,
  resolveUnknownBarcodeInFirestore,
  deleteUnknownBarcodeFromFirestore
} from '../services/productService';
import { 
  auth, 
  logoutUser, 
  deleteCurrentAccount, 
  loadOrCreateUserDoc, 
  getUserProfileByUid,
  saveUserDoc, 
  getLocalUserSubcollection, 
  saveLocalUserSubcollection,
  migrateAndSyncAllUserSubcollections,
  saveUserScanHistoryDoc,
  deleteUserScanHistoryDoc,
  clearAllUserScanHistoryDocs,
  saveUserShoppingListDoc,
  deleteUserShoppingListDoc,
  addUserFavoriteDoc,
  removeUserFavoriteDoc,
  saveUserCustomFoodDoc,
  deleteUserCustomFoodDoc,
  saveUserDailyTrackerDoc,
  getTodayTrackerKey,
  sortScanHistoryNewestFirst,
  saveAppReportToFirestore,
  fetchAppReportsFromFirestore,
  updateAppReportStatusInFirestore,
  deleteAppReportFromFirestore,
  fetchUserWeeklyTrackers
} from '../services/firebase';
import {
  checkHasFeature,
  checkFeatureLimit,
  canPerformDailyScan,
  canCreateShoppingList,
  getTodayCalendarDate,
  FREE_LIMITS
} from '../services/entitlements';
import { syncEngine } from '../services/syncEngine';
import { getCurrentWeekDays, subscribeToDayChange } from '../utils/dateUtils';
import { WaterLogEntry, DailyTrackerDoc, SyncStatusInfo } from '../types';
import { ProPaywallModal } from '../components/ProPaywallModal';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { CheckoutModal } from '../components/CheckoutModal';
import { ProductComparisonModal } from '../components/ProductComparisonModal';
import { onAuthStateChanged } from 'firebase/auth';

interface AppContextType {
  // Navigation
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  openProductDetail: (product: Product) => void;

  // Product Comparison Modal
  isComparisonOpen: boolean;
  comparisonProductA: Product | null;
  comparisonProductB: Product | null;
  openComparison: (productA: Product, productB?: Product | null) => void;
  closeComparison: () => void;

  // Products Catalog
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;

  // Authentication & Session
  appAuthState: AppAuthState;
  setAppAuthState: (state: AppAuthState) => void;
  authErrorMessage: string | null;
  setAuthErrorMessage: (msg: string | null) => void;
  user: UserProfile;
  isAdmin: boolean;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUserProfileFromDb: () => Promise<void>;
  handleAuthSuccess: (authUser: any, isNewUser?: boolean) => Promise<void>;
  completeOnboarding: (onboardingData: any) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  isAuthLoading: boolean;

  // Entitlements & Subscription
  effectiveTier: SubscriptionTier;
  hasFeature: (feature: AppFeature) => boolean;
  getFeatureLimit: (limitKey: FeatureLimitKey) => number;
  adminSimulationTier: SubscriptionTier | null;
  setAdminSimulationTier: (tier: SubscriptionTier | null) => void;
  canPerformScan: () => { allowed: boolean; remaining: number; limit: number };
  consumeScan: () => boolean;

  // Paywall, Abo & Checkout Modals
  openPaywall: (context?: PaywallContext) => void;
  closePaywall: () => void;
  isPaywallOpen: boolean;
  paywallContext: PaywallContext;
  openAboModal: () => void;
  closeAboModal: () => void;
  isAboModalOpen: boolean;
  isCheckoutOpen: boolean;
  checkoutBillingCycle: 'monthly' | 'annual';
  openCheckout: (options?: { plan?: 'monthly' | 'annual'; context?: PaywallContext }) => void;
  closeCheckout: () => void;

  // Scan History
  scanHistory: ScanHistoryItem[];
  addToScanHistory: (product: Product, goodiesMatch?: number, sessionId?: string) => void;
  clearScanHistory: () => void;

  // Favorites
  favorites: string[]; // product IDs
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;

  // Shopping Lists & Personal Custom Foods
  shoppingLists: ShoppingList[];
  createShoppingList: (title: string) => void;
  addShoppingItem: (
    listId: string, 
    name: string, 
    amount?: string, 
    productId?: string, 
    calories?: number, 
    isCustom?: boolean, 
    notes?: string
  ) => void;
  updateShoppingItem: (listId: string, itemId: string, updates: Partial<ShoppingListItem>) => void;
  toggleShoppingItem: (listId: string, itemId: string) => void;
  removeShoppingItem: (listId: string, itemId: string) => void;
  deleteShoppingList: (listId: string) => void;
  updateShoppingListTitle: (listId: string, newTitle: string) => void;
  customFoods: CustomFoodItem[];
  addCustomFood: (item: Omit<CustomFoodItem, 'id' | 'createdAt'>) => CustomFoodItem;
  deleteCustomFood: (id: string) => void;

  // Tracker / "Dein Tag"
  todayMeals: MealLogItem[];
  logMeal: (product: Product, portionGrams: number, mealType: MealType) => void;
  logCustomMeal: (params: {
    name: string;
    portionGrams?: number;
    amountLabel?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    mealType: MealType;
  }) => void;
  removeMealLog: (id: string) => void;
  waterIntakeMl: number;
  addWater: (ml: number) => void;
  resetWater: () => void;
  isWaterCelebrationActive: boolean;

  // Admin Hub
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  unknownBarcodes: UnknownBarcodeReport[];
  refreshUnknownBarcodes: () => Promise<void>;
  submitUnknownBarcode: (barcode: string, notes?: string) => void;
  resolveUnknownBarcode: (id: string) => void;
  deleteUnknownBarcode: (id: string) => void;

  // User Reports (Product Analysis & App Bugs)
  reports: AppReportItem[];
  addReport: (data: {
    type: 'product' | 'bug';
    reason: string;
    details?: string;
    productId?: string;
    productName?: string;
    productBrand?: string;
    productBarcode?: string;
  }) => Promise<void>;
  updateReportStatus: (reportId: string, status: 'pending' | 'in_review' | 'resolved' | 'open') => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  refreshReports: () => Promise<void>;

  // Feedback toast
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Theme
  theme: AppTheme;
  isDarkMode: boolean;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;

  // Offline Sync & Status
  syncStatus: SyncStatusInfo;
  triggerManualSync: () => Promise<void>;

  // Weekly Tracker Docs
  weeklyTrackers: Record<string, DailyTrackerDoc>;
  refreshWeeklyTrackers: () => Promise<void>;
}

const defaultAnonymousUser: UserProfile = {
  id: '',
  uid: '',
  name: 'Gast',
  email: '',
  diet: 'Allesesser',
  allergies: [],
  excludedIngredients: ['Palmöl'],
  priorities: ['Weniger Zucker', 'Mehr Eiweiß'],
  isPro: false,
  subscriptionTier: 'FREE',
  onboardingCompleted: false,
  dailyGoals: {
    calories: 2150,
    protein: 110,
    carbs: 230,
    fat: 65,
    water: 2500,
    maxSugar: 35,
    maxSalt: 5,
  },
};

const getInitialGuestUser = (): UserProfile => {
  const today = getTodayCalendarDate();
  let guestScanCount = 0;
  try {
    const raw = localStorage.getItem('goodies_guest_scans');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.date === today && typeof parsed.count === 'number') {
        guestScanCount = parsed.count;
      }
    }
  } catch {}
  return {
    ...defaultAnonymousUser,
    dailyScanCount: guestScanCount,
    dailyScanDate: today,
    lastScanTimestamp: Date.now()
  };
};

const defaultInitialShoppingLists: ShoppingList[] = [
  {
    id: 'list_1',
    title: 'Wocheneinkauf Bio-Markt',
    createdAt: 'Heute',
    items: [
      { id: 'item_1', name: 'Haferdrink Ohne Zucker', amount: '2x', checked: true, productId: 'prod_1' },
      { id: 'item_2', name: 'Total Griechischer Joghurt 0%', amount: '1x', checked: false, productId: 'prod_2' },
      { id: 'item_3', name: 'Bio Linsenwaffeln', amount: '2x', checked: false, productId: 'prod_5' },
      { id: 'item_4', name: 'Frische Bio-Bananen', amount: '1 Bund', checked: false },
    ]
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Theme state: 'light' | 'dark' | 'system'
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('goodies_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch (e) {}
    return 'light';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const isDarkMode = theme === 'dark' || (theme === 'system' && systemPrefersDark);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDarkMode ? '#101216' : '#10B981');
    }
  }, [isDarkMode]);

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('goodies_theme', newTheme);
    } catch (e) {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: AppTheme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('goodies_theme', next);
      } catch (e) {}
      return next;
    });
  }, []);

  // Navigation
  const [activeView, setActiveViewState] = useState<AppView>('home');
  const setActiveView = useCallback((view: AppView) => {
    setActiveViewState(view);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // App Lifecycle / Auth State
  const [appAuthState, setAppAuthState] = useState<AppAuthState>('INITIALIZING');
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  // Active User Profile
  const [user, setUser] = useState<UserProfile>(getInitialGuestUser);

  // Entitlements: admin preview simulation (does not permanently affect real user profile)
  const [adminSimulationTier, setAdminSimulationTier] = useState<SubscriptionTier | null>(null);

  // Products (global catalog)
  const [products, setProducts] = useState<Product[]>(() => getInitialProducts());

  // Load fresh products from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    getProducts().then(fresh => {
      if (isMounted && fresh && fresh.length > 0) {
        setProducts(fresh);
      }
    }).catch(err => {
      console.warn('Initial products load notice:', err);
    });
    return () => { isMounted = false; };
  }, []);

  // User-isolated state
  const [favorites, setFavorites] = useState<string[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [customFoods, setCustomFoods] = useState<CustomFoodItem[]>([]);
  const [todayMeals, setTodayMeals] = useState<MealLogItem[]>([]);
  const [waterIntakeMl, setWaterIntakeMl] = useState<number>(0);
  const [isWaterCelebrationActive, setIsWaterCelebrationActive] = useState<boolean>(false);

  // Admin Hub state
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [unknownBarcodes, setUnknownBarcodes] = useState<UnknownBarcodeReport[]>(() => getUnknownBarcodes());

  // User Reports (Product Analysis & Bug Reports)
  const [reports, setReports] = useState<AppReportItem[]>(() => {
    try {
      const saved = localStorage.getItem('goodies_app_reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load unknown barcodes & reports from Firestore on startup
  useEffect(() => {
    fetchUnknownBarcodesFromFirestore().then((list) => {
      if (list && list.length >= 0) {
        setUnknownBarcodes(list);
      }
    }).catch(err => {
      console.warn('Initial unknown barcodes fetch notice:', err);
    });

    fetchAppReportsFromFirestore().then((list) => {
      if (list && list.length >= 0) {
        setReports(list);
        try {
          localStorage.setItem('goodies_app_reports', JSON.stringify(list));
        } catch {}
      }
    }).catch(err => {
      console.warn('Initial reports fetch notice:', err);
    });
  }, []);

  // Offline Sync State & Weekly Trackers
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(() => syncEngine.getStatus());
  const [weeklyTrackers, setWeeklyTrackers] = useState<Record<string, DailyTrackerDoc>>({});

  useEffect(() => {
    const unsubSync = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });

    const unsubDay = subscribeToDayChange(() => {
      // Midnight rollover: trigger tracker refresh
      if (user.uid) {
        refreshWeeklyTrackers(user.uid);
      }
    });

    return () => {
      unsubSync();
      unsubDay();
    };
  }, [user.uid]);

  const triggerManualSync = useCallback(async () => {
    await syncEngine.triggerSync();
  }, []);

  const refreshWeeklyTrackers = useCallback(async (targetUid: string = user.uid) => {
    if (!targetUid) return;
    try {
      const days = getCurrentWeekDays();
      const keys = days.map((d) => d.dayKey);
      const docs = await fetchUserWeeklyTrackers(targetUid, keys);
      setWeeklyTrackers(docs);
    } catch (err) {
      console.warn('Notice refreshing weekly trackers:', err);
    }
  }, [user.uid]);

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Paywall & Subscription Modals
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallContext, setPaywallContext] = useState<PaywallContext>('general');
  const [isAboModalOpen, setIsAboModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutBillingCycle, setCheckoutBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // Product Comparison Modal state
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonProductA, setComparisonProductA] = useState<Product | null>(null);
  const [comparisonProductB, setComparisonProductB] = useState<Product | null>(null);

  const openComparison = useCallback((prodA: Product, prodB?: Product | null) => {
    setComparisonProductA(prodA);
    setComparisonProductB(prodB || null);
    setIsComparisonOpen(true);
  }, []);

  const closeComparison = useCallback(() => {
    setIsComparisonOpen(false);
  }, []);

  const openPaywall = useCallback((ctx?: PaywallContext) => {
    setPaywallContext(ctx || 'general');
    setIsPaywallOpen(true);
  }, []);

  const closePaywall = useCallback(() => {
    setIsPaywallOpen(false);
  }, []);

  const openAboModal = useCallback(() => {
    setIsAboModalOpen(true);
  }, []);

  const closeAboModal = useCallback(() => {
    setIsAboModalOpen(false);
  }, []);

  const openCheckout = useCallback((options?: { plan?: 'monthly' | 'annual'; context?: PaywallContext }) => {
    if (options?.plan) {
      setCheckoutBillingCycle(options.plan);
    }
    if (options?.context) {
      setPaywallContext(options.context);
    }
    setIsPaywallOpen(false);
    setIsAboModalOpen(false);
    setIsCheckoutOpen(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setIsCheckoutOpen(false);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  }, []);

  /**
   * Load isolated user data for a specific user ID with strict insert-if-missing Cloud sync
   */
  const loadUserDataForUid = useCallback((uid: string) => {
    // 0. Connect SyncEngine to active user
    syncEngine.setUid(uid);

    // 1. Immediate local cache hydration for zero-latency UI rendering
    const userFavs = getLocalUserSubcollection<string[]>(uid, 'favorites', []);
    const userHistory = getLocalUserSubcollection<ScanHistoryItem[]>(uid, 'scanHistory', []);
    const userLists = getLocalUserSubcollection<ShoppingList[]>(uid, 'lists', []);
    const userMeals = getLocalUserSubcollection<MealLogItem[]>(uid, 'todayMeals', []);
    const userWater = getLocalUserSubcollection<number>(uid, 'waterIntakeMl', 0);
    const userCustomFoods = getLocalUserSubcollection<CustomFoodItem[]>(uid, 'customFoods', []);

    setFavorites(userFavs);
    setScanHistory(sortScanHistoryNewestFirst(userHistory));
    setShoppingLists(userLists);
    setTodayMeals(userMeals);
    setWaterIntakeMl(userWater);
    setCustomFoods(userCustomFoods);

    // Hydrate weekly trackers
    refreshWeeklyTrackers(uid);

    // 2. Asynchronous strict "insert-if-missing" sync with named Firestore DB
    migrateAndSyncAllUserSubcollections(uid, defaultInitialShoppingLists)
      .then((synced) => {
        setFavorites(synced.favorites);
        setScanHistory(sortScanHistoryNewestFirst(synced.scanHistory));
        setShoppingLists(synced.shoppingLists);
        setTodayMeals(synced.todayMeals);
        setWaterIntakeMl(synced.waterIntakeMl);
        setCustomFoods(synced.customFoods);
      })
      .catch((err) => {
        console.warn('Notice during Cloud subcollection sync:', err);
      });
  }, [refreshWeeklyTrackers]);

  /**
   * Clear all active in-memory user data (called on logout/account switch)
   */
  const clearActiveUserData = useCallback(() => {
    syncEngine.setUid(null);
    setUser(defaultAnonymousUser);
    setFavorites([]);
    setScanHistory([]);
    setShoppingLists([]);
    setCustomFoods([]);
    setTodayMeals([]);
    setWaterIntakeMl(0);
    setWeeklyTrackers({});
    setSelectedProduct(null);
    setAdminSimulationTier(null);
  }, []);

  /**
   * Handle user authenticated (from email, Google, Apple or test user)
   */
  const handleAuthSuccess = useCallback(async (authUser: any, isNewUser = false) => {
    setAppAuthState('AUTH_LOADING');
    setAuthErrorMessage(null);
    try {
      // Pass explicit registration flag: only genuine new registrations are allowed to initialize a document
      const userProfile = await loadOrCreateUserDoc(authUser, { isExplicitNewRegistration: isNewUser });
      setUser(userProfile);

      // If this is a newly registered user, guarantee clean 0 state across all dynamic counters
      if (isNewUser) {
        saveLocalUserSubcollection(userProfile.uid, 'waterIntakeMl', 0);
        saveLocalUserSubcollection(userProfile.uid, 'favorites', []);
        saveLocalUserSubcollection(userProfile.uid, 'scanHistory', []);
        saveLocalUserSubcollection(userProfile.uid, 'todayMeals', []);
        saveLocalUserSubcollection(userProfile.uid, 'customFoods', []);
        saveLocalUserSubcollection(userProfile.uid, 'lists', defaultInitialShoppingLists);
        
        setWaterIntakeMl(0);
        setFavorites([]);
        setScanHistory([]);
        setTodayMeals([]);
        setCustomFoods([]);
        setShoppingLists(defaultInitialShoppingLists);
      } else {
        loadUserDataForUid(userProfile.uid);
      }

      try {
        localStorage.setItem('goodies_active_session_uid', userProfile.uid);
      } catch {
        // ignore
      }

      if (isNewUser || !userProfile.onboardingCompleted) {
        setAppAuthState('ONBOARDING');
      } else {
        setAppAuthState('APP');
        setActiveView('home');
      }
    } catch (err: any) {
      console.warn('Notice during auth success handler:', err);
      setAuthErrorMessage(err?.message || 'Benutzerprofil konnte nicht geladen werden.');
      setAppAuthState('ERROR');
    }
  }, [loadUserDataForUid]);

  /**
   * Complete onboarding step
   */
  const completeOnboarding = useCallback(async (onboardingData: any) => {
    if (!user.uid) return;
    setAppAuthState('AUTH_LOADING');

    const updatedProfile: UserProfile = {
      ...user,
      diet: onboardingData.diet || user.diet,
      priorities: onboardingData.priorities || user.priorities,
      excludedIngredients: onboardingData.excludedIngredients || user.excludedIngredients,
      allergies: onboardingData.allergies || user.allergies,
      gender: onboardingData.gender,
      age: onboardingData.age,
      heightCm: onboardingData.heightCm,
      weightKg: onboardingData.weightKg,
      activityLevel: onboardingData.activityLevel,
      healthGoal: onboardingData.healthGoal,
      dailyGoals: onboardingData.calculatedGoals || user.dailyGoals,
      onboardingCompleted: true
    };

    setUser(updatedProfile);
    await saveUserDoc(updatedProfile);

    showToast('Willkommen bei Goodies! Dein Profil wurde eingerichtet.');
    setAppAuthState('APP');
    setActiveView('home');
  }, [user, showToast]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Firebase logout notice:', err);
    }
    try {
      localStorage.removeItem('goodies_active_session_uid');
    } catch {
      // ignore
    }
    clearActiveUserData();
    setAppAuthState('LOGIN');
    showToast('Erfolgreich abgemeldet');
  }, [clearActiveUserData, showToast]);

  /**
   * Delete user account
   */
  const deleteAccount = useCallback(async () => {
    const uid = user.uid;
    try {
      await deleteCurrentAccount();
    } catch (err) {
      console.warn('Firebase account deletion notice:', err);
    }
    if (uid) {
      // Clear localStorage partition for this user
      localStorage.removeItem(`goodies_user_doc_${uid}`);
      localStorage.removeItem(`goodies_user_${uid}_favorites`);
      localStorage.removeItem(`goodies_user_${uid}_scanHistory`);
      localStorage.removeItem(`goodies_user_${uid}_lists`);
      localStorage.removeItem(`goodies_user_${uid}_todayMeals`);
      localStorage.removeItem(`goodies_user_${uid}_waterIntakeMl`);
      localStorage.removeItem('goodies_active_session_uid');
    }
    clearActiveUserData();
    setAppAuthState('LOGIN');
    showToast('Konto und private Daten wurden gelöscht');
  }, [user.uid, clearActiveUserData, showToast]);

  /**
   * Main Firebase onAuthStateChanged listener for session persistence
   */
  useEffect(() => {
    setAppAuthState('INITIALIZING');
    
    // Check if offline dev session was previously saved
    let unsub = () => {};
    try {
      unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            // For session restoration, isExplicitNewRegistration is strictly false
            const userDoc = await loadOrCreateUserDoc(fbUser, { isExplicitNewRegistration: false });
            setUser(userDoc);
            loadUserDataForUid(userDoc.uid);
            try {
              localStorage.setItem('goodies_active_session_uid', userDoc.uid);
            } catch {
              // ignore
            }

            if (!userDoc.onboardingCompleted) {
              setAppAuthState('ONBOARDING');
            } else {
              setAppAuthState('APP');
            }
          } catch (err: any) {
            console.warn('Notice restoring user session:', err);
            setAuthErrorMessage(err?.message || 'Bestehende Sitzung konnte nicht verifiziert werden.');
            setAppAuthState('ERROR');
          }
        } else {
          clearActiveUserData();
          setAppAuthState('LOGIN');
        }
      });
    } catch (e) {
      console.warn('onAuthStateChanged initialization notice:', e);
      setAppAuthState('LOGIN');
    }

    return () => {
      unsub();
    };
  }, [clearActiveUserData, loadUserDataForUid]);

  /**
   * Sync isolated collections whenever they change
   */
  useEffect(() => {
    if (!user.uid || appAuthState !== 'APP') return;
    saveLocalUserSubcollection(user.uid, 'favorites', favorites);
  }, [favorites, user.uid, appAuthState]);

  useEffect(() => {
    if (!user.uid || appAuthState !== 'APP') return;
    saveLocalUserSubcollection(user.uid, 'scanHistory', scanHistory);
  }, [scanHistory, user.uid, appAuthState]);

  useEffect(() => {
    if (!user.uid || appAuthState !== 'APP') return;
    saveLocalUserSubcollection(user.uid, 'lists', shoppingLists);
  }, [shoppingLists, user.uid, appAuthState]);

  useEffect(() => {
    if (!user.uid || appAuthState !== 'APP') return;
    saveLocalUserSubcollection(user.uid, 'todayMeals', todayMeals);
  }, [todayMeals, user.uid, appAuthState]);

  useEffect(() => {
    if (!user.uid || appAuthState !== 'APP') return;
    saveLocalUserSubcollection(user.uid, 'waterIntakeMl', waterIntakeMl);
  }, [waterIntakeMl, user.uid, appAuthState]);

  useEffect(() => {
    if (!user.uid || appAuthState !== 'APP') return;
    saveLocalUserSubcollection(user.uid, 'customFoods', customFoods);
  }, [customFoods, user.uid, appAuthState]);

  // Effective tier factoring in admin preview simulation
  const effectiveTier: SubscriptionTier = adminSimulationTier !== null 
    ? adminSimulationTier 
    : (user.subscriptionTier || (user.isPro ? 'PRO' : 'FREE'));

  // True Role-Based Access Control: Admins have role === 'ADMIN' or designated bootstrap emails
  const isAdmin = Boolean(
    user.role === 'ADMIN' || 
    user.email === 'kiwie6868@gmail.com' || 
    user.email === 'admin@goodies.app'
  );

  // Security: Auto-redirect non-admin users if activeView is admin
  useEffect(() => {
    if (activeView === 'admin' && !isAdmin && appAuthState === 'APP') {
      setActiveView('home');
      showToast('Zugriff verweigert: Nur für freigegebene Administratoren');
    }
  }, [activeView, isAdmin, appAuthState, showToast]);

  // Reset daily scan counter when calendar day changes
  useEffect(() => {
    const today = getTodayCalendarDate();
    // Only reset if user.dailyScanDate exists and is from an earlier day
    if (user.dailyScanDate && user.dailyScanDate !== today) {
      const updated: UserProfile = {
        ...user,
        dailyScanDate: today,
        dailyScanCount: 0
      };
      setUser(updated);
      if (user.uid) {
        saveUserDoc(updated).catch(() => {});
      } else {
        try {
          localStorage.setItem('goodies_guest_scans', JSON.stringify({ date: today, count: 0 }));
        } catch {}
      }
    }
  }, [user.uid, user.dailyScanDate, appAuthState]);

  /**
   * Central Entitlement Check: hasFeature(feature)
   */
  const hasFeature = useCallback((feature: AppFeature): boolean => {
    return checkHasFeature(feature, effectiveTier);
  }, [effectiveTier]);

  /**
   * Numeric limit check for given resource
   */
  const getFeatureLimit = useCallback((limitKey: FeatureLimitKey): number => {
    return checkFeatureLimit(limitKey, effectiveTier);
  }, [effectiveTier]);

  /**
   * Check if user can perform a scan today
   */
  const canPerformScan = useCallback(() => {
    const today = getTodayCalendarDate();
    const currentCount = (user.dailyScanDate === today && typeof user.dailyScanCount === 'number')
      ? user.dailyScanCount
      : 0;
    return canPerformDailyScan(currentCount, effectiveTier);
  }, [user.dailyScanCount, user.dailyScanDate, effectiveTier]);

  /**
   * Consume 1 scan from today's allowance.
   * Returns true if allowed, or false and opens paywall if blocked.
   */
  const consumeScan = useCallback((): boolean => {
    const today = getTodayCalendarDate();
    const currentCount = (user.dailyScanDate === today && typeof user.dailyScanCount === 'number')
      ? user.dailyScanCount
      : 0;

    const scanStatus = canPerformDailyScan(currentCount, effectiveTier);
    if (!scanStatus.allowed) {
      openPaywall('scans');
      return false;
    }
    const nextCount = currentCount + 1;
    const updated: UserProfile = {
      ...user,
      dailyScanCount: nextCount,
      dailyScanDate: today,
      lastScanTimestamp: Date.now()
    };
    setUser(updated);
    if (user.uid) {
      saveUserDoc(updated).catch(err => {
        console.warn('Notice saving user scan count:', err);
      });
    } else {
      try {
        localStorage.setItem('goodies_guest_scans', JSON.stringify({ date: today, count: nextCount }));
      } catch {}
    }
    return true;
  }, [user, effectiveTier, openPaywall]);

  /**
   * Update user profile & sync
   * CRITICAL SECURITY DIRECTIVE:
   * Client-side profile updates must NEVER alter subscriptionTier or isPro!
   * Subscription status is strictly authoritative from the database / server-side billing.
   */
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    const sanitizedUpdates = { ...updates };
    delete sanitizedUpdates.subscriptionTier;
    delete sanitizedUpdates.isPro;

    const updated = { ...user, ...sanitizedUpdates };
    setUser(updated);
    if (user.uid) {
      syncEngine.enqueue('UPDATE_PROFILE', user.uid, sanitizedUpdates, user.uid);
      saveUserDoc(updated).catch(err => {
        console.warn('Notice saving user doc directly:', err);
      });
    }
    showToast('Profil aktualisiert');
  };

  /**
   * Synchronize current user profile from database (e.g. after administrative changes or webhook)
   */
  const refreshUserProfileFromDb = useCallback(async () => {
    if (!user || !user.uid) return;
    try {
      const refreshed = await getUserProfileByUid(user.uid);
      if (refreshed) {
        setUser(refreshed);
      }
    } catch (err) {
      console.warn('Refresh user profile notice:', err);
    }
  }, [user]);

  // Products manipulation
  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setActiveView('product-detail');
    addToScanHistory(product);
  };

  const addProduct = async (newProdData: Omit<Product, 'id'>) => {
    const tempId = `prod_${Date.now()}`;
    const optimisticProd: Product = {
      ...newProdData,
      id: tempId,
      verified: true,
      createdAt: new Date().toISOString()
    };
    setProducts(prev => [optimisticProd, ...prev]);
    showToast(`Produkt „${optimisticProd.name}“ hinzugefügt`);

    try {
      const persisted = await createProduct(newProdData);
      setProducts(prev => prev.map(p => p.id === tempId ? persisted : p));
    } catch (err) {
      console.warn('Could not persist product to Firestore:', err);
    }
  };

  const updateProduct = async (updatedProd: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProd.id ? updatedProd : p));
    if (selectedProduct?.id === updatedProd.id) {
      setSelectedProduct(updatedProd);
    }
    showToast(`Produkt „${updatedProd.name}“ aktualisiert`);

    try {
      await updateProductInService(updatedProd.id, updatedProd);
    } catch (err) {
      console.warn('Could not update product in Firestore:', err);
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast('Produkt entfernt');

    try {
      await archiveProduct(id);
    } catch (err) {
      console.warn('Could not archive product in Firestore:', err);
    }
  };

  // Scan History
  const addToScanHistory = (product: Product, goodiesMatch?: number, sessionId?: string) => {
    setProducts(prev => {
      const exists = prev.some(p => p.id === product.id || p.barcode === product.barcode);
      if (!exists) {
        const updated = [product, ...prev];
        saveProducts(updated);
        // Persist to Firestore in background
        upsertProduct(product).catch(() => {});
        return updated;
      }
      return prev;
    });

    const isAlreadyInHistory = scanHistory.some(
      item => item.productId === product.id || item.barcode === product.barcode
    );

    // If FREE user reaches limit of 20 items and this is a new product:
    if (effectiveTier === 'FREE' && scanHistory.length >= FREE_LIMITS.historyItems && !isAlreadyInHistory) {
      showToast('Dein kostenloser Verlauf ist voll (20 Produkte). Mit PRO unbegrenzt behalten.');
      openPaywall('history');
      return;
    }

    const now = Date.now();
    const newItem: ScanHistoryItem = {
      id: `hist_${now}`,
      productId: product.id,
      barcode: product.barcode,
      productName: product.name,
      brand: product.brand,
      goodiesScore: product.goodiesScore,
      goodiesMatch,
      sessionId,
      nutriScore: product.nutriScore,
      scannedAt: 'Gerade eben',
      timestamp: now,
      createdAt: new Date(now).toISOString()
    };

    if (user.uid) {
      syncEngine.enqueue('ADD_SCAN', newItem.id, newItem, user.uid);
      saveUserScanHistoryDoc(user.uid, newItem).catch(() => {});
    }

    setScanHistory(prev => {
      const filtered = prev.filter(item => item.productId !== product.id && item.barcode !== product.barcode);
      const maxCount = effectiveTier === 'PRO' ? 500 : FREE_LIMITS.historyItems;
      return [newItem, ...filtered].slice(0, maxCount);
    });
  };

  const clearScanHistory = () => {
    if (user.uid) {
      syncEngine.enqueue('CLEAR_SCANS', 'all', { existingCount: scanHistory.length, clearedAt: Date.now() }, user.uid);
      clearAllUserScanHistoryDocs(user.uid, scanHistory).catch(() => {});
      saveLocalUserSubcollection(user.uid, 'scanHistory', []);
    }
    setScanHistory([]);
    showToast('Verlauf geleert');
  };

  // Favorites
  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      if (prev.includes(productId)) {
        if (user.uid) {
          syncEngine.enqueue('TOGGLE_FAVORITE', productId, { productId, action: 'remove' }, user.uid);
          removeUserFavoriteDoc(user.uid, productId).catch(() => {});
        }
        showToast('Aus Favoriten entfernt');
        return prev.filter(id => id !== productId);
      } else {
        if (user.uid) {
          syncEngine.enqueue('TOGGLE_FAVORITE', productId, { productId, action: 'add' }, user.uid);
          addUserFavoriteDoc(user.uid, productId).catch(() => {});
        }
        showToast('Zu Favoriten hinzugefügt');
        return [...prev, productId];
      }
    });
  };

  const isFavorite = (productId: string) => favorites.includes(productId);

  // Shopping Lists
  const createShoppingList = (title: string) => {
    const listLimitStatus = canCreateShoppingList(shoppingLists.length, effectiveTier);
    if (!listLimitStatus.allowed) {
      openPaywall('lists');
      showToast('Im Free-Plan ist 1 Einkaufsliste enthalten.');
      return;
    }

    const newList: ShoppingList = {
      id: `list_${Date.now()}`,
      title,
      items: [],
      createdAt: 'Gerade eben'
    };
    if (user.uid) {
      syncEngine.enqueue('SAVE_LIST', newList.id, newList, user.uid);
      saveUserShoppingListDoc(user.uid, newList).catch(() => {});
    }
    setShoppingLists(prev => [newList, ...prev]);
    showToast(`Liste „${title}“ erstellt`);
  };

  const addShoppingItem = (
    listId: string, 
    name: string, 
    amount?: string, 
    productId?: string,
    calories?: number,
    isCustom?: boolean,
    notes?: string
  ) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const newItem: ShoppingListItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      amount: amount?.trim() || '1x',
      checked: false,
      ...(productId ? { productId } : {}),
      ...(calories !== undefined ? { calories } : {}),
      ...(isCustom !== undefined ? { isCustom } : {}),
      ...(notes ? { notes } : {})
    };

    setShoppingLists(prev => {
      const updated = prev.map(list => {
        if (list.id !== listId) return list;
        return { ...list, items: [...list.items, newItem] };
      });
      const targetList = updated.find(l => l.id === listId);
      if (user.uid) {
        saveLocalUserSubcollection(user.uid, 'lists', updated);
        if (targetList) {
          syncEngine.enqueue('SAVE_LIST', listId, targetList, user.uid);
          saveUserShoppingListDoc(user.uid, targetList).catch(err => {
            console.warn('Notice saving Cloud shoppingList doc:', err);
          });
        }
      }
      return updated;
    });
    showToast(`„${trimmedName}“ zur Einkaufsliste hinzugefügt`);
  };

  const updateShoppingItem = (listId: string, itemId: string, updates: Partial<ShoppingListItem>) => {
    setShoppingLists(prev => {
      const updated = prev.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
        };
      });
      const targetList = updated.find(l => l.id === listId);
      if (user.uid) {
        saveLocalUserSubcollection(user.uid, 'lists', updated);
        if (targetList) {
          syncEngine.enqueue('SAVE_LIST', listId, targetList, user.uid);
          saveUserShoppingListDoc(user.uid, targetList).catch(err => {
            console.warn('Notice updating Cloud shoppingList doc:', err);
          });
        }
      }
      return updated;
    });
  };

  const toggleShoppingItem = (listId: string, itemId: string) => {
    setShoppingLists(prev => {
      const updated = prev.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map(item => 
            item.id === itemId ? { ...item, checked: !item.checked } : item
          )
        };
      });
      const targetList = updated.find(l => l.id === listId);
      if (user.uid) {
        saveLocalUserSubcollection(user.uid, 'lists', updated);
        if (targetList) {
          syncEngine.enqueue('SAVE_LIST', listId, targetList, user.uid);
          saveUserShoppingListDoc(user.uid, targetList).catch(err => {
            console.warn('Notice toggling Cloud shoppingList doc:', err);
          });
        }
      }
      return updated;
    });
  };

  const removeShoppingItem = (listId: string, itemId: string) => {
    setShoppingLists(prev => {
      const updated = prev.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.filter(item => item.id !== itemId)
        };
      });
      const targetList = updated.find(l => l.id === listId);
      if (user.uid) {
        saveLocalUserSubcollection(user.uid, 'lists', updated);
        if (targetList) {
          syncEngine.enqueue('SAVE_LIST', listId, targetList, user.uid);
          saveUserShoppingListDoc(user.uid, targetList).catch(err => {
            console.warn('Notice removing Cloud shoppingList doc:', err);
          });
        }
      }
      return updated;
    });
  };

  const deleteShoppingList = (listId: string) => {
    if (user.uid) {
      syncEngine.enqueue('DELETE_LIST', listId, { listId }, user.uid);
      deleteUserShoppingListDoc(user.uid, listId).catch(() => {});
    }
    setShoppingLists(prev => prev.filter(l => l.id !== listId));
    showToast('Liste gelöscht');
  };

  const updateShoppingListTitle = (listId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setShoppingLists(prev => {
      const updated = prev.map(l => (l.id === listId ? { ...l, title: trimmed } : l));
      const targetList = updated.find(l => l.id === listId);
      if (user.uid) {
        saveLocalUserSubcollection(user.uid, 'lists', updated);
        if (targetList) {
          syncEngine.enqueue('RENAME_LIST', listId, targetList, user.uid);
          saveUserShoppingListDoc(user.uid, targetList).catch(err => {
            console.warn('Notice updating renamed shoppingList doc:', err);
          });
        }
      }
      return updated;
    });
    showToast('Listenname geändert');
  };

  // Personal Custom Foods & Recipes (private to user account)
  const addCustomFood = (itemData: Omit<CustomFoodItem, 'id' | 'createdAt'>): CustomFoodItem => {
    const newFood: CustomFoodItem = {
      ...itemData,
      id: `cf_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    if (user.uid) {
      syncEngine.enqueue('SAVE_CUSTOM_FOOD', newFood.id, newFood, user.uid);
      saveUserCustomFoodDoc(user.uid, newFood).catch(() => {});
    }
    setCustomFoods(prev => {
      const filtered = prev.filter(f => f.name.toLowerCase() !== itemData.name.toLowerCase());
      const updated = [newFood, ...filtered];
      if (user.uid) {
        saveLocalUserSubcollection(user.uid, 'customFoods', updated);
      }
      return updated;
    });
    return newFood;
  };

  const deleteCustomFood = (id: string) => {
    if (user.uid) {
      syncEngine.enqueue('DELETE_CUSTOM_FOOD', id, { id }, user.uid);
      deleteUserCustomFoodDoc(user.uid, id).catch(() => {});
    }
    setCustomFoods(prev => {
      const updated = prev.filter(f => f.id !== id);
      if (user.uid) {
        saveLocalUserSubcollection(user.uid, 'customFoods', updated);
      }
      return updated;
    });
    showToast('Eigenes Lebensmittel gelöscht');
  };

  // Tracker
  const logMeal = (product: Product, portionGrams: number, mealType: MealType) => {
    if (!hasFeature('meal_logging')) {
      openPaywall('meal_logging');
      return;
    }

    const factor = portionGrams / 100;
    const newMeal: MealLogItem = {
      id: `meal_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      portionGrams,
      calories: Math.round(product.nutritionPer100g.calories * factor),
      protein: Number((product.nutritionPer100g.protein * factor).toFixed(1)),
      carbs: Number((product.nutritionPer100g.carbohydrates * factor).toFixed(1)),
      fat: Number((product.nutritionPer100g.fat * factor).toFixed(1)),
      mealType,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updatedMeals = [newMeal, ...todayMeals];
    setTodayMeals(updatedMeals);
    const dateKey = getTodayTrackerKey();
    if (user.uid) {
      syncEngine.enqueue('SAVE_MEAL_LOG', dateKey, { dateKey, meal: newMeal }, user.uid);
      saveUserDailyTrackerDoc(user.uid, dateKey, {
        date: new Date().toISOString().split('T')[0],
        waterMl: waterIntakeMl,
        meals: updatedMeals
      }).catch(() => {});
      setWeeklyTrackers(prev => ({
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] || {}),
          date: new Date().toISOString().split('T')[0],
          waterMl: waterIntakeMl,
          meals: updatedMeals
        }
      }));
    }
    showToast(`${product.name} zu „Dein Tag“ hinzugefügt (+${newMeal.calories} kcal)`);
  };

  const logCustomMeal = (params: {
    name: string;
    portionGrams?: number;
    amountLabel?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    mealType: MealType;
  }) => {
    if (!hasFeature('meal_logging')) {
      openPaywall('meal_logging');
      return;
    }

    const newMeal: MealLogItem = {
      id: `meal_custom_${Date.now()}`,
      productId: 'custom',
      productName: params.name,
      brand: 'Eigenes Gericht',
      portionGrams: params.portionGrams || 100,
      amountLabel: params.amountLabel,
      calories: Math.round(params.calories || 0),
      protein: Number((params.protein || 0).toFixed(1)),
      carbs: Number((params.carbs || 0).toFixed(1)),
      fat: Number((params.fat || 0).toFixed(1)),
      mealType: params.mealType,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCustom: true
    };
    const updatedMeals = [newMeal, ...todayMeals];
    setTodayMeals(updatedMeals);
    const dateKey = getTodayTrackerKey();
    if (user.uid) {
      syncEngine.enqueue('SAVE_MEAL_LOG', dateKey, { dateKey, meal: newMeal }, user.uid);
      saveUserDailyTrackerDoc(user.uid, dateKey, {
        date: new Date().toISOString().split('T')[0],
        waterMl: waterIntakeMl,
        meals: updatedMeals
      }).catch(() => {});
      setWeeklyTrackers(prev => ({
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] || {}),
          date: new Date().toISOString().split('T')[0],
          waterMl: waterIntakeMl,
          meals: updatedMeals
        }
      }));
    }
    showToast(`„${params.name}“ zu „Dein Tag“ hinzugefügt (+${newMeal.calories} kcal)`);
  };

  const removeMealLog = (id: string) => {
    const updatedMeals = todayMeals.filter(m => m.id !== id);
    setTodayMeals(updatedMeals);
    const dateKey = getTodayTrackerKey();
    if (user.uid) {
      syncEngine.enqueue('REMOVE_MEAL_LOG', dateKey, { dateKey, mealId: id }, user.uid);
      saveUserDailyTrackerDoc(user.uid, dateKey, {
        date: new Date().toISOString().split('T')[0],
        waterMl: waterIntakeMl,
        meals: updatedMeals
      }).catch(() => {});
      setWeeklyTrackers(prev => ({
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] || {}),
          date: new Date().toISOString().split('T')[0],
          waterMl: waterIntakeMl,
          meals: updatedMeals
        }
      }));
    }
    showToast('Mahlzeit entfernt');
  };

  const addWater = (ml: number) => {
    const target = user.dailyGoals?.water || 2000;
    const prevWater = waterIntakeMl;
    const newWater = Math.min(6000, prevWater + ml);

    // Exact requirement: trigger once per day when water target is first reached or exceeded (100%)
    const todayStr = getTodayCalendarDate();
    const celebratedDate = localStorage.getItem('goodies_water_goal_celebrated_date');

    if (prevWater < target && newWater >= target && celebratedDate !== todayStr) {
      localStorage.setItem('goodies_water_goal_celebrated_date', todayStr);
      setIsWaterCelebrationActive(true);
      setTimeout(() => {
        setIsWaterCelebrationActive(false);
      }, 2800);
    }

    setWaterIntakeMl(newWater);
    const dateKey = getTodayTrackerKey();
    const waterEntry: WaterLogEntry = {
      id: `water_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      amountMl: ml,
      timestamp: Date.now(),
      date: todayStr
    };

    if (user.uid) {
      syncEngine.enqueue('ADD_WATER_LOG', dateKey, { dateKey, entry: waterEntry }, user.uid);
      saveUserDailyTrackerDoc(user.uid, dateKey, {
        date: new Date().toISOString().split('T')[0],
        waterMl: newWater,
        meals: todayMeals
      }).catch(() => {});
      setWeeklyTrackers(prev => ({
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] || {}),
          date: new Date().toISOString().split('T')[0],
          waterMl: newWater,
          meals: todayMeals
        }
      }));
    }
    showToast(`+${ml} ml Wasser getrunken`);
  };

  const resetWater = () => {
    setWaterIntakeMl(0);
    const dateKey = getTodayTrackerKey();
    if (user.uid) {
      syncEngine.enqueue('RESET_WATER', dateKey, { dateKey, resetTimestamp: Date.now() }, user.uid);
      saveUserDailyTrackerDoc(user.uid, dateKey, {
        date: new Date().toISOString().split('T')[0],
        waterMl: 0,
        meals: todayMeals
      }).catch(() => {});
      setWeeklyTrackers(prev => ({
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] || {}),
          date: new Date().toISOString().split('T')[0],
          waterMl: 0,
          meals: todayMeals
        }
      }));
    }
    showToast('Wasserzähler zurückgesetzt');
  };

  // User Reports: Product Feedback & App Bug reports
  const refreshReports = async (): Promise<void> => {
    try {
      const list = await fetchAppReportsFromFirestore();
      if (list && list.length >= 0) {
        setReports(list);
        try {
          localStorage.setItem('goodies_app_reports', JSON.stringify(list));
        } catch {}
      }
    } catch (err) {
      console.warn('Error refreshing reports:', err);
    }
  };

  const addReport = async (data: {
    type: 'product' | 'bug';
    reason: string;
    details?: string;
    productId?: string;
    productName?: string;
    productBrand?: string;
    productBarcode?: string;
  }): Promise<void> => {
    const newReport: AppReportItem = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: data.type,
      reason: data.reason,
      details: data.details,
      productId: data.productId,
      productName: data.productName,
      productBrand: data.productBrand,
      productBarcode: data.productBarcode,
      reportedBy: user.displayName || user.name || 'Nutzer',
      userName: user.displayName || user.name || 'Nutzer',
      userEmail: user.email || '',
      reportedAt: new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    setReports(prev => {
      const updated = [newReport, ...prev];
      try {
        localStorage.setItem('goodies_app_reports', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (user.uid) {
      syncEngine.enqueue('SUBMIT_REPORT', newReport.id, newReport, user.uid);
    }

    await saveAppReportToFirestore(newReport).catch((err) => {
      console.warn('Notice saving report directly:', err);
    });
    showToast('Meldung erfolgreich gesendet. Vielen Dank!');
  };

  const updateReportStatus = async (reportId: string, status: 'pending' | 'in_review' | 'resolved' | 'open'): Promise<void> => {
    setReports(prev => {
      const updated = prev.map(r => r.id === reportId ? { ...r, status: status === 'open' ? 'pending' : status } : r);
      try {
        localStorage.setItem('goodies_app_reports', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    await updateAppReportStatusInFirestore(reportId, status);
    showToast(status === 'resolved' ? 'Meldung als gelöst markiert' : status === 'in_review' ? 'Status auf „In Prüfung“ gesetzt' : 'Meldung wieder geöffnet');
  };

  const deleteReport = async (reportId: string): Promise<void> => {
    setReports(prev => {
      const updated = prev.filter(r => r.id !== reportId);
      try {
        localStorage.setItem('goodies_app_reports', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    await deleteAppReportFromFirestore(reportId);
    showToast('Meldung gelöscht');
  };

  // Barcode Community Reports: Synced with Firestore unknown_barcodes
  const refreshUnknownBarcodes = async (): Promise<void> => {
    try {
      const list = await fetchUnknownBarcodesFromFirestore();
      setUnknownBarcodes(list);
    } catch (err) {
      console.warn('Error refreshing unknown barcodes:', err);
    }
  };

  const submitUnknownBarcode = async (barcode: string, notes?: string) => {
    await reportUnknownBarcode(barcode, notes);
    await refreshUnknownBarcodes();
    showToast(`Barcode ${barcode} zur Prüfung eingereicht! Vielen Dank.`);
  };

  const resolveUnknownBarcode = async (id: string) => {
    await resolveUnknownBarcodeInFirestore(id);
    setUnknownBarcodes(prev => prev.map(item => 
      (item.id === id || item.barcode === id) ? { ...item, status: 'resolved' } : item
    ));
    showToast('Barcode als gelöst markiert');
  };

  const deleteUnknownBarcode = async (id: string) => {
    await deleteUnknownBarcodeFromFirestore(id);
    setUnknownBarcodes(prev => prev.filter(item => item.id !== id && item.barcode !== id));
    showToast('Barcode-Eintrag gelöscht');
  };

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedProduct,
        setSelectedProduct,
        openProductDetail,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        appAuthState,
        setAppAuthState,
        authErrorMessage,
        setAuthErrorMessage,
        user,
        isAdmin,
        isComparisonOpen,
        comparisonProductA,
        comparisonProductB,
        openComparison,
        closeComparison,
        updateUserProfile,
        refreshUserProfileFromDb,
        handleAuthSuccess,
        completeOnboarding,
        logout,
        deleteAccount,
        isAuthLoading: appAuthState === 'INITIALIZING' || appAuthState === 'AUTH_LOADING',
        effectiveTier,
        hasFeature,
        getFeatureLimit,
        adminSimulationTier,
        setAdminSimulationTier,
        isCheckoutOpen,
        checkoutBillingCycle,
        openCheckout,
        closeCheckout,
        canPerformScan,
        consumeScan,
        openPaywall,
        closePaywall,
        isPaywallOpen,
        paywallContext,
        openAboModal,
        closeAboModal,
        isAboModalOpen,
        scanHistory,
        addToScanHistory,
        clearScanHistory,
        favorites,
        toggleFavorite,
        isFavorite,
        shoppingLists,
        createShoppingList,
        addShoppingItem,
        updateShoppingItem,
        toggleShoppingItem,
        removeShoppingItem,
        deleteShoppingList,
        updateShoppingListTitle,
        customFoods,
        addCustomFood,
        deleteCustomFood,
        todayMeals,
        logMeal,
        logCustomMeal,
        removeMealLog,
        waterIntakeMl,
        addWater,
        resetWater,
        isWaterCelebrationActive,
        adminTab,
        setAdminTab,
        unknownBarcodes,
        refreshUnknownBarcodes,
        submitUnknownBarcode,
        resolveUnknownBarcode,
        deleteUnknownBarcode,
        reports,
        addReport,
        updateReportStatus,
        deleteReport,
        refreshReports,
        toastMessage,
        showToast,
        theme,
        isDarkMode,
        setTheme,
        toggleTheme,
        syncStatus,
        triggerManualSync,
        weeklyTrackers,
        refreshWeeklyTrackers
      }}
    >
      {children}
      <ProPaywallModal
        isOpen={isPaywallOpen}
        onClose={closePaywall}
        context={paywallContext}
      />
      <SubscriptionModal
        isOpen={isAboModalOpen}
        onClose={closeAboModal}
        onOpenPaywall={() => openPaywall('general')}
      />
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={closeCheckout}
        defaultPlan={checkoutBillingCycle}
        sourceContext={paywallContext}
      />
      {isComparisonOpen && comparisonProductA && (
        <ProductComparisonModal
          isOpen={isComparisonOpen}
          onClose={closeComparison}
          productA={comparisonProductA}
          productB={comparisonProductB}
        />
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
