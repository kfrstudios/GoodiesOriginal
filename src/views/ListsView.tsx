import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  Heart, 
  ListChecks, 
  History, 
  Plus, 
  Trash2, 
  Check, 
  ArrowRight, 
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Share2,
  AlertTriangle,
  AlertCircle,
  ScanLine,
  X,
  Flame,
  CheckCheck,
  Lock,
  Pencil
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { BarcodeListScannerModal } from '../components/BarcodeListScannerModal';
import { Product } from '../types';
import { ProBadge } from '../components/pro/ProDesignSystem';

export function ListsView() {
  const { 
    favorites, 
    toggleFavorite, 
    products, 
    openProductDetail, 
    shoppingLists, 
    createShoppingList, 
    updateShoppingListTitle,
    addShoppingItem, 
    updateShoppingItem,
    toggleShoppingItem, 
    removeShoppingItem, 
    deleteShoppingList,
    effectiveTier,
    openPaywall,
    user,
    showToast
  } = useApp();

  // Ensure view starts at the very top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const [activeTab, setActiveTab] = useState<'shopping' | 'favorites'>('shopping');
  const [newListName, setNewListName] = useState('');
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [renamingList, setRenamingList] = useState<{ id: string; title: string } | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  const handleStartRenameList = (id: string, currentTitle: string) => {
    setRenamingList({ id, title: currentTitle });
    setRenameInputValue(currentTitle);
  };

  const handleSaveRenameList = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!renamingList || !renameInputValue.trim()) return;
    updateShoppingListTitle(renamingList.id, renameInputValue.trim());
    setRenamingList(null);
  };
  const [newItemName, setNewItemName] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>(shoppingLists[0]?.id || '');

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerInitialQuery, setScannerInitialQuery] = useState('');
  const [scannerTargetItemId, setScannerTargetItemId] = useState<string | undefined>(undefined);

  // Unmatched product notice state
  const [unmatchedNotice, setUnmatchedNotice] = useState<{ query: string; itemId: string } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const favoriteProducts = products.filter(p => favorites.includes(p.id));
  const currentList = shoppingLists.find(l => l.id === selectedListId) || shoppingLists[0];

  // Autocomplete suggestions based on central products database
  const autocompleteSuggestions: Product[] = newItemName.trim().length >= 2
    ? products.filter(p => {
        const q = newItemName.trim().toLowerCase();
        return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  const handleCreateList = (e: FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    if (effectiveTier === 'FREE' && shoppingLists.length >= 1) {
      openPaywall('lists');
      showToast('Im Free-Plan ist 1 Liste enthalten. Hol dir PRO für unbegrenzte Einkaufslisten.');
      return;
    }

    createShoppingList(newListName.trim());
    setNewListName('');
    setShowNewListInput(false);
  };

  const handleOpenNewList = () => {
    if (effectiveTier === 'FREE' && shoppingLists.length >= 1) {
      openPaywall('lists');
      showToast('Im Free-Plan ist 1 Einkaufsliste enthalten.');
      return;
    }
    setShowNewListInput(!showNewListInput);
  };

  // Select item from autocomplete dropdown
  const handleSelectAutocompleteProduct = (product: Product) => {
    if (!currentList) return;
    addShoppingItem(
      currentList.id,
      product.name,
      product.quantity || '1x',
      product.id,
      product.nutritionPer100g.calories,
      false
    );
    setNewItemName('');
    setIsInputFocused(false);
    setUnmatchedNotice(null);
  };

  // Submit via "+" button
  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    const query = newItemName.trim();
    if (!query || !currentList) return;

    // Check if query matches a known database product
    const exactMatch = products.find(p => 
      p.name.toLowerCase() === query.toLowerCase() ||
      `${p.brand} ${p.name}`.toLowerCase() === query.toLowerCase()
    );

    if (exactMatch) {
      addShoppingItem(
        currentList.id, 
        exactMatch.name, 
        exactMatch.quantity || '1x', 
        exactMatch.id, 
        exactMatch.nutritionPer100g.calories, 
        false
      );
      setNewItemName('');
      setIsInputFocused(false);
      setUnmatchedNotice(null);
    } else {
      // Product not found in database: add to list with isCustom=true and show friendly notice
      const tempItemId = `item_${Date.now()}`;
      addShoppingItem(currentList.id, query, '1x', undefined, undefined, true);
      setNewItemName('');
      setIsInputFocused(false);
      setUnmatchedNotice({
        query,
        itemId: tempItemId
      });
    }
  };

  // Open dedicated scanner
  const handleOpenScanner = (initialQuery = '', existingItemId?: string) => {
    setScannerInitialQuery(initialQuery);
    setScannerTargetItemId(existingItemId);
    setIsScannerOpen(true);
  };

  // Add favorite product directly into current shopping list
  const handleAddFavoriteToList = (productId: string, productName: string) => {
    if (!currentList) return;
    addShoppingItem(currentList.id, productName, '1x', productId);
    showToast(`„${productName}“ zur Einkaufsliste hinzugefügt`);
  };

  // INTELLIGENT METRICS CALCULATION FOR CURRENT LIST
  const linkedProducts = currentList
    ? currentList.items
        .map(i => products.find(p => p.id === i.productId || p.name.toLowerCase() === i.name.toLowerCase()))
        .filter(Boolean) as typeof products
    : [];

  const avgScore = linkedProducts.length > 0
    ? Math.round(linkedProducts.reduce((sum, p) => sum + p.goodiesScore, 0) / linkedProducts.length)
    : null;

  const totalNutriAorB = linkedProducts.filter(p => p.nutriScore === 'A' || p.nutriScore === 'B').length;
  const nutriABPercent = linkedProducts.length > 0
    ? Math.round((totalNutriAorB / linkedProducts.length) * 100)
    : 0;

  // Check for unwanted ingredients / excluded list items in the shopping cart
  const cartWarnings: string[] = [];
  const excluded = user.excludedIngredients || [];

  linkedProducts.forEach(prod => {
    excluded.forEach(ex => {
      if (prod.ingredients.toLowerCase().includes(ex.toLowerCase())) {
        cartWarnings.push(`„${prod.name}“ enthält ${ex} (auf deiner Ausschlussliste)`);
      }
    });

    user.allergies.forEach(alg => {
      if (prod.allergens.some(a => a.toLowerCase().includes(alg.toLowerCase()))) {
        cartWarnings.push(`„${prod.name}“ enthält Allergen: ${alg}`);
      }
    });
  });

  // Copy shopping list to clipboard
  const handleShareList = () => {
    if (!currentList) return;
    const text = `🛒 ${currentList.title} (Goodies)\n\n` + 
      currentList.items.map(i => `${i.checked ? '✅' : '⬜'} ${i.name} ${i.amount || ''}`).join('\n') +
      `\n\nErstellt mit Goodies Food App`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Einkaufsliste in die Zwischenablage kopiert!');
    }
  };

  return (
    <div className="space-y-4 pb-28 max-w-2xl mx-auto px-4 pt-2">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">
          Einkauf & Favoriten
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Intelligente Einkaufslisten mit Nährwertanalyse und deine Lieblingsprodukte.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-200/80 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('shopping')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'shopping' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600'
          }`}
        >
          <ListChecks className="w-3.5 h-3.5 text-emerald-600" />
          <span>Einkaufslisten ({shoppingLists.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'favorites' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          <span>Favoriten ({favorites.length})</span>
        </button>
      </div>

      {/* Tab 1: Einkaufslisten mit Intelligenter Analyse */}
      {activeTab === 'shopping' && (
        <div className="space-y-4">
          {/* List selection & New List */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            {shoppingLists.map((list) => {
              const isSelected = currentList?.id === list.id;
              return (
                <div
                  key={list.id}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedListId(list.id)}
                    className="whitespace-nowrap text-xs font-bold cursor-pointer"
                  >
                    {list.title} ({list.items.filter(i => !i.checked).length})
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartRenameList(list.id, list.title);
                    }}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      isSelected
                        ? 'text-emerald-100 hover:text-white hover:bg-emerald-700'
                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                    }`}
                    title="Listenname ändern"
                    aria-label={`Listenname von ${list.title} ändern`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {effectiveTier === 'FREE' && shoppingLists.length >= 1 ? (
              <button
                type="button"
                onClick={handleOpenNewList}
                className="whitespace-nowrap text-xs font-bold text-zinc-500 flex items-center gap-1.5 px-3 py-2 bg-zinc-100 rounded-xl border border-zinc-200 hover:border-amber-300 transition-all cursor-pointer"
                title="Unbegrenzte Listen sind ein PRO-Feature"
              >
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Neue Liste</span>
                <ProBadge size="xs" label="PRO" variant="gold" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenNewList}
                className="whitespace-nowrap text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Neue Liste</span>
                {effectiveTier === 'FREE' && (
                  <span className="text-[10px] text-zinc-400 font-normal ml-0.5">(0/1)</span>
                )}
              </button>
            )}
          </div>

          {/* New List Form */}
          {showNewListInput && (
            <form onSubmit={handleCreateList} className="flex gap-2 bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
              <input
                type="text"
                placeholder="Name der Liste (z. B. Wochenmarkt, Drogerie)..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                Erstellen
              </button>
            </form>
          )}

          {currentList && (
            <div className="space-y-4">
              {/* ============================================================ */}
              {/* INTELLIGENTE LISTENMETRIKEN CARD */}
              {/* ============================================================ */}
              <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-zinc-900">
                        Intelligente Listenanalyse
                      </h4>
                      <span className="text-[10px] text-zinc-400">
                        Gesundheits- & Nährwert-Check des Einkaufs
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleShareList}
                    className="text-xs font-bold text-zinc-500 hover:text-emerald-600 flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1.5 rounded-xl transition-colors"
                    title="Liste teilen"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Teilen</span>
                  </button>
                </div>

                {/* Score Indicators */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-2.5 text-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Ø Goodies Score</span>
                    <span className="text-xl font-black text-emerald-600 block mt-0.5">
                      {avgScore !== null ? (
                        <>
                          <AnimatedCounter value={avgScore} />
                          <span className="text-[10px] text-zinc-400 font-normal">/100</span>
                        </>
                      ) : '—'}
                    </span>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-2.5 text-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block">Nutri-Score A/B</span>
                    <span className="text-xl font-black text-zinc-800 block mt-0.5">
                      {linkedProducts.length > 0 ? `${nutriABPercent}%` : '—'}
                    </span>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-2.5 text-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block">Produkte im Scan</span>
                    <span className="text-xl font-black text-zinc-800 block mt-0.5">
                      {linkedProducts.length} <span className="text-[10px] font-normal text-zinc-400">/ {currentList.items.length}</span>
                    </span>
                  </div>
                </div>

                {/* Cart Warnings if excluded ingredients found */}
                {cartWarnings.length > 0 ? (
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Hinweise für deinen Einkauf:
                    </span>
                    {cartWarnings.map((w, idx) => (
                      <p key={idx} className="text-[11px] text-amber-800 pl-5">
                        • {w}
                      </p>
                    ))}
                  </div>
                ) : linkedProducts.length > 0 ? (
                  <div className="p-2.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Keine Stoffe deiner Ausschlussliste in den erfassten Produkten gefunden!</span>
                  </div>
                ) : null}
              </div>

              {/* Shopping List Items Container */}
              <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-zinc-900">{currentList.title}</h3>
                      <button
                        type="button"
                        onClick={() => handleStartRenameList(currentList.id, currentList.title)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                        title="Listenname ändern"
                        aria-label={`Listenname ${currentList.title} ändern`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {currentList.items.filter(i => i.checked).length} von {currentList.items.length} erledigt
                    </span>
                  </div>

                  {shoppingLists.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteShoppingList(currentList.id)}
                      className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                      title="Liste löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Add item input with Autocomplete & Scan Button */}
                <div className="relative">
                  <form onSubmit={handleAddItem} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Neuer Eintrag (z. B. Spaghetti, Haferflocken)..."
                        value={newItemName}
                        onChange={(e) => {
                          setNewItemName(e.target.value);
                          setIsInputFocused(true);
                        }}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => {
                          // Short timeout so click on suggestion dropdown fires first
                          setTimeout(() => setIsInputFocused(false), 200);
                        }}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                      />
                      {newItemName && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewItemName('');
                            setIsInputFocused(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                          title="Eingabe leeren"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Primary Add (+) Button */}
                    <button
                      type="submit"
                      disabled={!newItemName.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0"
                      title="Zur Liste hinzufügen"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Dedicated Scan Button directly right next to (+) */}
                    <button
                      type="button"
                      onClick={() => handleOpenScanner()}
                      className="bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-zinc-700 border border-zinc-200 active:scale-95 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0"
                      title="Barcode scannen & direkt zur Liste hinzufügen"
                    >
                      <ScanLine className="w-4 h-4 text-emerald-600" />
                      <span className="hidden sm:inline font-bold">Scannen</span>
                    </button>
                  </form>

                  {/* Autocomplete Suggestions Popup */}
                  {isInputFocused && autocompleteSuggestions.length > 0 && (
                    <div 
                      ref={dropdownRef}
                      className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-zinc-200 rounded-2xl shadow-xl z-30 overflow-hidden divide-y divide-zinc-100 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <div className="px-3.5 py-1.5 bg-zinc-50 flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        <span>Vorschläge aus Produktdatenbank</span>
                        <span>{autocompleteSuggestions.length} Treffer</span>
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {autocompleteSuggestions.map((prod) => (
                          <button
                            key={prod.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectAutocompleteProduct(prod);
                            }}
                            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-emerald-50/70 text-left transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-8 h-8 rounded-lg object-cover bg-zinc-100 shrink-0 border border-zinc-100"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-zinc-800 group-hover:text-emerald-950 truncate">
                                  {prod.name}
                                </p>
                                <p className="text-[10px] text-zinc-400 truncate">
                                  {prod.brand} • {prod.quantity || 'Packung'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                Score {prod.goodiesScore}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                                Nutri {prod.nutriScore}
                              </span>
                              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                                <Plus className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Unobtrusive Product Not Found Hint Banner */}
                {unmatchedNotice && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-amber-900 leading-tight">
                          „{unmatchedNotice.query}“ nicht in der Goodies-Datenbank gefunden
                        </p>
                        <p className="text-[11px] text-amber-800/90 leading-relaxed">
                          Eintrag wurde als Notiz hinzugefügt. Du kannst den Barcode scannen, um das Produkt mit der Datenbank zu verknüpfen oder zur Prüfung einzureichen.
                        </p>
                        <div className="pt-0.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenScanner(unmatchedNotice.query, unmatchedNotice.itemId)}
                            className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[11px] font-bold px-3 py-1 rounded-xl transition-all shadow-xs"
                          >
                            <ScanLine className="w-3 h-3" />
                            <span>Barcode scannen & prüfen</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUnmatchedNotice(null)}
                      className="text-amber-500 hover:text-amber-700 p-1 rounded-lg shrink-0 transition-colors"
                      title="Hinweis schließen"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Quick Add from Favorites Bar */}
                {favoriteProducts.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Schnell aus Favoriten hinzufügen:
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {favoriteProducts.map(fav => (
                        <button
                          key={fav.id}
                          type="button"
                          onClick={() => handleAddFavoriteToList(fav.id, fav.name)}
                          className="whitespace-nowrap bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-200 text-zinc-700 text-[11px] font-medium px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-emerald-600" />
                          <span>{fav.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items checklist */}
                <div className="space-y-1.5 pt-1">
                  {currentList.items.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-2">Diese Liste ist noch leer.</p>
                  ) : (
                    currentList.items.map((item) => {
                      const linkedProd = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase());
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            item.checked
                              ? 'bg-zinc-50 border-zinc-100 text-zinc-400 line-through'
                              : 'bg-white border-zinc-200 text-zinc-800'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleShoppingItem(currentList.id, item.id)}
                            className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                          >
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                                item.checked
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-zinc-300 bg-white'
                              }`}
                            >
                              {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-semibold truncate">{item.name}</span>
                            {item.amount && (
                              <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded shrink-0">
                                {item.amount}
                              </span>
                            )}
                            {linkedProd && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">
                                Score {linkedProd.goodiesScore}
                              </span>
                            )}
                            {item.isCustom && !linkedProd && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 shrink-0">
                                Notiz
                              </span>
                            )}
                          </button>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {item.isCustom && !linkedProd && (
                              <button
                                type="button"
                                onClick={() => handleOpenScanner(item.name, item.id)}
                                className="p-1.5 text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Barcode scannen & verknüpfen"
                              >
                                <ScanLine className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeShoppingItem(currentList.id, item.id)}
                              className="text-zinc-300 hover:text-rose-500 p-1.5 transition-colors"
                              title="Eintrag entfernen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Favoriten */}
      {activeTab === 'favorites' && (
        <div className="space-y-3">
          {favoriteProducts.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-zinc-200 text-center space-y-2">
              <Heart className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="text-xs text-zinc-500">Noch keine Favoriten gespeichert.</p>
              <p className="text-[11px] text-zinc-400">
                Tippe bei jedem Produkt auf das Herz, um es hier schnell wiederzufinden.
              </p>
            </div>
          ) : (
            favoriteProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center justify-between hover:border-emerald-300 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => openProductDetail(p)}
                  className="flex items-center gap-3 min-w-0 text-left flex-1"
                >
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-12 h-12 rounded-xl object-cover bg-zinc-100 shrink-0 border border-zinc-100"
                  />
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      {p.brand}
                    </span>
                    <h4 className="text-xs font-bold text-zinc-900 truncate">
                      {p.name}
                    </h4>
                    <span className="text-[10px] text-zinc-500">
                      Score: <strong className="text-emerald-600">{p.goodiesScore}/100</strong> • Nutri {p.nutriScore}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  {currentList && (
                    <button
                      type="button"
                      onClick={() => handleAddFavoriteToList(p.id, p.name)}
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-xl transition-colors"
                      title="Auf Liste"
                    >
                      + Liste
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(p.id)}
                    className="p-2 text-rose-500 hover:text-zinc-400 transition-colors"
                    title="Entfernen"
                  >
                    <Heart className="w-4 h-4 fill-rose-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {currentList && (
        <BarcodeListScannerModal
          isOpen={isScannerOpen}
          onClose={() => {
            setIsScannerOpen(false);
            setScannerInitialQuery('');
            setScannerTargetItemId(undefined);
          }}
          listId={currentList.id}
          listTitle={currentList.title}
          initialQuery={scannerInitialQuery}
          existingItemId={scannerTargetItemId}
        />
      )}

      {/* Rename List Modal */}
      {renamingList && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-zinc-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-800">
                <Pencil className="w-4 h-4 text-zinc-500" />
                <h3 className="font-bold text-sm text-zinc-900">Listenname ändern</h3>
              </div>
              <button
                type="button"
                onClick={() => setRenamingList(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRenameList} className="space-y-3">
              <input
                type="text"
                value={renameInputValue}
                onChange={(e) => setRenameInputValue(e.target.value)}
                placeholder="Neuer Name der Liste..."
                autoFocus
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRenamingList(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!renameInputValue.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
