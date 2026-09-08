export type NutriScore = 'A' | 'B' | 'C' | 'D' | 'E';
export type NovaScore = 1 | 2 | 3 | 4;

export type ProductSource = 'goodies' | 'openfoodfacts' | 'admin' | 'manufacturer';
export type DataQuality = 'high' | 'medium' | 'basic';

export interface Additive {
  code: string;
  name: string;
  risk: 'safe' | 'moderate' | 'high' | 'avoid';
  note?: string;
}

export interface NutritionPer100g {
  calories: number;
  fat: number;
  saturatedFat: number;
  carbohydrates: number;
  sugars: number;
  fiber: number;
  protein: number;
  salt: number;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  quantity: string;
  imageUrl: string;
  imageFront?: string;
  imageBack?: string;
  imageIngredients?: string;
  imageNutrition?: string;
  goodiesScore: number; // 0 - 100
  goodieScore?: number; // Alias
  nutriScore: NutriScore;
  nutriscore?: NutriScore; // Alias
  novaScore: NovaScore;
  nutritionPer100g: NutritionPer100g;
  calories?: number;
  fat?: number;
  saturatedFat?: number;
  carbs?: number;
  sugar?: number;
  protein?: number;
  fiber?: number;
  salt?: number;
  servingSize?: string;
  ingredients: string;
  additives: Additive[];
  allergens: string[];
  labels: string[];
  pros: string[];
  cons: string[];
  healthVerdict: string;
  betterAlternatives?: string[]; // IDs or barcodes
  verified?: boolean;
  source?: ProductSource;
  confidence?: 'high' | 'medium' | 'low';
  status?: 'active' | 'archived' | 'pending';
  createdAt?: string;
  updatedAt?: string;
  lastVerifiedAt?: string;
  dataQuality?: DataQuality;
}

export type DietType = 'Allesesser' | 'Omnivore' | 'Vegetarisch' | 'Vegan' | 'Pescetarisch' | 'Low Carb';

export type SubscriptionTier = 'FREE' | 'PRO';

export type AppFeature = FeatureKey;

export type AppAuthState = 
  | 'INITIALIZING' 
  | 'AUTH_LOADING' 
  | 'LOGIN' 
  | 'ONBOARDING' 
  | 'APP' 
  | 'ERROR';

export type Gender = 'female' | 'male' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type HealthGoal = 'maintain' | 'lose_weight' | 'build_muscle' | 'healthy_eating';
export type UserRole = 'USER' | 'ADMIN';

export interface UserProfile {
  id: string; // Firebase uid
  uid: string;
  name: string;
  displayName?: string;
  email: string;
  role?: UserRole; // 'USER' | 'ADMIN' - defaults strictly to 'USER' for non-admins
  photoURL?: string;
  authProvider?: string;
  diet: DietType;
  allergies: string[];
  excludedIngredients: string[]; // Ausschlussliste: z.B. Palmöl, Schweinefleisch, Gelatine, Süßstoffe
  priorities?: string[]; // Ernährungsziele: 'Weniger Zucker', 'Weniger Salz', etc.
  gender?: Gender;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  healthGoal?: HealthGoal;
  isPro: boolean;
  subscriptionTier: SubscriptionTier;
  supportAmountEur?: number;
  dailyScanCount?: number;
  dailyScanDate?: string;
  lastScanTimestamp?: number;
  onboardingCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  dailyGoals: {
    calories: number;
    protein: number; // g
    carbs: number; // g
    fat: number; // g
    water: number; // ml
    maxSugar?: number; // max g Zucker pro Tag
    maxSalt?: number; // max g Salz pro Tag
  };
}

export type FeatureKey =
  | 'unlimited_scans'
  | 'unlimited_lists'
  | 'unlimited_history'
  | 'smart_list_analysis'
  | 'meal_logging'
  | 'mealLogging'
  | 'nutrition_goals'
  | 'exclusion_list'
  | 'goodies_match'
  | 'personalMatch'
  | 'advanced_product_analysis'
  | 'ai_explanation'
  | 'better_alternatives_all'
  | 'unlimitedAlternatives'
  | 'product_comparison'
  | 'weekly_analysis'
  | 'water_tracker'
  | 'favorites';

export type FeatureLimitKey = 
  | 'daily_scans' 
  | 'dailyScans' 
  | 'shopping_lists' 
  | 'shoppingLists' 
  | 'history_items' 
  | 'historyItems';

export type PaywallContext =
  | 'scans'
  | 'lists'
  | 'history'
  | 'smart_list_analysis'
  | 'meal_logging'
  | 'meal_log'
  | 'nutrition_goals'
  | 'exclusion_list'
  | 'goodies_match'
  | 'personal_match'
  | 'ai_explanation'
  | 'alternatives'
  | 'comparison'
  | 'weekly_analysis'
  | 'general';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealLogItem {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  portionGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  timestamp: string;
  isCustom?: boolean;
  amountLabel?: string;
}

export interface DailyTracking {
  date: string; // YYYY-MM-DD
  waterMl: number;
  meals: MealLogItem[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount?: string;
  checked: boolean;
  productId?: string;
  calories?: number;
  isCustom?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ShoppingListItem = ShoppingItem;

export interface WaterLogEntry {
  id: string;
  amountMl: number;
  timestamp: number;
  date: string; // YYYY-MM-DD
}

export interface DailyTrackerDoc {
  date: string; // YYYY-MM-DD
  waterMl: number;
  waterLogs?: WaterLogEntry[];
  meals: MealLogItem[];
  updatedAt?: string;
  resetWaterAt?: number;
}

export type SyncStatusState = 'synced' | 'offline' | 'syncing' | 'error';

export interface SyncStatusInfo {
  state: SyncStatusState;
  pendingCount: number;
  lastSyncTimestamp: number | null;
  lastError: string | null;
  isOnline: boolean;
}

export interface CustomFoodItem {
  id: string;
  name: string;
  amount?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugars?: number;
  fiber?: number;
  category?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ShoppingList {
  id: string;
  title: string;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt?: string;
  timestamp?: number;
}

export interface ScanHistoryItem {
  id: string;
  productId: string;
  barcode: string;
  productName: string;
  brand: string;
  goodiesScore: number;
  goodiesMatch?: number;
  sessionId?: string;
  nutriScore: NutriScore;
  scannedAt: string;
  timestamp?: number;
  createdAt?: string;
}

export interface ScanSession {
  sessionId: string;
  startedAt: string;
  products: Product[];
  averageGoodiesScore: number;
  totalScans: number;
}

export type ScanPipelineStep = 
  | 'idle'
  | 'cameraStarted'
  | 'barcodeDetectionStarted'
  | 'barcodeDetected'
  | 'barcodeNormalized'
  | 'productLookupStarted'
  | 'productLookupResult'
  | 'productLoaded'
  | 'productNotFound'
  | 'error';

export interface UnknownBarcodeReport {
  id: string;
  barcode: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  scanCount?: number;
  reportedAt: string;
  notes?: string;
  status: 'pending' | 'resolved';
}

export type AppView = 
  | 'home'
  | 'scanner'
  | 'product-detail'
  | 'compare'
  | 'search'
  | 'tracker'
  | 'lists'
  | 'history'
  | 'profile'
  | 'pro-modal'
  | 'admin';

export type AdminTab = 
  | 'overview' 
  | 'users'
  | 'products' 
  | 'reviews' 
  | 'unknown-barcodes' 
  | 'reports'
  | 'create-product';

export interface AppReportItem {
  id: string;
  type: 'product' | 'bug';
  reason: string;
  details?: string;
  productId?: string;
  productName?: string;
  productBrand?: string;
  productBarcode?: string;
  reportedBy?: string;
  userName?: string;
  userEmail?: string;
  reportedAt: string;
  createdAt?: string;
  status: 'pending' | 'in_review' | 'resolved' | 'open';
}

export type AppTheme = 'light' | 'dark' | 'system';
