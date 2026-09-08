import defaultProducts from '../data/products.json';
import { 
  Product, 
  UserProfile, 
  UnknownBarcodeReport, 
  NutriScore, 
  NovaScore, 
  NutritionPer100g, 
  Additive, 
  ProductSource, 
  DataQuality 
} from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  limit 
} from 'firebase/firestore';

const STORAGE_KEY_PRODUCTS_CACHE = 'goodies_products_cache_v2';
const STORAGE_KEY_UNKNOWN = 'goodies_unknown_barcodes_v1';
const MIGRATION_FLAG_KEY = 'goodies_firestore_migrated_v1';

// In-memory runtime cache for lightning-fast lookups
let memoryProductsCache: Product[] = [];
let isMigrationRunning = false;

/**
 * Normalizes barcode: removes spaces, dashes, leading/trailing whitespace
 */
export function normalizeBarcode(barcode: string): string {
  if (!barcode) return '';
  return barcode.trim().replace(/[\s\-_]/g, '');
}

/**
 * Ensures all required product fields are present and standardized
 */
export function enrichProductFields(p: Partial<Product>, fallbackBarcode: string): Product {
  const normBarcode = normalizeBarcode(p.barcode || fallbackBarcode);
  const now = new Date().toISOString();
  
  const cals = p.calories ?? p.nutritionPer100g?.calories ?? 0;
  const fat = p.fat ?? p.nutritionPer100g?.fat ?? 0;
  const satFat = p.saturatedFat ?? p.nutritionPer100g?.saturatedFat ?? 0;
  const carbs = p.carbs ?? p.nutritionPer100g?.carbohydrates ?? 0;
  const sugar = p.sugar ?? p.nutritionPer100g?.sugars ?? 0;
  const protein = p.protein ?? p.nutritionPer100g?.protein ?? 0;
  const fiber = p.fiber ?? p.nutritionPer100g?.fiber ?? 0;
  const salt = p.salt ?? p.nutritionPer100g?.salt ?? 0;

  const nutrition: NutritionPer100g = p.nutritionPer100g || {
    calories: cals,
    fat,
    saturatedFat: satFat,
    carbohydrates: carbs,
    sugars: sugar,
    fiber,
    protein,
    salt
  };

  const gScore = p.goodiesScore ?? p.goodieScore ?? 75;
  const nScore = p.nutriScore ?? p.nutriscore ?? 'C';

  return {
    id: p.id || `prod_${normBarcode}_${Date.now()}`,
    barcode: normBarcode,
    name: p.name || 'Unbekanntes Produkt',
    brand: p.brand || 'Unbekannte Marke',
    category: p.category || 'Lebensmittel',
    quantity: p.quantity || '100g',
    imageUrl: p.imageUrl || p.imageFront || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    imageFront: p.imageFront || p.imageUrl,
    imageBack: p.imageBack,
    imageIngredients: p.imageIngredients,
    imageNutrition: p.imageNutrition,
    goodiesScore: gScore,
    goodieScore: gScore,
    nutriScore: nScore,
    nutriscore: nScore,
    novaScore: p.novaScore || 2,
    nutritionPer100g: nutrition,
    calories: cals,
    fat,
    saturatedFat: satFat,
    carbs,
    sugar,
    protein,
    fiber,
    salt,
    servingSize: p.servingSize || '100g',
    ingredients: p.ingredients || 'Keine Zutatenliste verfügbar',
    additives: p.additives || [],
    allergens: p.allergens || [],
    labels: p.labels || [],
    pros: p.pros || ['Ausgewogene Nährstoffe'],
    cons: p.cons || [],
    healthVerdict: p.healthVerdict || 'Solides Alltagsprodukt.',
    betterAlternatives: p.betterAlternatives || [],
    verified: p.verified ?? true,
    source: p.source || 'goodies',
    confidence: p.confidence || 'high',
    status: p.status || 'active',
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || now,
    lastVerifiedAt: p.lastVerifiedAt || now,
    dataQuality: p.dataQuality || 'high'
  };
}

export function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

function getSafeLocalStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function setSafeLocalStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

/**
 * Reads local cache as immediate sync fallback
 */
export function getCachedProducts(): Product[] {
  if (memoryProductsCache.length > 0) {
    return memoryProductsCache;
  }
  try {
    const cached = getSafeLocalStorageItem(STORAGE_KEY_PRODUCTS_CACHE);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryProductsCache = parsed;
        return parsed;
      }
    }
    // Fallback: check legacy storage key
    const legacy = getSafeLocalStorageItem('goodies_products_v1');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryProductsCache = parsed.map((p: any) => enrichProductFields(p, p.barcode));
        return memoryProductsCache;
      }
    }
  } catch (err) {
    console.warn('Could not read product cache:', err);
  }
  return (defaultProducts as any[]).map(p => enrichProductFields(p, p.barcode));
}

/**
 * Saves products to memory and localStorage cache
 */
function updateProductsCache(products: Product[]): void {
  memoryProductsCache = products;
  setSafeLocalStorageItem(STORAGE_KEY_PRODUCTS_CACHE, JSON.stringify(products));
}

/**
 * Idempotent migration of seed & local products to Firestore.
 * Runs once if needed, skips existing barcodes, never clobbers existing data.
 */
export async function migrateSeedProductsToFirestore(): Promise<void> {
  if (isMigrationRunning) return;
  isMigrationRunning = true;

  try {
    const migratedFlag = getSafeLocalStorageItem(MIGRATION_FLAG_KEY);
    const colRef = collection(db, 'products');

    // Fetch existing documents from Firestore
    const existingSnap = await getDocs(colRef);
    const existingBarcodes = new Set<string>();

    existingSnap.forEach(docSnap => {
      const d = docSnap.data();
      if (d.barcode) {
        existingBarcodes.add(normalizeBarcode(d.barcode));
      }
    });

    // If Firestore already has products and flag is set, skip
    if (existingSnap.size > 0 && migratedFlag === 'true') {
      isMigrationRunning = false;
      return;
    }

    // Combine default bundle products with any local user products
    const seedList: any[] = [...defaultProducts];
    try {
      const localLegacy = getSafeLocalStorageItem('goodies_products_v1');
      if (localLegacy) {
        const parsed = JSON.parse(localLegacy);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!seedList.some(s => normalizeBarcode(s.barcode) === normalizeBarcode(item.barcode))) {
              seedList.push(item);
            }
          }
        }
      }
    } catch {}

    // Insert only missing products
    for (const raw of seedList) {
      const enriched = enrichProductFields(raw, raw.barcode);
      const cleanCode = enriched.barcode;

      if (!existingBarcodes.has(cleanCode)) {
        try {
          const docRef = doc(db, 'products', enriched.id);
          await setDoc(docRef, cleanForFirestore(enriched));
          existingBarcodes.add(cleanCode);
        } catch (err) {
          console.warn(`Could not migrate product ${enriched.name}:`, err);
        }
      }
    }

    setSafeLocalStorageItem(MIGRATION_FLAG_KEY, 'true');
  } catch (err) {
    console.warn('Idempotent product migration note:', err);
  } finally {
    isMigrationRunning = false;
  }
}

/**
 * Fetches all active products from Firestore (Source of Truth)
 * Caches locally for offline and fast UI responsiveness.
 */
export async function getProducts(): Promise<Product[]> {
  try {
    // 1. Check/perform migration if empty
    await migrateSeedProductsToFirestore();

    // 2. Fetch fresh from Firestore
    const colRef = collection(db, 'products');
    const snap = await getDocs(colRef);

    if (!snap.empty) {
      const items: Product[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data() as Partial<Product>;
        // Filter out archived products for public consumption
        if (data.status !== 'archived') {
          items.push(enrichProductFields(data, data.barcode || docSnap.id));
        }
      });

      if (items.length > 0) {
        updateProductsCache(items);
        return items;
      }
    }
  } catch (err) {
    console.warn('Firestore getProducts notice, falling back to cache:', err);
  }

  return getCachedProducts();
}

/**
 * Initial sync getter for synchronous component initialization
 */
export function getInitialProducts(): Product[] {
  return getCachedProducts();
}

/**
 * Helper to write products (used for backward compatibility with AppContext)
 */
export function saveProducts(products: Product[]): void {
  updateProductsCache(products);
}

/**
 * Find in a loaded list by normalized barcode
 */
export function findProductByBarcode(barcode: string, products: Product[]): Product | undefined {
  const cleanCode = normalizeBarcode(barcode);
  if (!cleanCode) return undefined;
  return products.find(p => normalizeBarcode(p.barcode) === cleanCode);
}

/**
 * Find in a loaded list by product ID
 */
export function findProductById(id: string, products: Product[]): Product | undefined {
  return products.find(p => p.id === id);
}

/**
 * Search products by query across name, brand, category, barcode
 */
export async function searchProducts(searchQuery: string): Promise<Product[]> {
  const term = searchQuery.trim().toLowerCase();
  if (!term) return getProducts();

  const all = await getProducts();
  return all.filter(p => 
    p.name.toLowerCase().includes(term) ||
    p.brand.toLowerCase().includes(term) ||
    p.category.toLowerCase().includes(term) ||
    normalizeBarcode(p.barcode).includes(term)
  );
}

/**
 * Create a new product in Firestore
 */
export async function createProduct(productData: Omit<Product, 'id'> | Product): Promise<Product> {
  const normBarcode = normalizeBarcode(productData.barcode);
  const newId = (productData as Product).id || `prod_${normBarcode || Date.now()}`;
  const now = new Date().toISOString();

  const enriched = enrichProductFields({
    ...productData,
    id: newId,
    createdAt: (productData as Product).createdAt || now,
    updatedAt: now,
    lastVerifiedAt: now,
    status: 'active'
  }, normBarcode);

  // Write directly to Firestore Source of Truth
  const docRef = doc(db, 'products', enriched.id);
  await setDoc(docRef, cleanForFirestore(enriched));

  // Update memory and local cache
  const updatedCache = [enriched, ...memoryProductsCache.filter(p => p.id !== enriched.id)];
  updateProductsCache(updatedCache);

  return enriched;
}

/**
 * Update an existing product in Firestore
 */
export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, 'products', id);

  const cleanUpdates = {
    ...updates,
    updatedAt: now
  };

  await updateDoc(docRef, cleanForFirestore(cleanUpdates));

  // Update cache
  const updatedCache = memoryProductsCache.map(p => 
    p.id === id ? enrichProductFields({ ...p, ...cleanUpdates }, p.barcode) : p
  );
  updateProductsCache(updatedCache);
}

/**
 * Upsert product (create or update)
 */
export async function upsertProduct(product: Product): Promise<void> {
  const now = new Date().toISOString();
  const enriched = enrichProductFields({
    ...product,
    updatedAt: now
  }, product.barcode);

  const docRef = doc(db, 'products', enriched.id);
  await setDoc(docRef, cleanForFirestore(enriched), { merge: true });

  const exists = memoryProductsCache.some(p => p.id === enriched.id);
  const updatedCache = exists 
    ? memoryProductsCache.map(p => p.id === enriched.id ? enriched : p)
    : [enriched, ...memoryProductsCache];
  updateProductsCache(updatedCache);
}

/**
 * Soft delete / archive product in Firestore
 */
export async function archiveProduct(id: string): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, {
    status: 'archived',
    updatedAt: now
  });

  const updatedCache = memoryProductsCache.filter(p => p.id !== id);
  updateProductsCache(updatedCache);
}

/**
 * Unknown barcode reporting: saves to Firestore unknown_barcodes and local cache
 */
export function getUnknownBarcodes(): UnknownBarcodeReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNKNOWN);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load unknown barcodes from cache:', err);
  }
  return [];
}

/**
 * Fetch all unknown barcodes directly from Cloud Firestore (source of truth)
 */
export async function fetchUnknownBarcodesFromFirestore(): Promise<UnknownBarcodeReport[]> {
  try {
    const colRef = collection(db, 'unknown_barcodes');
    const snap = await getDocs(colRef);
    const reports: UnknownBarcodeReport[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const rawId = docSnap.id;
      const barcode = String(data.barcode || rawId.replace(/^unk_/, '')).trim();
      const status = data.status === 'resolved' ? 'resolved' : 'pending';
      const scanCount = typeof data.scanCount === 'number' ? data.scanCount : 1;
      const firstSeenAt = data.firstSeenAt || data.createdAt || data.lastSeenAt || new Date().toISOString();
      const lastSeenAt = data.lastSeenAt || data.updatedAt || firstSeenAt;
      
      reports.push({
        id: rawId,
        barcode,
        reportedAt: data.reportedAt || (new Date(lastSeenAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })),
        firstSeenAt,
        lastSeenAt,
        scanCount,
        notes: data.notes || '',
        status
      });
    });

    // Sort: pending first, then by lastSeenAt descending
    reports.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return (b.lastSeenAt || '').localeCompare(a.lastSeenAt || '');
    });

    try {
      localStorage.setItem(STORAGE_KEY_UNKNOWN, JSON.stringify(reports));
    } catch {}

    return reports;
  } catch (err) {
    console.warn('Firestore fetch unknown barcodes error, falling back to cache:', err);
    return getUnknownBarcodes();
  }
}

export async function reportUnknownBarcode(barcode: string, notes?: string): Promise<void> {
  const cleanCode = normalizeBarcode(barcode);
  if (!cleanCode) return;

  const current = getUnknownBarcodes();
  const existingIndex = current.findIndex(u => normalizeBarcode(u.barcode) === cleanCode);
  const nowIso = new Date().toISOString();
  const reportedAtLabel = new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  let reportItem: UnknownBarcodeReport;
  const docId = `unk_${cleanCode}`;

  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    reportItem = {
      ...existing,
      id: existing.id || docId,
      status: 'pending', // Re-opened if scanned again
      scanCount: (existing.scanCount || 1) + 1,
      lastSeenAt: nowIso,
      reportedAt: reportedAtLabel,
      notes: notes || existing.notes
    };
    current[existingIndex] = reportItem;
  } else {
    reportItem = {
      id: docId,
      barcode: cleanCode,
      reportedAt: reportedAtLabel,
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      scanCount: 1,
      notes,
      status: 'pending'
    };
    current.unshift(reportItem);
  }

  try {
    localStorage.setItem(STORAGE_KEY_UNKNOWN, JSON.stringify(current));
  } catch {}

  // Also persist to Firestore unknown_barcodes collection
  try {
    const docRef = doc(db, 'unknown_barcodes', docId);
    await setDoc(docRef, {
      barcode: cleanCode,
      scanCount: reportItem.scanCount,
      notes: reportItem.notes || null,
      firstSeenAt: reportItem.firstSeenAt,
      lastSeenAt: nowIso,
      reportedAt: reportedAtLabel,
      status: 'pending',
      updatedAt: nowIso
    }, { merge: true });
  } catch (err) {
    console.warn('Could not write unknown barcode to Firestore:', err);
  }
}

/**
 * Mark unknown barcode as resolved in Firestore and local cache
 */
export async function resolveUnknownBarcodeInFirestore(idOrBarcode: string): Promise<void> {
  const clean = normalizeBarcode(idOrBarcode.replace(/^unk_/, ''));
  const docId = idOrBarcode.startsWith('unk_') ? idOrBarcode : `unk_${clean}`;
  const nowIso = new Date().toISOString();

  // Update local cache
  const current = getUnknownBarcodes();
  const updated = current.map(item => {
    if (item.id === idOrBarcode || item.id === docId || normalizeBarcode(item.barcode) === clean) {
      return { ...item, status: 'resolved' as const, lastSeenAt: nowIso };
    }
    return item;
  });
  try {
    localStorage.setItem(STORAGE_KEY_UNKNOWN, JSON.stringify(updated));
  } catch {}

  // Update Firestore
  try {
    const docRef = doc(db, 'unknown_barcodes', docId);
    await setDoc(docRef, {
      status: 'resolved',
      resolvedAt: nowIso,
      updatedAt: nowIso
    }, { merge: true });
  } catch (err) {
    console.warn('Could not update resolved status in Firestore:', err);
  }
}

/**
 * Delete unknown barcode from Firestore and local cache
 */
export async function deleteUnknownBarcodeFromFirestore(idOrBarcode: string): Promise<void> {
  const clean = normalizeBarcode(idOrBarcode.replace(/^unk_/, ''));
  const docId = idOrBarcode.startsWith('unk_') ? idOrBarcode : `unk_${clean}`;

  // Update local cache
  const current = getUnknownBarcodes();
  const filtered = current.filter(item => item.id !== idOrBarcode && item.id !== docId && normalizeBarcode(item.barcode) !== clean);
  try {
    localStorage.setItem(STORAGE_KEY_UNKNOWN, JSON.stringify(filtered));
  } catch {}

  // Delete from Firestore
  try {
    const docRef = doc(db, 'unknown_barcodes', docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Could not delete unknown barcode from Firestore:', err);
  }
}

// ----------------------------------------------------
// OPEN FOOD FACTS LOOKUP & NORMALIZATION
// ----------------------------------------------------

const COMMON_ADDITIVES_MAP: Record<string, { name: string; risk: 'safe' | 'moderate' | 'high' | 'avoid'; note?: string }> = {
  'e322': { name: 'Lecithine', risk: 'safe', note: 'Pflanzlicher Emulgator' },
  'e330': { name: 'Zitronensäure', risk: 'safe', note: 'Natürliches Säuerungsmittel' },
  'e300': { name: 'Ascorbinsäure (Vitamin C)', risk: 'safe', note: 'Antioxidationsmittel' },
  'e412': { name: 'Guarkernmehl', risk: 'safe', note: 'Pflanzliches Verdickungsmittel' },
  'e415': { name: 'Xanthan', risk: 'safe', note: 'Fermentiertes Verdickungsmittel' },
  'e440': { name: 'Pektin', risk: 'safe', note: 'Natürliches Geliermittel' },
  'e150d': { name: 'Ammonsulfit-Zuckerkulör', risk: 'moderate', note: 'Karamellfarbstoff' },
  'e250': { name: 'Natriumnitrit', risk: 'high', note: 'Konservierungsstoff (Pökelsalz)' },
  'e950': { name: 'Acesulfam K', risk: 'moderate', note: 'Synthetischer Süßstoff' },
  'e951': { name: 'Aspartam', risk: 'moderate', note: 'Synthetischer Süßstoff' },
  'e471': { name: 'Mono- und Diglyceride von Speisefettsäuren', risk: 'moderate', note: 'Emulgator' },
  'e621': { name: 'Mononatriumglutamat', risk: 'moderate', note: 'Geschmacksverstärker' }
};

function normalizeOpenFoodFactsProduct(raw: any, barcode: string): Product {
  const normBarcode = normalizeBarcode(barcode);
  const name = raw.product_name_de || raw.product_name || raw.product_name_en || 'Produkt';
  const brand = raw.brands ? raw.brands.split(',')[0].trim() : (raw.brand_owner || 'Hersteller unbekannt');
  const category = raw.categories ? raw.categories.split(',')[0].trim() : 'Lebensmittel';
  const quantity = raw.quantity || '100g';
  const imageUrl = raw.image_front_url || raw.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
  
  let nutriScore: NutriScore = 'C';
  if (raw.nutriscore_grade) {
    const g = String(raw.nutriscore_grade).toUpperCase();
    if (['A', 'B', 'C', 'D', 'E'].includes(g)) {
      nutriScore = g as NutriScore;
    }
  }

  let novaScore: NovaScore = 2;
  if (raw.nova_group && [1, 2, 3, 4].includes(Number(raw.nova_group))) {
    novaScore = Number(raw.nova_group) as NovaScore;
  }

  const nutriments = raw.nutriments || {};
  const cals = Math.round(Number(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0));
  const fat = Number((nutriments.fat_100g ?? nutriments.fat ?? 0).toFixed(1));
  const satFat = Number((nutriments['saturated-fat_100g'] ?? nutriments['saturated-fat'] ?? 0).toFixed(1));
  const carbs = Number((nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0).toFixed(1));
  const sugar = Number((nutriments.sugars_100g ?? nutriments.sugars ?? 0).toFixed(1));
  const fiber = Number((nutriments.fiber_100g ?? nutriments.fiber ?? 0).toFixed(1));
  const protein = Number((nutriments.proteins_100g ?? nutriments.proteins ?? 0).toFixed(1));
  const salt = Number((nutriments.salt_100g ?? nutriments.salt ?? 0).toFixed(2));

  const nutritionPer100g: NutritionPer100g = {
    calories: cals,
    fat,
    saturatedFat: satFat,
    carbohydrates: carbs,
    sugars: sugar,
    fiber,
    protein,
    salt
  };

  const ingredients = raw.ingredients_text_de || raw.ingredients_text || 'Keine detaillierte Zutatenliste verfügbar';

  const additives: Additive[] = [];
  if (Array.isArray(raw.additives_tags)) {
    for (const tag of raw.additives_tags) {
      const code = tag.replace(/^en:/, '').toLowerCase();
      if (COMMON_ADDITIVES_MAP[code]) {
        const info = COMMON_ADDITIVES_MAP[code];
        additives.push({
          code: code.toUpperCase(),
          name: info.name,
          risk: info.risk,
          note: info.note
        });
      } else {
        additives.push({
          code: code.toUpperCase(),
          name: `Zusatzstoff ${code.toUpperCase()}`,
          risk: 'moderate',
          note: 'Industrieller Lebensmittelzusatz'
        });
      }
    }
  }

  const allergens: string[] = [];
  if (raw.allergens_tags && Array.isArray(raw.allergens_tags)) {
    for (const a of raw.allergens_tags) {
      const clean = a.replace(/^en:/, '').replace(/-/g, ' ');
      allergens.push(clean.charAt(0).toUpperCase() + clean.slice(1));
    }
  }

  const labels: string[] = [];
  if (raw.labels_tags && Array.isArray(raw.labels_tags)) {
    for (const l of raw.labels_tags) {
      const clean = l.replace(/^en:/, '').replace(/-/g, ' ');
      if (clean.length > 2) {
        labels.push(clean.charAt(0).toUpperCase() + clean.slice(1));
      }
    }
  }

  // Calculate Goodies score (0 - 100)
  let score = 70;
  if (nutriScore === 'A') score += 20;
  else if (nutriScore === 'B') score += 10;
  else if (nutriScore === 'D') score -= 15;
  else if (nutriScore === 'E') score -= 28;

  if (novaScore === 1) score += 10;
  else if (novaScore === 4) score -= 18;

  if (sugar > 20) score -= 15;
  else if (sugar < 5) score += 5;

  if (protein > 10) score += 6;
  if (fiber > 5) score += 5;
  if (satFat > 7) score -= 8;

  const goodiesScore = Math.max(10, Math.min(100, Math.round(score)));

  const pros: string[] = [];
  const cons: string[] = [];

  if (sugar <= 5) pros.push('Zuckerarm (< 5g / 100g)');
  if (protein >= 8) pros.push('Guter Proteingehalt');
  if (fiber >= 4) pros.push('Reich an Ballaststoffen');
  if (additives.length === 0) pros.push('Frei von E-Zusatzstoffen');

  if (sugar > 15) cons.push('Hoher Zuckeranteil');
  if (satFat > 5) cons.push('Viele gesättigte Fettsäuren');
  if (novaScore === 4) cons.push('Hochgradig ultra-verarbeitet (NOVA 4)');
  if (additives.length > 3) cons.push(`${additives.length} Zusatzstoffe enthalten`);

  let healthVerdict = 'Ausgewogenes Produkt für den täglichen Bedarf.';
  if (goodiesScore >= 85) healthVerdict = 'Ausgezeichnete Nährstoffdichte und sehr empfehlenswerte Zusammensetzung.';
  else if (goodiesScore < 45) healthVerdict = 'Eher sparsam genießen aufgrund von Verarbeitungsgrad oder Zuckergehalt.';

  const now = new Date().toISOString();

  return {
    id: `prod_${normBarcode}`,
    barcode: normBarcode,
    name,
    brand,
    category,
    quantity,
    imageUrl,
    imageFront: raw.image_front_url || imageUrl,
    imageBack: raw.image_back_url,
    imageIngredients: raw.image_ingredients_url,
    imageNutrition: raw.image_nutrition_url,
    goodiesScore,
    goodieScore: goodiesScore,
    nutriScore,
    nutriscore: nutriScore,
    novaScore,
    nutritionPer100g,
    calories: cals,
    fat,
    saturatedFat: satFat,
    carbs,
    sugar,
    protein,
    fiber,
    salt,
    servingSize: raw.serving_size || quantity,
    ingredients,
    additives,
    allergens,
    labels,
    pros: pros.length > 0 ? pros : ['Ausgewogene Nährstoffbasis'],
    cons: cons.length > 0 ? cons : ['Keine auffälligen Nachteile'],
    healthVerdict,
    verified: true,
    source: 'openfoodfacts',
    confidence: raw.nutriments && raw.ingredients_text ? 'high' : 'medium',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastVerifiedAt: now,
    dataQuality: raw.nutriments && raw.ingredients_text ? 'high' : 'medium'
  };
}

export interface ProductLookupResult {
  product: Product | null;
  source?: ProductSource;
  error?: string;
  isUnknown?: boolean;
}

/**
 * Central Product Lookup Pipeline:
 * 1. Goodies Firestore `products` (and in-memory / local cache)
 * 2. Open Food Facts Live API (persisted to Firestore on hit)
 * 3. Unknown Barcode Registry (persisted to Firestore on unknown)
 */
export async function getProductByBarcode(
  barcode: string,
  localProductsList?: Product[]
): Promise<ProductLookupResult> {
  const cleanCode = normalizeBarcode(barcode);
  if (!cleanCode) {
    return { product: null };
  }

  // 1. Primary Source: Firestore products collection & fast local cache
  // A. Quick check in memory / passed list
  const currentList = localProductsList || getCachedProducts();
  const cachedHit = findProductByBarcode(cleanCode, currentList);
  if (cachedHit) {
    return {
      product: cachedHit,
      source: cachedHit.source || 'goodies'
    };
  }

  // B. Query Firestore collection `products` directly by barcode
  try {
    const q = query(
      collection(db, 'products'),
      where('barcode', '==', cleanCode),
      limit(1)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docData = snap.docs[0].data() as Partial<Product>;
      if (docData.status !== 'archived') {
        const found = enrichProductFields(docData, cleanCode);
        // Add to cache
        updateProductsCache([found, ...memoryProductsCache.filter(p => p.id !== found.id)]);
        return {
          product: found,
          source: found.source || 'goodies'
        };
      }
    }
  } catch (err) {
    console.warn('Firestore barcode lookup notice, falling back to external API:', err);
  }

  // 2. Secondary Source: Open Food Facts API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const offUrl = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`;
    const response = await fetch(offUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GoodiesApp/1.0 (info@goodies.app)'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && (data.status === 1 || data.status_verbose === 'product found') && data.product) {
        const normalized = normalizeOpenFoodFactsProduct(data.product, cleanCode);
        
        // Cache/import directly to Firestore products collection
        try {
          const docRef = doc(db, 'products', normalized.id);
          await setDoc(docRef, cleanForFirestore(normalized), { merge: true });
        } catch (dbErr) {
          console.warn('Could not cache OFF product to Firestore:', dbErr);
        }

        // Cache locally for instant subsequent lookups
        updateProductsCache([normalized, ...memoryProductsCache.filter(p => p.id !== normalized.id)]);

        return {
          product: normalized,
          source: 'openfoodfacts'
        };
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('Open Food Facts request timed out');
      return {
        product: null,
        error: 'timeout'
      };
    }
    console.warn('Open Food Facts lookup error:', err);
  }

  // 3. Unknown Barcode - Register in Firestore & local registry
  await reportUnknownBarcode(cleanCode);

  return {
    product: null,
    isUnknown: true
  };
}

/**
 * Better alternatives calculation
 */
export function getBetterAlternatives(currentProduct: Product, allProducts: Product[]): Product[] {
  if (currentProduct.betterAlternatives && currentProduct.betterAlternatives.length > 0) {
    const found = allProducts.filter(p => 
      currentProduct.betterAlternatives?.includes(p.id) || 
      currentProduct.betterAlternatives?.includes(p.barcode)
    );
    if (found.length > 0) return found;
  }

  return allProducts
    .filter(p => p.id !== currentProduct.id && p.goodiesScore > currentProduct.goodiesScore)
    .sort((a, b) => b.goodiesScore - a.goodiesScore)
    .slice(0, 3);
}

export interface MatchCalculation {
  score: number; // 0-100%
  verdict: 'Hervorragend' | 'Gut' | 'Mäßig' | 'Nicht empfohlen';
  warnings: string[];
  reasons: string[];
}

export function calculateGoodiesMatch(product: Product, user: UserProfile): MatchCalculation {
  let score = 100;
  const warnings: string[] = [];
  const reasons: string[] = [];

  // Check Allergens
  if (user.allergies && user.allergies.length > 0) {
    for (const allergy of user.allergies) {
      const allergenMatch = product.allergens.some(a => 
        a.toLowerCase().includes(allergy.toLowerCase())
      ) || product.ingredients.toLowerCase().includes(allergy.toLowerCase());

      if (allergenMatch) {
        score -= 40;
        warnings.push(`Enthält dein Allergen: ${allergy}`);
      }
    }
  }

  // Check Excluded Ingredients
  const excluded = user.excludedIngredients || [];
  if (excluded.length > 0) {
    for (const ex of excluded) {
      const exLower = ex.toLowerCase();
      const inIngredients = product.ingredients.toLowerCase().includes(exLower);
      const inAdditives = product.additives.some(a => a.name.toLowerCase().includes(exLower) || a.code.toLowerCase().includes(exLower));
      const inLabels = product.labels.some(l => l.toLowerCase().includes(exLower));

      if (inIngredients || inAdditives || inLabels) {
        score -= 35;
        warnings.push(`Auf deiner Ausschlussliste: ${ex}`);
      }
    }
  }

  // Check Diet
  if (user.diet === 'Vegan') {
    const isVegan = product.labels.includes('Vegan') || 
      (!product.allergens.some(a => a.toLowerCase().includes('milch') || a.toLowerCase().includes('ei')));
    if (!isVegan) {
      score -= 50;
      warnings.push('Nicht vegan zertifiziert oder enthält tierische Bestandteile');
    } else {
      reasons.push('Passt perfekt zu deiner veganen Ernährung');
    }
  } else if (user.diet === 'Vegetarisch') {
    const isVeg = product.labels.includes('Vegetarisch') || product.labels.includes('Vegan');
    if (isVeg) {
      reasons.push('Vegetarierfreundlich');
    }
  }

  // Priorities
  if (user.priorities?.includes('Weniger Zucker')) {
    if (product.nutritionPer100g.sugars > 15) {
      score -= 20;
      warnings.push(`Viel Zucker (${product.nutritionPer100g.sugars}g / 100g) – Ziel: Weniger Zucker`);
    } else if (product.nutritionPer100g.sugars <= 5) {
      score += 10;
      reasons.push('Sehr zuckerarm – perfekt für dein Ziel');
    }
  }

  if (user.priorities?.includes('Mehr Eiweiß')) {
    if (product.nutritionPer100g.protein >= 10) {
      score += 15;
      reasons.push(`Hoher Eiweißgehalt (${product.nutritionPer100g.protein}g / 100g)`);
    }
  }

  // Salt evaluation
  const saltVal = product.nutritionPer100g?.salt ?? product.salt ?? 0;
  if (saltVal > 1.5) {
    score -= 15;
    warnings.push(`Hoher Salzgehalt (${saltVal}g / 100g)`);
  } else if (saltVal > 1.0) {
    score -= 8;
    warnings.push(`Erhöhter Salzgehalt (${saltVal}g / 100g)`);
  } else if (saltVal <= 0.3 && saltVal > 0) {
    score += 5;
    reasons.push('Sehr salzarm');
  }

  const finalScore = Math.max(10, Math.min(100, Math.round(score)));
  let verdict: MatchCalculation['verdict'] = 'Gut';
  if (finalScore >= 85) verdict = 'Hervorragend';
  else if (finalScore >= 70) verdict = 'Gut';
  else if (finalScore >= 45) verdict = 'Mäßig';
  else verdict = 'Nicht empfohlen';

  return {
    score: finalScore,
    verdict,
    warnings,
    reasons
  };
}
