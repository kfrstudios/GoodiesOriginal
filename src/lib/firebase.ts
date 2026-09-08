import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: appletConfig.apiKey,
  authDomain: appletConfig.authDomain,
  projectId: appletConfig.projectId,
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId,
  appId: appletConfig.appId
};

export const app: FirebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

export const auth: Auth = getAuth(app);

// Connect to the shared default Firestore database (default) matching GOODIES-2
export const firestoreDatabaseId = appletConfig.firestoreDatabaseId || '(default)';

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (err) {
  try {
    firestoreInstance = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      experimentalForceLongPolling: true
    });
  } catch {
    firestoreInstance = getFirestore(app);
  }
}
export const db: Firestore = firestoreInstance;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey && 
    !firebaseConfig.apiKey.includes('Dummy') && 
    firebaseConfig.projectId === 'goodies-food-scanner'
  );
}
