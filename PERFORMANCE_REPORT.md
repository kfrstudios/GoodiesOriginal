# Performance & Architektur Analyse: Goodies App

Dieser Bericht fasst die identifizierten Performance-Bottlenecks, ineffizienten Ressourcenverbräuche und Skalierungsprobleme der App zusammen. Die Analyse wurde in vier Hauptbereiche unterteilt.

---

## 1. Gefundene Schwachstellen & Performance-Analyse

### 1.1 Datenbank & Abfragen (Database & Queries)
*   **Kritikalität:** Mittel
*   **Fundorte:**
    *   `src/services/productService.ts` (`getProducts()`, `searchProducts()`)
*   **Ursache & Auswirkung:**
    *   **Ineffizientes Fetching & Memory-Bloat:** `getProducts()` lädt standardmäßig *alle* nicht-archivierten Produkte in den Speicher und hält sie dort (`memoryProductsCache`). Bei wachsender Datenbank führt dies zu Memory Leaks, extremen initialen Ladezeiten und hohen Firestore-Kosten (zu viele Read-Operations).
    *   **Client-side Filtering:** `searchProducts()` ruft alle Produkte ab und filtert sie per JavaScript (`filter()`), anstatt eine effiziente serverseitige (Firestore) Query zu nutzen.
*   **Konkreter Refactoring-Vorschlag:**

    *Vorher (`productService.ts`):*
    ```typescript
    export async function searchProducts(searchQuery: string): Promise<Product[]> {
      const term = searchQuery.trim().toLowerCase();
      if (!term) return getProducts();

      const all = await getProducts();
      return all.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) || ...
      );
    }
    ```

    *Nachher (Optimiert mit Firestore Queries):*
    ```typescript
    export async function searchProducts(searchQuery: string): Promise<Product[]> {
      // Nutze Firestore-native Abfragen mit Limits
      // Anmerkung: Erfordert ggf. Anpassung der Firestore-Struktur (z.B. search-terms Array)
      const q = query(
        collection(db, 'products'),
        where('searchTerms', 'array-contains', term),
        limit(20) // Verhindert Overfetching
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => enrichProductFields(doc.data() as Partial<Product>, doc.data().barcode));
    }
    ```

### 1.2 Frontend / Rendering (React & View Layer)
*   **Kritikalität:** Kritisch
*   **Fundorte:**
    *   `src/context/AppContext.tsx`
    *   `src/views/TrackerView.tsx`
    *   `src/views/HomeView.tsx`
*   **Ursache & Auswirkung:**
    *   **Monolithischer Global State:** Der `AppContext` (über 1500 Zeilen) verwaltet fast jeden Zustand der App. Eine simple UI-Status-Änderung zwingt den gesamten Komponentenbaum zum Re-Render.
    *   **Fehlende Memoization bei Listen-Renderings:** In Views wie `TrackerView` und `HomeView` werden Arrays (Filtern von Produkten, Zusammenzählen von Kalorien) bei jedem Re-Render synchron neu berechnet. Bei Tastatureingaben (z.B. Suchfeld) blockiert das den Main-Thread (Jank).
*   **Konkreter Refactoring-Vorschlag:**

    *Vorher (`TrackerView.tsx`):*
    ```tsx
    const matchingProducts: Product[] = cleanQuery
      ? products.filter(p => p.name.toLowerCase().includes(cleanQuery) || ...)
      : products.slice(0, 15);

    const totalCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
    ```

    *Nachher (Optimiert mit `useMemo`):*
    ```tsx
    const matchingProducts = useMemo(() => {
      return cleanQuery
        ? products.filter(p => p.name.toLowerCase().includes(cleanQuery) || ...)
        : products.slice(0, 15);
    }, [cleanQuery, products]);

    const totalCalories = useMemo(() => {
      return todayMeals.reduce((sum, m) => sum + m.calories, 0);
    }, [todayMeals]);
    ```

### 1.3 Backend & API-Design (Data Handling & Lifecycle)
*   **Kritikalität:** Mittel
*   **Fundorte:**
    *   `src/services/productService.ts`
*   **Ursache & Auswirkung:**
    *   **Synchroner I/O Block durch `localStorage`:** Das Caching-System verlässt sich beim Speichern/Laden von JSON-Payloads massiv auf `localStorage.setItem` / `getItem`. Bei Listen mit hunderten Produkten blockiert `JSON.stringify` den UI-Thread merklich, was sich wie "Stottern" in der UI anfühlt.
*   **Konkreter Refactoring-Vorschlag:**
    *   Umstellung großer Cache-Arrays (z.B. Produktkatalog) von synchronem `localStorage` auf asynchrone `IndexedDB` (z.B. via `idb-keyval`).

### 1.4 Memory Leaks & Async Handling
*   **Kritikalität:** Kritisch
*   **Fundorte:**
    *   `src/views/ScannerView.tsx` (Kamera- & Barcode-Engine)
*   **Ursache & Auswirkung:**
    *   **Unbereinigte Video-Streams / Intervalle:** Im `ScannerView.tsx` läuft ein `setInterval(runScanCycle, 140)`. Wenn der Nutzer die Ansicht schnell wechselt, laufen diese Tasks oft weiter und blockieren Hardware-Ressourcen (Kamera) und verursachen Memory Leaks im Hintergrund.
*   **Konkreter Refactoring-Vorschlag:**
    *   Kamera-Ressourcen im `useEffect`-Cleanup zwingend freigeben und laufende Promise-Ketten der ZXing-Library verwerfen.

---

## 2. Strategische Empfehlungen & Best Practices

1. **Firestore-Struktur (Migration)**
   Der Vorschlag zur serverseitigen Suche (`array-contains`) erfordert eine gezielte Datenmigration. Bestehende Dokumente müssen um das Feld `searchTerms` (z.B. n-grams oder Array von Suchbegriffen) erweitert werden. Dies muss bei der Release-Planung berücksichtigt werden.

2. **State-Architektur langfristig**
   Während Context-Splitting oder `React.memo` kurzfristig Abhilfe schaffen, wird der monolithische `AppContext` mit über 1500 Zeilen bei weiterem Wachstum der App ein signifikantes Wartungsrisiko bleiben. Es wird dringend empfohlen, mittelfristig ein skalierbareres State-Management-System wie Zustand oder Redux Toolkit zu evaluieren.

3. **Performance-Messung**
   Vor und nach dem Refactoring sollten präzise Metriken über den React Profiler oder Firebase Performance Monitoring erhoben werden, um den tatsächlichen Geschwindigkeitsgewinn objektiv und datengetrieben zu validieren.

---

## 3. Top-3 Quick Wins

Folgende Änderungen bringen **sofort den größten messbaren Performance-Schub** bei sehr geringem Aufwand (Low Hanging Fruits):

1. **Einführung von `useMemo` in Heavy-Duty-Views:**
   In der `TrackerView`, `ScannerView` und `HomeView` alle Listen-Filterungen (`.filter()`, `.reduce()`) und abgeleitete Daten mit `useMemo` wrappen. Das reduziert UI-Lags bei Eingaben auf nahezu null.
2. **Context-Splitting (oder partielles Memoizing):**
   Wenn das Aufteilen von `AppContext.tsx` in `ProductContext`, `AuthContext` und `UIContext` zu aufwendig ist, können zumindest die Kinderkomponenten (Views) in `App.tsx` durch `React.memo` vor nutzlosen Re-Rendern durch irrelevante Context-Änderungen (z.B. Toast-Messages) geschützt werden.
3. **Optimiertes Image-Rendering (Lazy Loading):**
   Das Attribut `loading="lazy"` bei Bildern in langen Listen (`ScannerView`, `TrackerView`) konsequent einsetzen (teilweise ist es bei Picks schon drin, fehlt aber in den Suchergebnissen). Dies reduziert den anfänglichen RAM-Verbrauch der App drastisch.
