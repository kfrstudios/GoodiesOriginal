import { FeatureKey, FeatureLimitKey, PaywallContext, SubscriptionTier } from '../types';

/**
 * CENTRAL ENTITLEMENT & FEATURE CONFIGURATION
 */
export const FREE_LIMITS = {
  dailyScans: 5,
  shoppingLists: 1,
  historyItems: 20,
} as const;

export const PRO_LIMITS = {
  dailyScans: Infinity,
  shoppingLists: Infinity,
  historyItems: Infinity,
} as const;

/**
 * Date helper to get today's calendar string in YYYY-MM-DD
 */
export function getTodayCalendarDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check whether a feature is permitted for a subscription tier
 */
export function checkHasFeature(feature: FeatureKey, tier: SubscriptionTier): boolean {
  if (tier === 'PRO') {
    return true;
  }

  // FREE tier allowed features
  switch (feature) {
    case 'water_tracker':
    case 'favorites':
      return true;
    case 'unlimited_scans':
    case 'unlimited_lists':
    case 'unlimited_history':
    case 'smart_list_analysis':
    case 'meal_logging':
    case 'mealLogging':
    case 'nutrition_goals':
    case 'exclusion_list':
    case 'goodies_match':
    case 'personalMatch':
    case 'advanced_product_analysis':
    case 'ai_explanation':
    case 'better_alternatives_all':
    case 'unlimitedAlternatives':
    case 'product_comparison':
    case 'weekly_analysis':
      return false;
    default:
      return false;
  }
}

/**
 * Get numeric limit for a given feature limit key
 */
export function checkFeatureLimit(limitKey: FeatureLimitKey, tier: SubscriptionTier): number {
  if (tier === 'PRO') {
    return Infinity;
  }

  switch (limitKey) {
    case 'daily_scans':
    case 'dailyScans':
      return FREE_LIMITS.dailyScans;
    case 'shopping_lists':
    case 'shoppingLists':
      return FREE_LIMITS.shoppingLists;
    case 'history_items':
    case 'historyItems':
      return FREE_LIMITS.historyItems;
    default:
      return Infinity;
  }
}

/**
 * Check whether user can perform another scan today
 */
export function canPerformDailyScan(
  currentScanCountToday: number,
  tier: SubscriptionTier
): { allowed: boolean; remaining: number; limit: number } {
  if (tier === 'PRO') {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  const limit = FREE_LIMITS.dailyScans;
  const remaining = Math.max(0, limit - currentScanCountToday);
  const allowed = currentScanCountToday < limit;

  return { allowed, remaining, limit };
}

/**
 * Check whether user can create a shopping list
 */
export function canCreateShoppingList(
  currentListCount: number,
  tier: SubscriptionTier
): { allowed: boolean; limit: number } {
  if (tier === 'PRO') {
    return { allowed: true, limit: Infinity };
  }

  const limit = FREE_LIMITS.shoppingLists;
  const allowed = currentListCount < limit;

  return { allowed, limit };
}

/**
 * Supporter pricing options (Preview voluntary support simulation: 10€ - 40€)
 */
export interface SupporterOption {
  amountEur: number;
  label: string;
  isPopular?: boolean;
  desc: string;
}

export const SUPPORTER_OPTIONS: SupporterOption[] = [
  { amountEur: 10, label: '10 € / Monat', desc: 'Goodies Starter-Unterstützer' },
  { amountEur: 15, label: '15 € / Monat', desc: 'Regelmäßiger Unterstützer' },
  { amountEur: 20, label: '20 € / Monat', isPopular: true, desc: 'Empfohlen & Beliebt' },
  { amountEur: 25, label: '25 € / Monat', desc: 'Starker Förderer' },
  { amountEur: 30, label: '30 € / Monat', desc: 'Großzügiger Unterstützer' },
  { amountEur: 40, label: '40 € / Monat', desc: 'Champion & Ehrenförderer' },
];

/**
 * Paywall context copy and styling metadata
 */
export interface PaywallContextData {
  context: PaywallContext;
  badge: string;
  title: string;
  subtitle: string;
  specificMessage: string;
  highlightIcon: string; // lucide icon identifier
}

export const PAYWALL_CONTEXT_MAP: Record<PaywallContext, PaywallContextData> = {
  scans: {
    context: 'scans',
    badge: 'Tageslimit erreicht',
    title: 'Scan-Limit erreicht',
    subtitle: '5 kostenlose Scans pro Tag genutzt',
    specificMessage: 'Du hast deine 5 kostenlosen Scans für heute genutzt. Mit Goodies PRO kannst du unbegrenzt scannen und jedes Produkt im Supermarkt prüfen.',
    highlightIcon: 'ScanLine'
  },
  lists: {
    context: 'lists',
    badge: 'Listen-Limit',
    title: 'Einkaufslisten-Limit',
    subtitle: 'Im Free-Plan ist 1 Einkaufsliste enthalten',
    specificMessage: 'Mit Goodies PRO kannst du unbegrenzt viele Listen für Wochenmarkt, Drogerie, Party oder Vorräte anlegen und verwalten.',
    highlightIcon: 'ListChecks'
  },
  history: {
    context: 'history',
    badge: 'Verlauf voll',
    title: 'Dein kostenloser Verlauf ist voll',
    subtitle: 'Maximal 20 Produkte im Free-Verlauf',
    specificMessage: 'Du hast 20 Produkte im Verlauf. Mit PRO behältst du deinen kompletten Scan-Verlauf unbegrenzt und kannst jedes Produkt jederzeit wiederfinden.',
    highlightIcon: 'History'
  },
  smart_list_analysis: {
    context: 'smart_list_analysis',
    badge: 'PRO Feature',
    title: 'Intelligente Listenanalyse',
    subtitle: 'Nährwert- & Gesundheits-Check deines Einkaufs',
    specificMessage: 'Goodies analysiert deine komplette Einkaufsliste und zeigt dir Durchschnitts-Score, Passung zu deinen Zielen und konkrete Verbesserungsvorschläge für deinen Warenkorb.',
    highlightIcon: 'Sparkles'
  },
  meal_logging: {
    context: 'meal_logging',
    badge: 'PRO Feature',
    title: 'Mahlzeiten-Tracking ist PRO',
    subtitle: 'Erfasse Frühstück, Mittag, Abendessen & Snacks',
    specificMessage: 'Halte deine Mahlzeiten mühelos fest. Goodies berechnet Kalorien und Makronährstoffe passgenau für deine täglichen Ernährungsziele.',
    highlightIcon: 'Apple'
  },
  meal_log: {
    context: 'meal_log',
    badge: 'PRO Feature',
    title: 'Mahlzeiten-Tracking ist PRO',
    subtitle: 'Erfasse Frühstück, Mittag, Abendessen & Snacks',
    specificMessage: 'Halte deine Mahlzeiten mühelos fest. Goodies berechnet Kalorien und Makronährstoffe passgenau für deine täglichen Ernährungsziele.',
    highlightIcon: 'Apple'
  },
  nutrition_goals: {
    context: 'nutrition_goals',
    badge: 'PRO Feature',
    title: 'Persönliche Ernährungsziele',
    subtitle: 'Individuelle Limits für Zucker, Salz & Makros',
    specificMessage: 'Lege eigene Grenzwerte für Zucker, Salz, Kalorien und Proteine fest. Goodies warnt dich gezielt bei Produkten, die deine persönlichen Tageslimits belasten.',
    highlightIcon: 'Target'
  },
  exclusion_list: {
    context: 'exclusion_list',
    badge: 'PRO Feature',
    title: 'Persönliche Ausschlussliste',
    subtitle: 'Unerwünschte Zutaten automatisch erkennen',
    specificMessage: 'Schließe unerwünschte Zutaten wie Palmöl, künstliche Süßstoffe, Gelatine oder Konservierungsstoffe aus. Goodies warnt dich beim Scannen sofort.',
    highlightIcon: 'Ban'
  },
  goodies_match: {
    context: 'goodies_match',
    badge: 'PRO Feature',
    title: 'Dein persönlicher Goodies Match',
    subtitle: 'Individuelle Passung statt nur allgemeiner Score',
    specificMessage: 'Erfahre sofort, wie gut ein Lebensmittel exakt zu deiner Ernährungsform, deinen Allergenen und deinen persönlichen Zielen passt.',
    highlightIcon: 'Sparkles'
  },
  personal_match: {
    context: 'personal_match',
    badge: 'PRO Feature',
    title: 'Dein persönlicher Goodies Match',
    subtitle: 'Individuelle Passung statt nur allgemeiner Score',
    specificMessage: 'Erfahre sofort, wie gut ein Lebensmittel exakt zu deiner Ernährungsform, deinen Allergenen und deinen persönlichen Zielen passt.',
    highlightIcon: 'Sparkles'
  },
  ai_explanation: {
    context: 'ai_explanation',
    badge: 'PRO Feature',
    title: 'Intelligente KI-Erklärung',
    subtitle: 'Ernährungswissenschaftlich verständlich erklärt',
    specificMessage: 'Erhalte klare, fundierte Erklärungen: Warum ist ein Produkt für deinen Körper vorteilhaft oder kritisch?',
    highlightIcon: 'Bot'
  },
  alternatives: {
    context: 'alternatives',
    badge: 'PRO Feature',
    title: 'Alle besseren Alternativen',
    subtitle: 'Finde gesündere Produkte im Regal',
    specificMessage: 'Entdecke bis zu 5 geprüfte, gesündere Alternativen mit höherem Score und konkreten Vorteilen für deine Gesundheit.',
    highlightIcon: 'TrendingUp'
  },
  comparison: {
    context: 'comparison',
    badge: 'PRO Feature',
    title: 'Produktvergleich',
    subtitle: 'Direkter Nährwertvergleich nebeneinander',
    specificMessage: 'Vergleiche 2 bis 3 Produkte direkt nebeneinander – von Kalorien und Zucker bis zu Zusatzstoffen und Match.',
    highlightIcon: 'Sliders'
  },
  weekly_analysis: {
    context: 'weekly_analysis',
    badge: 'PRO Feature',
    title: 'Detaillierte Wochenanalyse',
    subtitle: 'Ernährungstrends über 7 Tage',
    specificMessage: 'Verfolge deinen wöchentlichen Kalorienverlauf, Zuckertrend und deine Scan-Statistik übersichtlich im 7-Tage-Rhythmus.',
    highlightIcon: 'BarChart2'
  },
  general: {
    context: 'general',
    badge: 'Goodies PRO',
    title: 'Hol mehr aus deinen Lebensmitteln heraus',
    subtitle: 'Dein vollwertiger Ernährungsbegleiter',
    specificMessage: 'Scanne ohne Limit, analysiere deine Einkäufe persönlich und erhalte intelligente Empfehlungen für deine Gesundheit.',
    highlightIcon: 'Crown'
  }
};

/**
 * Feature comparison list for the Admin Hub & Subscription View
 */
export interface FeatureComparisonRow {
  name: string;
  freeDesc: string;
  proDesc: string;
  freeAllowed: boolean;
  proAllowed: boolean;
}

export const FEATURE_COMPARISON_MATRIX: FeatureComparisonRow[] = [
  {
    name: 'Scans pro Tag',
    freeDesc: 'Max. 5 Scans / Tag',
    proDesc: 'Unbegrenzt',
    freeAllowed: true,
    proAllowed: true,
  },
  {
    name: 'Einkaufslisten',
    freeDesc: '1 Liste',
    proDesc: 'Unbegrenzt viele Listen',
    freeAllowed: true,
    proAllowed: true,
  },
  {
    name: 'Scan-Verlauf',
    freeDesc: '20 Produkte',
    proDesc: 'Unbegrenzter Verlauf',
    freeAllowed: true,
    proAllowed: true,
  },
  {
    name: 'Intelligente Listenanalyse',
    freeDesc: 'Gesperrt',
    proDesc: 'Vollständige Nährwertanalyse',
    freeAllowed: false,
    proAllowed: true,
  },
  {
    name: 'Mahlzeiten-Tracking',
    freeDesc: 'Gesperrt',
    proDesc: 'Frühstück, Mittag, Abend, Snacks',
    freeAllowed: false,
    proAllowed: true,
  },
  {
    name: 'Persönliche Ernährungsziele',
    freeDesc: 'Nur Ansicht',
    proDesc: 'Vollständig anpassbar',
    freeAllowed: false,
    proAllowed: true,
  },
  {
    name: 'Ausschlussliste (Zutaten)',
    freeDesc: 'Nur Ansicht',
    proDesc: 'Beliebig viele Ausschlüsse',
    freeAllowed: false,
    proAllowed: true,
  },
  {
    name: 'Wasserzähler',
    freeDesc: 'Voll funktionsfähig',
    proDesc: 'Voll funktionsfähig',
    freeAllowed: true,
    proAllowed: true,
  },
  {
    name: 'KI-Erklärung & Feedback',
    freeDesc: 'Gesperrt',
    proDesc: 'Personalisierte Erklärungen',
    freeAllowed: false,
    proAllowed: true,
  },
  {
    name: 'Goodies Match (Personal)',
    freeDesc: 'Nur Basis-Score',
    proDesc: 'Individueller Match & Warnungen',
    freeAllowed: false,
    proAllowed: true,
  },
  {
    name: 'Gesündere Alternativen',
    freeDesc: '1 Alternative',
    proDesc: 'Alle Alternativen (bis zu 5)',
    freeAllowed: true,
    proAllowed: true,
  },
  {
    name: 'Wochenanalyse & Trends',
    freeDesc: 'Gesperrt',
    proDesc: '7-Tage-Trends & Bilanzen',
    freeAllowed: false,
    proAllowed: true,
  },
  {
    name: 'Produktvergleich',
    freeDesc: 'Gesperrt',
    proDesc: 'Mehrere Produkte nebeneinander',
    freeAllowed: false,
    proAllowed: true,
  },
];
