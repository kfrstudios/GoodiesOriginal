import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  sendPasswordResetEmail, 
  deleteUser, 
  onAuthStateChanged, 
  User as FirebaseUser,
  Auth,
  getAdditionalUserInfo
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection,
  getDocs,
  Firestore,
  serverTimestamp
} from 'firebase/firestore';
import { 
  UserProfile, 
  SubscriptionTier, 
  UserRole,
  ScanHistoryItem,
  ShoppingList,
  MealLogItem,
  CustomFoodItem,
  AppReportItem
} from '../types';
import { auth, db, app, firebaseConfig } from '../lib/firebase';
import { getTodayCalendarDate } from './entitlements';

export { auth, db, app, firebaseConfig };

/**
 * Strips undefined values recursively from objects before writing to Firestore
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data));
}

export interface AuthSessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string;
  isNewUser?: boolean;
}

export function isConfiguredWithValidKey(): boolean {
  const key = firebaseConfig.apiKey;
  return Boolean(key && !key.includes('Dummy') && key.length > 20);
}

/**
 * German user-friendly error translations for Firebase Authentication
 */
export function getAuthErrorMessage(error: any): string {
  if (!error) return 'Ein unbekannter Fehler ist aufgetreten.';
  const code = error.code || '';
  const msg = error.message || '';

  if (code.includes('api-key-not-valid') || msg.includes('api-key-not-valid') || code.includes('invalid-api-key')) {
    return 'Der Firebase API-Schlüssel ist noch nicht eingerichtet oder ungültig.';
  }

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Diese E-Mail-Adresse ist bereits registriert.';
    case 'auth/invalid-email':
      return 'Bitte überprüfe deine E-Mail-Adresse.';
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'E-Mail oder Passwort ist nicht korrekt.';
    case 'auth/weak-password':
      return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
    case 'auth/user-disabled':
      return 'Dieses Benutzerkonto wurde vorübergehend deaktiviert.';
    case 'auth/popup-closed-by-user':
      return 'Das Anmeldefenster wurde geschlossen.';
    case 'auth/popup-blocked':
      return 'Das Anmeldefenster wurde vom Browser blockiert. Bitte erlaube Popups für diese Seite.';
    case 'auth/operation-not-allowed':
      return 'Diese Anmeldemethode muss in der Firebase Console unter Authentication -> Sign-in method aktiviert werden.';
    case 'auth/unauthorized-domain':
      return 'Die Domain dieser App muss in der Firebase Console unter Authentication -> Einstellungen -> Autorisierte Domains hinzugefügt werden.';
    case 'auth/account-exists-with-different-credential':
      return 'Ein Konto mit dieser E-Mail existiert bereits mit einer anderen Anmeldemethode.';
    case 'auth/requires-recent-login':
      return 'Bitte melde dich erneut an, um diese Sicherheitsaktion durchzuführen.';
    case 'auth/too-many-requests':
      return 'Zu viele Fehlversuche. Bitte warte einen Moment und versuche es erneut.';
    default:
      if (msg.includes('network')) {
        return 'Netzwerkfehler: Bitte überprüfe deine Internetverbindung.';
      }
      return msg || 'Ein Fehler bei der Authentifizierung ist aufgetreten.';
  }
}

/**
 * Register with Email and Password
 */
export async function registerWithEmail(email: string, pass: string): Promise<AuthSessionUser> {
  const cleanEmail = email.trim();
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  return {
    uid: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName || 'Goodies User',
    photoURL: cred.user.photoURL,
    providerId: 'password',
    isNewUser: true
  };
}

/**
 * Sign in with Email and Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<AuthSessionUser> {
  const cleanEmail = email.trim();
  const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  return {
    uid: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName || 'Goodies User',
    photoURL: cred.user.photoURL,
    providerId: 'password',
    isNewUser: false
  };
}

/**
 * Sign in with Google (Firebase GoogleAuthProvider)
 */
export async function loginWithGoogle(): Promise<AuthSessionUser> {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const addInfo = getAdditionalUserInfo(cred);
  return {
    uid: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName || 'Goodies User',
    photoURL: cred.user.photoURL,
    providerId: 'google.com',
    isNewUser: Boolean(addInfo?.isNewUser)
  };
}

/**
 * Sign in with Apple (vorerst nicht implementiert laut Anforderung)
 */
export async function loginWithApple(): Promise<AuthSessionUser> {
  throw new Error('Apple Sign-In ist für dieses Projekt vorerst noch nicht aktiviert. Bitte nutze E-Mail/Passwort oder Google Login.');
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Sign out current Firebase user
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Delete currently logged in user account
 */
export async function deleteCurrentAccount(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Kein Benutzer angemeldet.');
  
  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    await deleteDoc(userDocRef);
  } catch (err) {
    console.warn('Could not delete firestore user document:', err);
  }
  
  await deleteUser(currentUser);
}

export interface LoadUserDocOptions {
  isExplicitNewRegistration?: boolean;
  initialDefaults?: Partial<UserProfile>;
}

/**
 * Load or initialize user document in Firestore: users/{uid}
 * Idempotent: Does NOT overwrite existing user data when user profile already exists.
 * Does NOT create an empty profile on login if document is missing, unless explicitly verified as new registration.
 */
export async function loadOrCreateUserDoc(
  firebaseUser: FirebaseUser | AuthSessionUser,
  options?: LoadUserDocOptions
): Promise<UserProfile> {
  const uid = firebaseUser.uid;
  const localPartitionKey = `goodies_user_doc_${uid}`;
  const now = new Date().toISOString();
  const userDocRef = doc(db, 'users', uid);

  let snap;
  try {
    snap = await getDoc(userDocRef);
  } catch (err: any) {
    console.warn('Firestore fetch user notice, checking local cache:', err);
    try {
      const localSaved = localStorage.getItem(localPartitionKey);
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (parsed && parsed.uid === uid) {
          return parsed;
        }
      }
    } catch {}

    const isNetworkUnavailable = 
      err?.code === 'unavailable' || 
      err?.message?.includes('unavailable') || 
      err?.message?.includes('network') ||
      err?.message?.includes('Internet connection') ||
      (typeof navigator !== 'undefined' && !navigator.onLine);

    if (isNetworkUnavailable) {
      console.warn(`Firestore offline/unavailable für UID "${uid}". Verwende Offline-Sitzung.`);
      const offlineFallback: UserProfile = {
        id: uid,
        uid: uid,
        name: firebaseUser.displayName || 'Goodies User',
        displayName: firebaseUser.displayName || 'Goodies User',
        email: firebaseUser.email || '',
        role: (firebaseUser.email === 'kiwie6868@gmail.com' || firebaseUser.email === 'admin@goodies.app') ? 'ADMIN' : 'USER',
        photoURL: firebaseUser.photoURL || undefined,
        authProvider: firebaseUser.providerId || 'password',
        diet: 'Allesesser',
        allergies: [],
        excludedIngredients: ['Palmöl'],
        priorities: ['Weniger Zucker', 'Mehr Eiweiß'],
        isPro: false,
        subscriptionTier: 'FREE',
        onboardingCompleted: true,
        createdAt: now,
        updatedAt: now,
        dailyScanCount: 0,
        dailyScanDate: getTodayCalendarDate(),
        dailyGoals: {
          calories: 2150,
          protein: 110,
          carbs: 230,
          fat: 65,
          water: 2500,
          maxSugar: 35,
          maxSalt: 5,
        }
      };
      return offlineFallback;
    }

    // Do NOT fall through to create a new user profile on fetch failure!
    throw new Error(
      `Verbindungsfehler beim Laden des Profils für Benutzer "${uid}": ${(err as any)?.message || 'Bitte prüfe deine Internetverbindung.'}`
    );
  }

  // 1. Existing user document found: Load faithfully without modifying role or tier
  if (snap.exists()) {
    const data = snap.data();
    // Non-destructive update of lastLoginAt (safely ignore errors)
    updateDoc(userDocRef, {
      lastLoginAt: now,
      updatedAt: now
    }).catch(() => {});

    const userRole: UserRole = data.role === 'ADMIN' || data.email === 'kiwie6868@gmail.com' || data.email === 'admin@goodies.app'
      ? 'ADMIN'
      : 'USER';

    const rawTier = data.subscriptionTier || (data.tier === 'pro' ? 'PRO' : 'FREE') || 'FREE';
    const subscriptionTier: SubscriptionTier = rawTier === 'PRO' ? 'PRO' : 'FREE';

    const today = getTodayCalendarDate();
    const isToday = data.dailyScanDate === today;
    let dailyScanCount = isToday && typeof data.dailyScanCount === 'number' ? data.dailyScanCount : 0;
    let dailyScanDate = isToday ? data.dailyScanDate : today;

    // Check local partition in case of un-synced scan today
    try {
      const localSaved = localStorage.getItem(localPartitionKey);
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (parsed && parsed.dailyScanDate === today && typeof parsed.dailyScanCount === 'number') {
          if (parsed.dailyScanCount > dailyScanCount) {
            dailyScanCount = parsed.dailyScanCount;
          }
        }
      }
    } catch {}

    const profile: UserProfile = {
      id: uid,
      uid: uid,
      name: data.displayName || data.name || firebaseUser.displayName || 'Goodies User',
      displayName: data.displayName || firebaseUser.displayName || 'Goodies User',
      email: data.email || firebaseUser.email || '',
      role: userRole,
      photoURL: data.photoURL || firebaseUser.photoURL || undefined,
      authProvider: data.provider || data.authProvider || firebaseUser.providerId || 'password',
      diet: data.profile?.diet || data.diet || 'Allesesser',
      allergies: data.profile?.allergies || data.allergies || [],
      excludedIngredients: data.preferences?.excludedIngredients || data.excludedIngredients || ['Palmöl'],
      priorities: data.preferences?.priorities || data.priorities || ['Weniger Zucker', 'Mehr Eiweiß'],
      gender: data.profile?.gender || data.gender,
      age: data.profile?.age || data.age,
      heightCm: data.profile?.heightCm || data.heightCm,
      weightKg: data.profile?.weightKg || data.weightKg,
      activityLevel: data.profile?.activityLevel || data.activityLevel,
      healthGoal: data.profile?.healthGoal || data.healthGoal,
      isPro: subscriptionTier === 'PRO',
      subscriptionTier,
      onboardingCompleted: Boolean(data.onboardingCompleted),
      createdAt: data.createdAt || now,
      updatedAt: now,
      lastLoginAt: now,
      dailyScanCount,
      dailyScanDate,
      lastScanTimestamp: data.lastScanTimestamp || Date.now(),
      dailyGoals: data.dailyGoals || {
        calories: 2150,
        protein: 110,
        carbs: 230,
        fat: 65,
        water: 2500,
        maxSugar: 35,
        maxSalt: 5,
      }
    };

    try {
      localStorage.setItem(localPartitionKey, JSON.stringify(profile));
    } catch {}

    return profile;
  }

  // 2. Document does not exist in Firestore:
  // Strictly verify whether this is a legitimate, verified first-time registration.
  if (!options?.isExplicitNewRegistration) {
    // Check if local cache has an existing verified profile for this exact UID
    try {
      const localSaved = localStorage.getItem(localPartitionKey);
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (parsed && parsed.uid === uid) {
          console.warn(`Verwende lokales Cache-Profil für UID "${uid}", da Firestore-Dokument fehlt.`);
          return parsed;
        }
      }
    } catch {}

    // No document in Cloud and NOT an explicit new registration:
    // Strictly FORBIDDEN to create a new empty profile automatically!
    throw new Error(
      `Kein Benutzerprofil für dieses Konto in der Datenbank gefunden (UID: ${uid}). ` +
      `Zum Schutz bestehender Kontodaten wurde kein neues Profil angelegt. ` +
      `Bitte prüfe deine Internetverbindung oder wende dich an den Support.`
    );
  }

  // 3. Verified legitimate first-time user registration:
  const newRole: UserRole = (firebaseUser.email === 'kiwie6868@gmail.com' || firebaseUser.email === 'admin@goodies.app') 
    ? 'ADMIN' 
    : 'USER';

  const newUser: UserProfile = {
    id: uid,
    uid: uid,
    name: firebaseUser.displayName || 'Goodies User',
    displayName: firebaseUser.displayName || 'Goodies User',
    email: firebaseUser.email || '',
    role: newRole,
    photoURL: firebaseUser.photoURL || undefined,
    authProvider: firebaseUser.providerId || 'password',
    diet: options?.initialDefaults?.diet || 'Allesesser',
    allergies: options?.initialDefaults?.allergies || [],
    excludedIngredients: options?.initialDefaults?.excludedIngredients || ['Palmöl'],
    priorities: options?.initialDefaults?.priorities || ['Weniger Zucker', 'Mehr Eiweiß'],
    gender: options?.initialDefaults?.gender,
    age: options?.initialDefaults?.age,
    heightCm: options?.initialDefaults?.heightCm,
    weightKg: options?.initialDefaults?.weightKg,
    activityLevel: options?.initialDefaults?.activityLevel,
    healthGoal: options?.initialDefaults?.healthGoal,
    isPro: false,
    subscriptionTier: 'FREE',
    onboardingCompleted: Boolean(options?.initialDefaults?.onboardingCompleted),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    dailyScanCount: 0,
    dailyScanDate: getTodayCalendarDate(),
    lastScanTimestamp: Date.now(),
    dailyGoals: options?.initialDefaults?.dailyGoals || {
      calories: 2150,
      protein: 110,
      carbs: 230,
      fat: 65,
      water: 2500,
      maxSugar: 35,
      maxSalt: 5,
    }
  };

  try {
    await setDoc(userDocRef, cleanForFirestore({
      uid: newUser.uid,
      email: newUser.email,
      displayName: newUser.displayName,
      photoURL: newUser.photoURL || null,
      provider: newUser.authProvider,
      role: newUser.role,
      tier: 'free',
      subscriptionTier: 'FREE',
      createdAt: now,
      updatedAt: now,
      onboardingCompleted: newUser.onboardingCompleted,
      dailyScanCount: 0,
      dailyScanDate: getTodayCalendarDate(),
      lastScanTimestamp: Date.now(),
      profile: {
        diet: newUser.diet,
        allergies: newUser.allergies,
        gender: newUser.gender || null,
        age: newUser.age || null,
        heightCm: newUser.heightCm || null,
        weightKg: newUser.weightKg || null,
        activityLevel: newUser.activityLevel || null,
        healthGoal: newUser.healthGoal || null
      },
      preferences: {
        excludedIngredients: newUser.excludedIngredients,
        priorities: newUser.priorities
      },
      dailyGoals: newUser.dailyGoals
    }));
  } catch (err) {
    console.warn('Could not write new user doc to Firestore:', err);
    throw new Error(`Fehler beim Anlegen des Profils: ${(err as any)?.message || 'Datenbank-Schreibfehler'}`);
  }

  try {
    localStorage.setItem(localPartitionKey, JSON.stringify(newUser));
  } catch {}

  return newUser;
}

/**
 * Save updated user profile to Firestore users/{uid} and local partition
 * Uses updateDoc to strictly preserve tier, role and existing document existence.
 */
export async function saveUserDoc(profile: UserProfile): Promise<void> {
  const uid = profile.uid || profile.id;
  if (!uid) return;

  const localPartitionKey = `goodies_user_doc_${uid}`;
  const now = new Date().toISOString();

  try {
    localStorage.setItem(localPartitionKey, JSON.stringify(profile));
  } catch {}

  try {
    const userDocRef = doc(db, 'users', uid);
    const updatePayload: Record<string, any> = {
      uid,
      updatedAt: now,
      displayName: profile.displayName || profile.name,
      photoURL: profile.photoURL || null,
      onboardingCompleted: profile.onboardingCompleted,
      dailyScanCount: typeof profile.dailyScanCount === 'number' ? profile.dailyScanCount : 0,
      dailyScanDate: profile.dailyScanDate || getTodayCalendarDate(),
      lastScanTimestamp: profile.lastScanTimestamp || Date.now(),
      profile: {
        diet: profile.diet,
        allergies: profile.allergies,
        gender: profile.gender || null,
        age: profile.age || null,
        heightCm: profile.heightCm || null,
        weightKg: profile.weightKg || null,
        activityLevel: profile.activityLevel || null,
        healthGoal: profile.healthGoal || null
      },
      preferences: {
        excludedIngredients: profile.excludedIngredients,
        priorities: profile.priorities || []
      },
      dailyGoals: profile.dailyGoals
    };

    // updateDoc ensures that if the document does not exist, it will NOT create an empty one.
    // It also guarantees that tier, subscriptionTier, and role cannot be modified by client updates.
    await updateDoc(userDocRef, cleanForFirestore(updatePayload));
  } catch (err) {
    console.warn('Firestore user update notice:', err);
  }
}

/**
 * Admin User Management: Fetch all registered users from Firestore
 */
export async function getAllUsersFromFirestore(): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users: UserProfile[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const uid = docSnap.id;
      const userRole: UserRole = data.role === 'ADMIN' || data.email === 'kiwie6868@gmail.com' || data.email === 'admin@goodies.app' 
        ? 'ADMIN' 
        : 'USER';

      users.push({
        id: uid,
        uid: uid,
        name: data.displayName || data.name || 'Goodies User',
        displayName: data.displayName || data.name || 'Goodies User',
        email: data.email || '',
        role: userRole,
        photoURL: data.photoURL || undefined,
        authProvider: data.provider || data.authProvider || 'password',
        diet: data.profile?.diet || data.diet || 'Allesesser',
        allergies: data.profile?.allergies || data.allergies || [],
        excludedIngredients: data.preferences?.excludedIngredients || data.excludedIngredients || ['Palmöl'],
        priorities: data.preferences?.priorities || data.priorities || [],
        gender: data.profile?.gender || data.gender,
        age: data.profile?.age || data.age,
        heightCm: data.profile?.heightCm || data.heightCm,
        weightKg: data.profile?.weightKg || data.weightKg,
        activityLevel: data.profile?.activityLevel || data.activityLevel,
        healthGoal: data.profile?.healthGoal || data.healthGoal,
        isPro: (data.subscriptionTier === 'PRO' || data.tier === 'pro'),
        subscriptionTier: (data.subscriptionTier === 'PRO' ? 'PRO' : 'FREE') as SubscriptionTier,
        dailyGoals: data.dailyGoals || {
          calories: 2000,
          protein: 70,
          carbs: 230,
          fat: 65,
          fiber: 30,
          waterMl: 2500,
          maxSugarG: 50,
          maxSaltG: 6
        },
        onboardingCompleted: Boolean(data.onboardingCompleted),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        lastLoginAt: data.lastLoginAt
      });
    });

    return users.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.error('Error fetching all users from Firestore:', err);
    return [];
  }
}

/**
 * Admin User Management: Update role for a specific user
 */
export async function updateUserRoleInFirestore(uid: string, role: UserRole): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    role,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Admin User Management: Update subscription tier for a specific user
 */
export async function updateUserSubscriptionInFirestore(uid: string, tier: SubscriptionTier): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  const isPro = tier === 'PRO';
  await updateDoc(userDocRef, {
    subscriptionTier: tier,
    tier: tier.toLowerCase(),
    isPro,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Authoritative user profile fetch by UID
 */
export async function getUserProfileByUid(uid: string): Promise<UserProfile | null> {
  const localPartitionKey = `goodies_user_doc_${uid}`;
  const userDocRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const userRole: UserRole = (data.role === 'ADMIN' || data.email === 'niklas.roemer12@gmail.com')
        ? 'ADMIN'
        : 'USER';
      const profile: UserProfile = {
        id: uid,
        uid: uid,
        name: data.displayName || data.name || 'Goodies User',
        displayName: data.displayName || 'Goodies User',
        email: data.email || '',
        role: userRole,
        photoURL: data.photoURL || undefined,
        authProvider: data.provider || data.authProvider || 'password',
        diet: data.profile?.diet || data.diet || 'Allesesser',
        allergies: data.profile?.allergies || data.allergies || [],
        excludedIngredients: data.preferences?.excludedIngredients || data.excludedIngredients || ['Palmöl'],
        priorities: data.preferences?.priorities || data.priorities || ['Weniger Zucker', 'Mehr Eiweiß'],
        gender: data.profile?.gender || data.gender,
        age: data.profile?.age || data.age,
        heightCm: data.profile?.heightCm || data.heightCm,
        weightKg: data.profile?.weightKg || data.weightKg,
        activityLevel: data.profile?.activityLevel || data.activityLevel,
        healthGoal: data.profile?.healthGoal || data.healthGoal,
        isPro: (data.subscriptionTier === 'PRO' || data.tier === 'pro'),
        subscriptionTier: (data.subscriptionTier === 'PRO' ? 'PRO' : 'FREE') as SubscriptionTier,
        onboardingCompleted: Boolean(data.onboardingCompleted),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        dailyGoals: data.dailyGoals || {
          calories: 2150,
          protein: 110,
          carbs: 230,
          fat: 65,
          water: 2500,
          maxSugar: 35,
          maxSalt: 5,
        }
      };
      try {
        localStorage.setItem(localPartitionKey, JSON.stringify(profile));
      } catch {
        // ignore
      }
      return profile;
    }
  } catch (err) {
    console.warn('Error fetching user profile by uid:', err);
  }
  return null;
}

/**
 * Subcollection data sync helpers
 * users/{uid}/{collectionName}
 */
export function getLocalUserSubcollection<T>(uid: string, collectionName: string, fallback: T): T {
  try {
    const key = `goodies_user_${uid}_${collectionName}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocalUserSubcollection<T>(uid: string, collectionName: string, data: T): void {
  try {
    const key = `goodies_user_${uid}_${collectionName}`;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Could not save local user collection ${collectionName}:`, e);
  }
}

/**
 * ============================================================================
 * FIRESTORE CLOUD SUBCOLLECTION CRUD OPERATIONS
 * ============================================================================
 */

export function getTodayTrackerKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `daily_${yyyy}-${mm}-${dd}`;
}

/**
 * Resolves the numeric millisecond timestamp for a scan history item robustly.
 * Handles:
 * 1. item.timestamp (explicit number)
 * 2. item.scannedTimestamp (explicit number)
 * 3. item.scannedAt (if parseable ISO date string)
 * 4. item.createdAt (if parseable date string)
 * 5. item.addedAt (if parseable date string)
 * 6. item.id (embedded timestamp if formatted as hist_<timestamp>)
 * 7. Fallback to 0
 */
export function getScanHistoryItemTimestamp(item: ScanHistoryItem | null | undefined): number {
  if (!item) return 0;
  
  // 1. Explicit numeric timestamp property
  if (typeof item.timestamp === 'number' && !isNaN(item.timestamp) && item.timestamp > 0) {
    return item.timestamp;
  }

  // 2. Explicit scannedTimestamp property
  if (typeof (item as any).scannedTimestamp === 'number' && !isNaN((item as any).scannedTimestamp) && (item as any).scannedTimestamp > 0) {
    return (item as any).scannedTimestamp;
  }

  // 3. Parse ISO / date string in scannedAt
  if (item.scannedAt && typeof item.scannedAt === 'string') {
    const parsed = Date.parse(item.scannedAt);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // 4. Parse createdAt if present
  if (item.createdAt && typeof item.createdAt === 'string') {
    const parsed = Date.parse(item.createdAt);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // 5. Parse addedAt if present
  if ((item as any).addedAt && typeof (item as any).addedAt === 'string') {
    const parsed = Date.parse((item as any).addedAt);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // 6. Extract millisecond timestamp from ID (e.g. hist_1741390000000)
  if (item.id && typeof item.id === 'string') {
    const match = item.id.match(/^hist_(\d{10,15})/);
    if (match && match[1]) {
      let parsedId = parseInt(match[1], 10);
      if (!isNaN(parsedId) && parsedId > 0) {
        if (parsedId < 100000000000) {
          parsedId *= 1000;
        }
        return parsedId;
      }
    }
  }

  return 0;
}

/**
 * Sorts scan history items strictly newest first based on their resolved timestamp.
 */
export function sortScanHistoryNewestFirst(items: ScanHistoryItem[]): ScanHistoryItem[] {
  if (!items || items.length === 0) return [];
  return [...items].sort((a, b) => {
    const timeA = getScanHistoryItemTimestamp(a);
    const timeB = getScanHistoryItemTimestamp(b);
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return (b.id || '').localeCompare(a.id || '');
  });
}

// 1. Scan History
export async function fetchUserScanHistory(uid: string): Promise<ScanHistoryItem[]> {
  try {
    const colRef = collection(db, 'users', uid, 'scanHistory');
    const snap = await getDocs(colRef);
    const items: ScanHistoryItem[] = [];
    snap.forEach((d) => {
      items.push(d.data() as ScanHistoryItem);
    });
    // Sort strictly newest first using robust timestamp resolution
    return sortScanHistoryNewestFirst(items);
  } catch (err) {
    console.warn('Notice reading Cloud scanHistory:', err);
    return [];
  }
}

export async function saveUserScanHistoryDoc(uid: string, item: ScanHistoryItem): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'scanHistory', item.id);
    await setDoc(docRef, cleanForFirestore(item));
  } catch (err) {
    console.warn('Notice saving Cloud scanHistory doc:', err);
  }
}

export async function deleteUserScanHistoryDoc(uid: string, scanId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'scanHistory', scanId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Notice deleting Cloud scanHistory doc:', err);
  }
}

export async function clearAllUserScanHistoryDocs(uid: string, items?: ScanHistoryItem[]): Promise<void> {
  try {
    const colRef = collection(db, 'users', uid, 'scanHistory');
    const snap = await getDocs(colRef);
    const promises: Promise<void>[] = [];
    
    snap.forEach((docSnap) => {
      promises.push(deleteDoc(docSnap.ref));
    });

    // Also if specific items were provided
    if (items && items.length > 0) {
      items.forEach((item) => {
        const docRef = doc(db, 'users', uid, 'scanHistory', item.id);
        promises.push(deleteDoc(docRef).catch(() => {}));
      });
    }

    await Promise.all(promises);
  } catch (err) {
    console.warn('Notice clearing Cloud scanHistory docs:', err);
  }
}

// 2. Shopping Lists
export async function fetchUserShoppingLists(uid: string): Promise<ShoppingList[]> {
  try {
    const colRef = collection(db, 'users', uid, 'shoppingLists');
    const snap = await getDocs(colRef);
    const lists: ShoppingList[] = [];
    snap.forEach((d) => {
      lists.push(d.data() as ShoppingList);
    });
    return lists;
  } catch (err) {
    console.warn('Notice reading Cloud shoppingLists:', err);
    return [];
  }
}

export async function saveUserShoppingListDoc(uid: string, list: ShoppingList): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'shoppingLists', list.id);
    await setDoc(docRef, cleanForFirestore(list));
  } catch (err) {
    console.warn('Notice saving Cloud shoppingList doc:', err);
  }
}

export async function deleteUserShoppingListDoc(uid: string, listId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'shoppingLists', listId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Notice deleting Cloud shoppingList doc:', err);
  }
}

// 3. Favorites
export async function fetchUserFavorites(uid: string): Promise<string[]> {
  try {
    const colRef = collection(db, 'users', uid, 'favorites');
    const snap = await getDocs(colRef);
    const pids: string[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.productId) {
        pids.push(data.productId);
      } else {
        pids.push(d.id);
      }
    });
    return pids;
  } catch (err) {
    console.warn('Notice reading Cloud favorites:', err);
    return [];
  }
}

export async function addUserFavoriteDoc(uid: string, productId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'favorites', productId);
    await setDoc(docRef, cleanForFirestore({ productId, addedAt: new Date().toISOString() }));
  } catch (err) {
    console.warn('Notice adding Cloud favorite doc:', err);
  }
}

export async function removeUserFavoriteDoc(uid: string, productId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'favorites', productId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Notice removing Cloud favorite doc:', err);
  }
}

// 4. Custom Foods
export async function fetchUserCustomFoods(uid: string): Promise<CustomFoodItem[]> {
  try {
    const colRef = collection(db, 'users', uid, 'customFoods');
    const snap = await getDocs(colRef);
    const items: CustomFoodItem[] = [];
    snap.forEach((d) => {
      items.push(d.data() as CustomFoodItem);
    });
    return items;
  } catch (err) {
    console.warn('Notice reading Cloud customFoods:', err);
    return [];
  }
}

export async function saveUserCustomFoodDoc(uid: string, food: CustomFoodItem): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'customFoods', food.id);
    await setDoc(docRef, cleanForFirestore(food));
  } catch (err) {
    console.warn('Notice saving Cloud customFood doc:', err);
  }
}

export async function deleteUserCustomFoodDoc(uid: string, foodId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'customFoods', foodId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Notice deleting Cloud customFood doc:', err);
  }
}

// 5. Daily Tracker (Meals & Water)
export interface DailyTrackerDoc {
  date: string;
  waterMl: number;
  waterLogs?: {
    id: string;
    amountMl: number;
    timestamp: number;
    date: string;
  }[];
  meals: MealLogItem[];
  updatedAt?: string;
  resetWaterAt?: number;
}

export async function fetchUserDailyTracker(uid: string, dateKey: string): Promise<DailyTrackerDoc | null> {
  // Check local cache first for offline capability
  let localDoc: DailyTrackerDoc | null = null;
  try {
    const raw = localStorage.getItem(`goodies_user_${uid}_tracker_${dateKey}`);
    if (raw) {
      localDoc = JSON.parse(raw);
    }
  } catch {}

  try {
    const docRef = doc(db, 'users', uid, 'tracker', dateKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remoteData = snap.data() as DailyTrackerDoc;
      try {
        localStorage.setItem(`goodies_user_${uid}_tracker_${dateKey}`, JSON.stringify(remoteData));
      } catch {}
      return remoteData;
    }
  } catch (err) {
    console.warn('Notice reading Cloud daily tracker:', err);
  }
  return localDoc;
}

export async function fetchUserWeeklyTrackers(uid: string, dateKeys: string[]): Promise<Record<string, DailyTrackerDoc>> {
  const result: Record<string, DailyTrackerDoc> = {};
  
  // 1. Read from local cache first
  dateKeys.forEach((key) => {
    try {
      const raw = localStorage.getItem(`goodies_user_${uid}_tracker_${key}`);
      if (raw) {
        result[key] = JSON.parse(raw);
      }
    } catch {}
  });

  // 2. Concurrently fetch all days from Firestore if online
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const promises = dateKeys.map(async (key) => {
        try {
          const docRef = doc(db, 'users', uid, 'tracker', key);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as DailyTrackerDoc;
            result[key] = data;
            try {
              localStorage.setItem(`goodies_user_${uid}_tracker_${key}`, JSON.stringify(data));
            } catch {}
          }
        } catch {}
      });
      await Promise.all(promises);
    } catch (err) {
      console.warn('Notice fetching weekly trackers from Cloud:', err);
    }
  }

  return result;
}

export async function saveUserDailyTrackerDoc(
  uid: string, 
  dateKey: string, 
  trackerData: { 
    date: string; 
    waterMl: number; 
    meals: MealLogItem[];
    waterLogs?: { id: string; amountMl: number; timestamp: number; date: string }[];
    resetWaterAt?: number;
  }
): Promise<void> {
  const fullPayload: DailyTrackerDoc = {
    ...trackerData,
    updatedAt: new Date().toISOString()
  };

  // 1. Save to local cache immediately
  try {
    localStorage.setItem(`goodies_user_${uid}_tracker_${dateKey}`, JSON.stringify(fullPayload));
  } catch {}

  // 2. Save to Firestore
  try {
    const docRef = doc(db, 'users', uid, 'tracker', dateKey);
    await setDoc(docRef, cleanForFirestore(fullPayload));
  } catch (err) {
    console.warn('Notice saving Cloud daily tracker doc:', err);
  }
}

/**
 * ============================================================================
 * STRICT "INSERT-IF-MISSING" ADDITIVE MIGRATION & CLOUD SYNC
 * ============================================================================
 * Rules:
 * 1. Checks if Cloud document exists.
 * 2. If it exists: does NOT alter or overwrite Cloud version.
 * 3. If it does NOT exist: creates new document for missing local legacy items.
 * 4. Never deletes Cloud data during migration.
 * 5. Returns unified dataset and updates local cache.
 */
export async function migrateAndSyncAllUserSubcollections(
  uid: string,
  defaultInitialLists: ShoppingList[]
): Promise<{
  scanHistory: ScanHistoryItem[];
  shoppingLists: ShoppingList[];
  favorites: string[];
  todayMeals: MealLogItem[];
  waterIntakeMl: number;
  customFoods: CustomFoodItem[];
}> {
  const dateKey = getTodayTrackerKey();

  // 1. Fetch all existing Cloud subcollections
  const [cloudHistory, cloudLists, cloudFavorites, cloudCustomFoods, cloudTracker] = await Promise.all([
    fetchUserScanHistory(uid),
    fetchUserShoppingLists(uid),
    fetchUserFavorites(uid),
    fetchUserCustomFoods(uid),
    fetchUserDailyTracker(uid, dateKey)
  ]);

  // 2. Read local legacy items from current browser partition
  const localHistory = getLocalUserSubcollection<ScanHistoryItem[]>(uid, 'scanHistory', []);
  const localLists = getLocalUserSubcollection<ShoppingList[]>(uid, 'lists', []);
  const localFavorites = getLocalUserSubcollection<string[]>(uid, 'favorites', []);
  const localCustomFoods = getLocalUserSubcollection<CustomFoodItem[]>(uid, 'customFoods', []);
  const localMeals = getLocalUserSubcollection<MealLogItem[]>(uid, 'todayMeals', []);
  const localWater = getLocalUserSubcollection<number>(uid, 'waterIntakeMl', 0);

  // 3. Strict INSERT-IF-MISSING: Scan History
  const historyMap = new Map<string, ScanHistoryItem>();
  // Existing Cloud docs are primary and untouched
  cloudHistory.forEach(item => historyMap.set(item.id, item));
  
  for (const localItem of localHistory) {
    if (!historyMap.has(localItem.id)) {
      // Document does NOT exist in Cloud: strictly additive insert
      await saveUserScanHistoryDoc(uid, localItem);
      historyMap.set(localItem.id, localItem);
    }
  }
  const mergedHistory = sortScanHistoryNewestFirst(Array.from(historyMap.values()));

  // 4. Strict INSERT-IF-MISSING: Shopping Lists
  const listMap = new Map<string, ShoppingList>();
  cloudLists.forEach(l => listMap.set(l.id, l));

  for (const localList of localLists) {
    if (!listMap.has(localList.id)) {
      // Document does NOT exist in Cloud: strictly additive insert
      await saveUserShoppingListDoc(uid, localList);
      listMap.set(localList.id, localList);
    } else {
      // Document exists in Cloud: preserve Cloud items and merge any local items missing from Cloud
      const cloudList = listMap.get(localList.id)!;
      const cloudItemIds = new Set((cloudList.items || []).map(i => i.id));
      const missingLocalItems = (localList.items || []).filter(i => !cloudItemIds.has(i.id));
      if (missingLocalItems.length > 0) {
        const mergedList: ShoppingList = {
          ...cloudList,
          items: [...(cloudList.items || []), ...missingLocalItems]
        };
        await saveUserShoppingListDoc(uid, mergedList);
        listMap.set(localList.id, mergedList);
      }
    }
  }
  let mergedLists = Array.from(listMap.values());
  if (mergedLists.length === 0) {
    // If user has zero lists in Cloud and zero locally, provision initial default list
    for (const dList of defaultInitialLists) {
      await saveUserShoppingListDoc(uid, dList);
      listMap.set(dList.id, dList);
    }
    mergedLists = Array.from(listMap.values());
  }

  // 5. Strict INSERT-IF-MISSING: Favorites
  const favSet = new Set<string>(cloudFavorites);
  for (const localFav of localFavorites) {
    if (!favSet.has(localFav)) {
      // Document does NOT exist in Cloud: strictly additive insert
      await addUserFavoriteDoc(uid, localFav);
      favSet.add(localFav);
    }
  }
  const mergedFavorites = Array.from(favSet);

  // 6. Strict INSERT-IF-MISSING: Custom Foods
  const foodMap = new Map<string, CustomFoodItem>();
  cloudCustomFoods.forEach(f => foodMap.set(f.id, f));

  for (const localFood of localCustomFoods) {
    if (!foodMap.has(localFood.id)) {
      // Document does NOT exist in Cloud: strictly additive insert
      await saveUserCustomFoodDoc(uid, localFood);
      foodMap.set(localFood.id, localFood);
    }
  }
  const mergedCustomFoods = Array.from(foodMap.values());

  // 7. Strict INSERT-IF-MISSING: Daily Tracker (Today)
  let mergedMeals: MealLogItem[] = [];
  let mergedWater: number = 0;

  if (cloudTracker) {
    // Cloud tracker already exists: Cloud data is preserved
    mergedWater = cloudTracker.waterMl ?? 0;
    const existingMealIds = new Set(cloudTracker.meals.map(m => m.id));
    const missingLocalMeals = localMeals.filter(m => !existingMealIds.has(m.id));

    if (missingLocalMeals.length > 0) {
      // Add missing local meals without altering any existing cloud meal
      mergedMeals = [...cloudTracker.meals, ...missingLocalMeals];
      await saveUserDailyTrackerDoc(uid, dateKey, {
        date: cloudTracker.date,
        waterMl: mergedWater,
        meals: mergedMeals
      });
    } else {
      mergedMeals = cloudTracker.meals;
    }
  } else {
    // Cloud tracker does NOT exist yet for today
    mergedMeals = localMeals;
    mergedWater = localWater;
    const todayDateStr = dateKey.replace('daily_', '');
    await saveUserDailyTrackerDoc(uid, dateKey, {
      date: todayDateStr,
      waterMl: mergedWater,
      meals: mergedMeals
    });
  }

  // 8. Update local cache / offline fallback
  saveLocalUserSubcollection(uid, 'scanHistory', mergedHistory);
  saveLocalUserSubcollection(uid, 'lists', mergedLists);
  saveLocalUserSubcollection(uid, 'favorites', mergedFavorites);
  saveLocalUserSubcollection(uid, 'customFoods', mergedCustomFoods);
  saveLocalUserSubcollection(uid, 'todayMeals', mergedMeals);
  saveLocalUserSubcollection(uid, 'waterIntakeMl', mergedWater);

  return {
    scanHistory: mergedHistory,
    shoppingLists: mergedLists,
    favorites: mergedFavorites,
    todayMeals: mergedMeals,
    waterIntakeMl: mergedWater,
    customFoods: mergedCustomFoods
  };
}

// 9. App Reports & Bug Reporting
export async function saveAppReportToFirestore(report: AppReportItem): Promise<void> {
  try {
    const docId = `rep_${report.id}`;
    const docRef = doc(db, 'unknown_barcodes', docId);
    await setDoc(docRef, cleanForFirestore({
      barcode: report.productBarcode || 'APP_BUG',
      isAppReport: true,
      reportType: report.type,
      reason: report.reason,
      details: report.details || '',
      productId: report.productId || '',
      productName: report.productName || '',
      productBrand: report.productBrand || '',
      reportedBy: report.reportedBy || 'Anonym',
      reportedAt: report.reportedAt,
      status: report.status,
      lastSeenAt: new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Notice saving report to Firestore:', err);
  }
}

export async function fetchAppReportsFromFirestore(): Promise<AppReportItem[]> {
  try {
    const colRef = collection(db, 'unknown_barcodes');
    const snap = await getDocs(colRef);
    const list: AppReportItem[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.isAppReport || docSnap.id.startsWith('rep_')) {
        list.push({
          id: docSnap.id.replace(/^rep_/, ''),
          type: data.reportType === 'bug' ? 'bug' : 'product',
          reason: data.reason || 'Meldung',
          details: data.details || '',
          productId: data.productId || undefined,
          productName: data.productName || undefined,
          productBrand: data.productBrand || undefined,
          productBarcode: data.barcode !== 'APP_BUG' ? data.barcode : undefined,
          reportedBy: data.reportedBy || 'Nutzer',
          reportedAt: data.reportedAt || new Date().toLocaleString('de-DE'),
          status: data.status === 'resolved' ? 'resolved' : 'open'
        });
      }
    });
    return list;
  } catch (err) {
    console.warn('Notice reading reports from Firestore:', err);
    return [];
  }
}

export async function updateAppReportStatusInFirestore(reportId: string, status: 'pending' | 'in_review' | 'resolved' | 'open'): Promise<void> {
  try {
    const docId = `rep_${reportId}`;
    const docRef = doc(db, 'unknown_barcodes', docId);
    await updateDoc(docRef, { status });
  } catch (err) {
    console.warn('Notice updating report status:', err);
  }
}

export async function deleteAppReportFromFirestore(reportId: string): Promise<void> {
  try {
    const docId = `rep_${reportId}`;
    const docRef = doc(db, 'unknown_barcodes', docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Notice deleting report from Firestore:', err);
  }
}

