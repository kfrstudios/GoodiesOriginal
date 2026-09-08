import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { 
  Shield, 
  ArrowLeft, 
  Package, 
  HelpCircle, 
  PlusCircle, 
  CheckCircle2, 
  Trash2, 
  Search, 
  Sliders, 
  Database,
  ExternalLink,
  Users,
  Upload,
  Download,
  FileSpreadsheet,
  Activity,
  AlertCircle,
  AlertTriangle,
  Clock,
  Bug,
  RefreshCw,
  Crown,
  Sparkles,
  Lock,
  Zap,
  Check,
  UserCheck,
  UserX,
  Mail,
  Pencil,
  Image as ImageIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdminTab, NutriScore, NovaScore, Product, UserProfile, UserRole, SubscriptionTier } from '../types';
import { 
  getAllUsersFromFirestore, 
  updateUserRoleInFirestore, 
  updateUserSubscriptionInFirestore 
} from '../services/firebase';
import { CleanNumberInput } from '../components/CleanNumberInput';

export function AdminView() {
  const { 
    products, 
    addProduct, 
    updateProduct,
    deleteProduct, 
    unknownBarcodes, 
    refreshUnknownBarcodes,
    resolveUnknownBarcode, 
    deleteUnknownBarcode,
    reports,
    updateReportStatus,
    deleteReport,
    refreshReports,
    adminTab, 
    setAdminTab, 
    setActiveView,
    openProductDetail,
    user,
    updateUserProfile,
    refreshUserProfileFromDb,
    effectiveTier,
    adminSimulationTier,
    setAdminSimulationTier,
    canPerformScan,
    openPaywall,
    hasFeature,
    getFeatureLimit,
    showToast
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');

  // Reports state
  const [reportTypeFilter, setReportTypeFilter] = useState<'all' | 'product' | 'bug'>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'in_review' | 'resolved'>('all');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [isRefreshingReports, setIsRefreshingReports] = useState(false);

  // Form state for creating / editing a product
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isRefreshingBarcodes, setIsRefreshingBarcodes] = useState(false);
  const [barcodeFilter, setBarcodeFilter] = useState<'ALL' | 'pending' | 'resolved'>('ALL');

  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('Pflanzliche Alternativen');
  const [formQuantity, setFormQuantity] = useState('500 g');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formGoodiesScore, setFormGoodiesScore] = useState(85);
  const [formNutriScore, setFormNutriScore] = useState<NutriScore>('A');
  const [formNovaScore, setFormNovaScore] = useState<NovaScore>(1);
  const [formCalories, setFormCalories] = useState(120);
  const [formProtein, setFormProtein] = useState(8.5);
  const [formCarbs, setFormCarbs] = useState(14.0);
  const [formSugars, setFormSugars] = useState(2.0);
  const [formFat, setFormFat] = useState(3.0);
  const [formFiber, setFormFiber] = useState(4.0);
  const [formIngredients, setFormIngredients] = useState('Wasser, Hafer, Sonnenblumenöl, Meersalz.');
  const [formLabels, setFormLabels] = useState('Bio, Vegan, Ohne Zuckerzusatz');
  const [formVerdict, setFormVerdict] = useState('Sehr gut ausbalanciertes Lebensmittel.');

  const resetProductForm = () => {
    setEditingProductId(null);
    setFormBarcode('');
    setFormName('');
    setFormBrand('');
    setFormCategory('Pflanzliche Alternativen');
    setFormQuantity('500 g');
    setFormImageUrl('');
    setFormGoodiesScore(85);
    setFormNutriScore('A');
    setFormNovaScore(1);
    setFormCalories(120);
    setFormProtein(8.5);
    setFormCarbs(14.0);
    setFormSugars(2.0);
    setFormFat(3.0);
    setFormFiber(4.0);
    setFormIngredients('Wasser, Hafer, Sonnenblumenöl, Meersalz.');
    setFormLabels('Bio, Vegan, Ohne Zuckerzusatz');
    setFormVerdict('Sehr gut ausbalanciertes Lebensmittel.');
  };

  const handleStartEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setFormBarcode(p.barcode);
    setFormName(p.name);
    setFormBrand(p.brand);
    setFormCategory(p.category || 'Pflanzliche Alternativen');
    setFormQuantity(p.quantity || '500 g');
    setFormImageUrl(p.imageUrl || '');
    setFormGoodiesScore(p.goodiesScore);
    setFormNutriScore(p.nutriScore);
    setFormNovaScore(p.novaScore);
    setFormCalories(p.nutritionPer100g.calories);
    setFormProtein(p.nutritionPer100g.protein);
    setFormCarbs(p.nutritionPer100g.carbohydrates);
    setFormSugars(p.nutritionPer100g.sugars);
    setFormFat(p.nutritionPer100g.fat);
    setFormFiber(p.nutritionPer100g.fiber || 0);
    setFormIngredients(p.ingredients || '');
    setFormLabels(p.labels?.join(', ') || '');
    setFormVerdict(p.healthVerdict || '');
    setAdminTab('create-product');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleCancelEdit = () => {
    resetProductForm();
    setAdminTab('products');
  };

  const handleRefreshBarcodes = async () => {
    setIsRefreshingBarcodes(true);
    try {
      await refreshUnknownBarcodes();
      showToast('Unbekannte Barcodes aus Datenbank aktualisiert');
    } finally {
      setIsRefreshingBarcodes(false);
    }
  };

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<Partial<Product>[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Firestore User Management State
  const [dbUsers, setDbUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterTier, setUserFilterTier] = useState<'ALL' | 'FREE' | 'PRO' | 'ADMIN'>('ALL');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const list = await getAllUsersFromFirestore();
      if (list.length === 0 && user.uid) {
        setDbUsers([user]);
      } else {
        setDbUsers(list);
      }
    } catch (err) {
      console.warn('Could not fetch users list:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleUserRole = async (targetUser: UserProfile) => {
    const nextRole: UserRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setUpdatingUid(targetUser.uid);
    try {
      await updateUserRoleInFirestore(targetUser.uid, nextRole);
      setDbUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, role: nextRole } : u));
      if (user.uid === targetUser.uid) {
        await updateUserProfile({ role: nextRole });
      }
      showToast(nextRole === 'ADMIN' ? `Admin-Rechte an ${targetUser.name || 'Nutzer'} vergeben` : `Admin-Rechte von ${targetUser.name || 'Nutzer'} entzogen`);
    } catch (err: any) {
      showToast(`Fehler beim Ändern der Rolle: ${err.message}`);
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleToggleUserPro = async (targetUser: UserProfile) => {
    const currentTier = targetUser.subscriptionTier || (targetUser.isPro ? 'PRO' : 'FREE');
    const nextTier: SubscriptionTier = currentTier === 'PRO' ? 'FREE' : 'PRO';
    setUpdatingUid(targetUser.uid);
    try {
      await updateUserSubscriptionInFirestore(targetUser.uid, nextTier);
      setDbUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, subscriptionTier: nextTier, isPro: nextTier === 'PRO' } : u));
      if (user.uid === targetUser.uid) {
        await refreshUserProfileFromDb();
      }
      showToast(nextTier === 'PRO' ? `Goodies PRO für ${targetUser.name || 'Nutzer'} aktiviert` : `Goodies PRO für ${targetUser.name || 'Nutzer'} entzogen`);
    } catch (err: any) {
      showToast(`Fehler beim Ändern des Abos: ${err.message}`);
    } finally {
      setUpdatingUid(null);
    }
  };

  // User Preset selection
  const userPresets: Partial<UserProfile>[] = [
    {
      name: 'Alex (Vegetarier)',
      diet: 'Vegetarisch',
      allergies: [],
      excludedIngredients: ['Palmöl', 'Gelatine'],
      dailyGoals: { calories: 2150, protein: 110, carbs: 230, fat: 65, water: 2500, maxSugar: 35, maxSalt: 5 }
    },
    {
      name: 'Sarah (Vegan & Nussallergie)',
      diet: 'Vegan',
      allergies: ['Nüsse', 'Erdnüsse', 'Soja'],
      excludedIngredients: ['Palmöl', 'Farbstoffe', 'Künstliche Süßstoffe'],
      dailyGoals: { calories: 1950, protein: 90, carbs: 220, fat: 55, water: 2800, maxSugar: 25, maxSalt: 4 }
    },
    {
      name: 'Markus (Low Carb & Fitness)',
      diet: 'Low Carb',
      allergies: ['Milch (Laktose)'],
      excludedIngredients: ['Glukose-Fruktose-Sirup', 'Aspartam'],
      dailyGoals: { calories: 2500, protein: 160, carbs: 90, fat: 110, water: 3500, maxSugar: 20, maxSalt: 6 }
    },
    {
      name: 'Lisa (Standard Omnivore)',
      diet: 'Omnivore',
      allergies: [],
      excludedIngredients: [],
      dailyGoals: { calories: 2000, protein: 80, carbs: 250, fat: 65, water: 2200, maxSugar: 50, maxSalt: 6 }
    }
  ];

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBarcode.trim()) {
      showToast('Bitte Name und Barcode ausfüllen');
      return;
    }

    const finalImageUrl = formImageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    const productPayload = {
      barcode: formBarcode.trim(),
      name: formName.trim(),
      brand: formBrand.trim() || 'Eigenmarke',
      category: formCategory,
      quantity: formQuantity,
      imageUrl: finalImageUrl,
      goodiesScore: Number(formGoodiesScore),
      nutriScore: formNutriScore,
      novaScore: Number(formNovaScore) as NovaScore,
      nutritionPer100g: {
        calories: Number(formCalories),
        protein: Number(formProtein),
        carbohydrates: Number(formCarbs),
        sugars: Number(formSugars),
        fat: Number(formFat),
        saturatedFat: Number((formFat * 0.2).toFixed(1)),
        fiber: Number(formFiber),
        salt: 0.10,
      },
      ingredients: formIngredients,
      additives: [],
      allergens: [],
      labels: formLabels.split(',').map(s => s.trim()).filter(Boolean),
      pros: ['Reich an Nährstoffen', 'Schonend verarbeitet'],
      cons: [],
      healthVerdict: formVerdict || 'Ausgewogenes Lebensmittel nach Goodies Kriterien.',
    };

    if (editingProductId) {
      await updateProduct({
        ...productPayload,
        id: editingProductId,
      } as Product);
      showToast(`Produkt „${formName}“ erfolgreich aktualisiert`);
    } else {
      await addProduct(productPayload);
      // Auto-resolve unknown barcode if this barcode was reported as unknown
      const matchingUnknown = unknownBarcodes.find(u => u.barcode === formBarcode.trim());
      if (matchingUnknown) {
        await resolveUnknownBarcode(matchingUnknown.id);
      }
      showToast(`Produkt „${formName}“ erfolgreich angelegt`);
    }

    resetProductForm();
    setAdminTab('products');
  };

  // CSV Parsing
  const handleCsvFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseCsvData(content);
    };
    reader.readAsText(file);
  };

  const parseCsvData = (raw: string) => {
    try {
      setCsvError(null);
      const lines = raw.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setCsvError('CSV benötigt mindestens eine Kopfzeile und eine Datenzeile.');
        return;
      }

      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());

      const parsed: Partial<Product>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (row.length < 2) continue;

        const barcode = row[headers.indexOf('barcode')] || row[headers.indexOf('ean')] || row[0];
        const name = row[headers.indexOf('name')] || row[headers.indexOf('produkt')] || row[1];
        const brand = row[headers.indexOf('brand')] || row[headers.indexOf('marke')] || 'Hersteller';
        const category = row[headers.indexOf('category')] || row[headers.indexOf('kategorie')] || 'Lebensmittel';
        const calories = Number(row[headers.indexOf('calories')] || row[headers.indexOf('kalorien')] || 150);
        const protein = Number(row[headers.indexOf('protein')] || row[headers.indexOf('eiweiß')] || 5);
        const sugars = Number(row[headers.indexOf('sugars')] || row[headers.indexOf('zucker')] || 3);
        const score = Number(row[headers.indexOf('score')] || 80);

        if (barcode && name) {
          parsed.push({
            barcode,
            name,
            brand,
            category,
            quantity: 'Packung',
            imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
            goodiesScore: score,
            nutriScore: 'A',
            novaScore: 1,
            nutritionPer100g: {
              calories,
              protein,
              carbohydrates: 15,
              sugars,
              fat: 2,
              saturatedFat: 0.5,
              fiber: 3,
              salt: 0.1
            },
            ingredients: 'Wasser, natürliche Zutaten.',
            additives: [],
            allergens: [],
            labels: ['Verifiziert'],
            pros: ['Gute Nährwertdichte'],
            cons: [],
            healthVerdict: 'Über CSV importiertes Produkt.'
          });
        }
      }

      setCsvPreview(parsed);
    } catch (err: any) {
      setCsvError(`CSV-Verarbeitungsfehler: ${err.message}`);
    }
  };

  const handleCommitCsvImport = () => {
    if (csvPreview.length === 0) return;

    let count = 0;
    csvPreview.forEach(p => {
      if (p.barcode && p.name) {
        addProduct(p as Omit<Product, 'id'>);
        count++;
      }
    });

    showToast(`${count} Produkte erfolgreich importiert`);
    setCsvText('');
    setCsvPreview([]);
    setAdminTab('products');
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ['barcode', 'name', 'brand', 'category', 'goodiesScore', 'nutriScore', 'novaScore', 'calories', 'protein', 'sugars', 'fat', 'salt'];
    const rows = products.map(p => [
      `"${p.barcode}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.brand}"`,
      `"${p.category}"`,
      p.goodiesScore,
      p.nutriScore,
      p.novaScore,
      p.nutritionPer100g.calories,
      p.nutritionPer100g.protein,
      p.nutritionPer100g.sugars,
      p.nutritionPer100g.fat,
      p.nutritionPer100g.salt,
    ].join(';'));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `goodies_products_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Produktdatenbank als CSV exportiert');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 text-zinc-900">
      {/* Admin Header */}
      <header className="bg-zinc-900 text-white px-4 py-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                <span>Goodies Admin Hub</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                  v1.2 Live
                </span>
              </h1>
              <p className="text-[10px] text-zinc-400">Produktpflege, CSV-Tools & Systemstatus</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Zurück zur App</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-5">
        {/* Navigation Tabs */}
        <div className="flex bg-white p-1 rounded-2xl border border-zinc-200 overflow-x-auto scrollbar-none gap-1">
          <button
            type="button"
            onClick={() => setAdminTab('overview')}
            className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === 'overview' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Übersicht & System
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('users')}
            className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              adminTab === 'users' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-500" />
            <span>Nutzer & Rollen ({dbUsers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('products')}
            className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === 'products' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Produktdatenbank ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('unknown-barcodes')}
            className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === 'unknown-barcodes' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Unbekannte Barcodes ({unknownBarcodes.filter(u => u.status === 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('reports')}
            className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              adminTab === 'reports' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Meldungen ({reports.filter(r => r.status === 'pending').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('create-product')}
            className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === 'create-product' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            + Produkt anlegen
          </button>
        </div>

        {/* Tab 1: Overview & System Status & Users */}
        {adminTab === 'overview' && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm">
                <span className="text-[11px] font-bold text-zinc-400 block">Produkte Gesamt</span>
                <span className="text-2xl font-black text-zinc-900 mt-1 block">{products.length}</span>
                <span className="text-[10px] text-emerald-600 font-semibold">100% verifiziert</span>
              </div>
              <div 
                onClick={() => setAdminTab('users')}
                className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm cursor-pointer hover:border-purple-300 transition-colors"
              >
                <span className="text-[11px] font-bold text-zinc-400 block">Nutzerkonten</span>
                <span className="text-2xl font-black text-purple-600 mt-1 block">
                  {dbUsers.length}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">
                  {dbUsers.filter(u => u.subscriptionTier === 'PRO' || u.isPro).length} PRO • {dbUsers.filter(u => u.role === 'ADMIN').length} Admins
                </span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm">
                <span className="text-[11px] font-bold text-zinc-400 block">Unbekannte Barcodes</span>
                <span className="text-2xl font-black text-amber-600 mt-1 block">
                  {unknownBarcodes.filter(u => u.status === 'pending').length}
                </span>
                <span className="text-[10px] text-zinc-500">Ausstehend</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm">
                <span className="text-[11px] font-bold text-zinc-400 block">Firebase & Firestore</span>
                <span className="text-sm font-black text-emerald-700 mt-2 block flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  Online & Verbunden
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">goodies-food-scanner</span>
              </div>
            </div>

            {/* ============================================================ */}
            {/* CSV IMPORT & EXPORT SUITE */}
            {/* ============================================================ */}
            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900">
                      CSV-Import & Export für Produktdaten
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Lade Produkte massenhaft hoch oder sichere die bestehende Datenbank.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-zinc-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV exportieren</span>
                </button>
              </div>

              {/* Upload input */}
              <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-4 text-center hover:border-emerald-400 transition-colors">
                <input
                  type="file"
                  accept=".csv,.txt"
                  id="csv-file-input"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center gap-1"
                >
                  <Upload className="w-6 h-6 text-emerald-600" />
                  <span className="text-xs font-bold text-zinc-800">
                    CSV-Datei auswählen oder hierher ziehen
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Format: Barcode, Name, Marke, Kategorie, Kalorien, Protein, Zucker, Score
                  </span>
                </label>
              </div>

              {csvError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{csvError}</span>
                </div>
              )}

              {/* Preview of parsed items */}
              {csvPreview.length > 0 && (
                <div className="space-y-2 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">
                      Vorschau: {csvPreview.length} Produkte bereit zum Import
                    </span>
                    <button
                      type="button"
                      onClick={handleCommitCsvImport}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs transition-all"
                    >
                      Jetzt {csvPreview.length} Produkte importieren
                    </button>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs text-zinc-700 divide-y divide-zinc-200">
                    {csvPreview.slice(0, 10).map((p, idx) => (
                      <div key={idx} className="pt-1 flex items-center justify-between">
                        <span><strong>{p.name}</strong> ({p.brand})</span>
                        <span className="font-mono text-[11px] text-zinc-500">{p.barcode}</span>
                      </div>
                    ))}
                    {csvPreview.length > 10 && (
                      <div className="pt-1 text-[10px] text-zinc-400 italic">
                        ... und {csvPreview.length - 10} weitere Produkte
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* NUTZERVERWALTUNG & TESTPROFILE */}
            {/* ============================================================ */}
            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900">
                      Nutzerverwaltung & Test-Profile
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Wechsle zwischen Ernährungsweisen, um Matching-Algorithmen live zu testen.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {adminSimulationTier !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSimulationTier(null);
                        showToast('Simulation beendet: Reales Profil aktiv');
                      }}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors"
                    >
                      Simulation zurücksetzen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAdminSimulationTier('FREE');
                      showToast('Admin-Simulation: FREE Preview aktiv (ohne DB-Änderung)');
                    }}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-colors ${
                      adminSimulationTier === 'FREE'
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                    }`}
                  >
                    Free Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminSimulationTier('PRO');
                      showToast('Admin-Simulation: PRO Preview aktiv (ohne DB-Änderung)');
                    }}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition-colors ${
                      adminSimulationTier === 'PRO'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <Crown className="w-3 h-3 text-amber-600" />
                    <span>Pro Preview</span>
                  </button>
                </div>
              </div>

              {adminSimulationTier !== null && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-center justify-between font-medium">
                  <span>
                    Aktivierte UI-Simulation: <strong>{adminSimulationTier} PREVIEW</strong> (Das echte Firebase-Feld <code className="bg-amber-100 px-1 py-0.5 rounded">subscriptionTier</code> bleibt unberührt).
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdminSimulationTier(null)}
                    className="text-[11px] font-bold text-amber-800 underline"
                  >
                    Beenden
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {userPresets.map((preset, idx) => {
                  const isCurrent = user.name === preset.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        updateUserProfile(preset);
                        showToast(`Profil gewechselt: ${preset.name}`);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        isCurrent
                          ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                          : 'bg-zinc-50/60 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900">{preset.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Aktiv
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        {preset.diet} • {preset.allergies?.length ? preset.allergies.join(', ') : 'Keine Allergien'}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Ausschluss: {preset.excludedIngredients?.join(', ') || 'Keine'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ============================================================ */}
            {/* FREE & PRO ENTITLEMENT TESTING LAB & SIMULATION              */}
            {/* ============================================================ */}
            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900 flex items-center gap-2">
                      <span>FREE / PRO Entitlement Lab & Simulation</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        effectiveTier === 'PRO' ? 'bg-amber-100 text-amber-900' : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        Aktiv: {effectiveTier}
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Teste Paywalls, tägliche Scan-Quoten und Feature-Sperren in Sekundenschnelle.
                    </p>
                  </div>
                </div>

                {/* Quick Simulation Toggles */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminSimulationTier('FREE');
                      showToast('Vorschau: FREE Modus aktiviert');
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                      effectiveTier === 'FREE' && adminSimulationTier === 'FREE'
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                    }`}
                  >
                    FREE Vorschau
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminSimulationTier('PRO');
                      showToast('Vorschau: PRO Modus aktiviert');
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                      effectiveTier === 'PRO' && adminSimulationTier === 'PRO'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <Crown className="w-3 h-3 text-amber-600" />
                    <span>PRO Vorschau</span>
                  </button>

                  {adminSimulationTier !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSimulationTier(null);
                        showToast('Simulation beendet: Reales Nutzerkonto aktiv');
                      }}
                      className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 underline px-1"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Scan Quota Simulator */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tägliche Scan-Simulation (Aktuell: {user.dailyScanCount || 0} / 5 verbraucht)</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    Status: {canPerformScan().allowed ? 'Scannen erlaubt' : '⛔ Limit erreicht'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateUserProfile({ dailyScanCount: 0 });
                      showToast('Scan-Zähler auf 0 gesetzt (5 Scans frei)');
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-zinc-200 hover:border-emerald-500 text-zinc-700 transition-colors"
                  >
                    0 Scans (5 frei)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateUserProfile({ dailyScanCount: 4 });
                      showToast('Scan-Zähler auf 4 gesetzt (1 Scan frei)');
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-zinc-200 hover:border-amber-500 text-zinc-700 transition-colors"
                  >
                    4 Scans (1 frei)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateUserProfile({ dailyScanCount: 5 });
                      showToast('Scan-Zähler auf 5 gesetzt (Limit erreicht)');
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 transition-colors"
                  >
                    5 Scans (Limit voll)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateUserProfile({ dailyScanCount: 0 });
                      showToast('Tageszähler vollständig zurückgesetzt');
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors ml-auto flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Paywall Context Test Triggers */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide block">
                  Paywall-Kontexte direkt testen
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => openPaywall('scans')}
                    className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left text-xs font-medium text-zinc-700 transition-colors"
                  >
                    ⚡ Scans Limit Paywall
                  </button>
                  <button
                    type="button"
                    onClick={() => openPaywall('lists')}
                    className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left text-xs font-medium text-zinc-700 transition-colors"
                  >
                    📋 Listen Limit Paywall
                  </button>
                  <button
                    type="button"
                    onClick={() => openPaywall('history')}
                    className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left text-xs font-medium text-zinc-700 transition-colors"
                  >
                    🕒 Verlauf Limit Paywall
                  </button>
                  <button
                    type="button"
                    onClick={() => openPaywall('personal_match')}
                    className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left text-xs font-medium text-zinc-700 transition-colors"
                  >
                    ✨ Match % Paywall
                  </button>
                  <button
                    type="button"
                    onClick={() => openPaywall('alternatives')}
                    className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left text-xs font-medium text-zinc-700 transition-colors"
                  >
                    🥗 Alternativen Paywall
                  </button>
                  <button
                    type="button"
                    onClick={() => openPaywall('meal_log')}
                    className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left text-xs font-medium text-zinc-700 transition-colors"
                  >
                    🔥 Meal Tracking Paywall
                  </button>
                  <button
                    type="button"
                    onClick={() => openPaywall('general')}
                    className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left text-xs font-medium text-zinc-700 transition-colors col-span-2"
                  >
                    👑 Allgemeiner PRO Dialog
                  </button>
                </div>
              </div>

              {/* Feature Matrix Table */}
              <div className="overflow-x-auto pt-1">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 font-bold uppercase text-[10px]">
                      <th className="py-2 pr-3">Funktion / Feature</th>
                      <th className="py-2 px-3">FREE Plan</th>
                      <th className="py-2 px-3">PRO Plan</th>
                      <th className="py-2 pl-3 text-right">Aktuell ({effectiveTier})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    <tr>
                      <td className="py-2.5 pr-3 font-semibold text-zinc-900">Tägliche Scans</td>
                      <td className="py-2.5 px-3">5 Scans / Tag</td>
                      <td className="py-2.5 px-3 text-amber-600 font-bold">Unbegrenzt</td>
                      <td className="py-2.5 pl-3 text-right font-mono font-bold">
                        {getFeatureLimit('dailyScans') === Infinity ? 'Unbegrenzt' : `${getFeatureLimit('dailyScans')} / Tag`}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-semibold text-zinc-900">Einkaufslisten</td>
                      <td className="py-2.5 px-3">1 Liste</td>
                      <td className="py-2.5 px-3 text-amber-600 font-bold">Unbegrenzt</td>
                      <td className="py-2.5 pl-3 text-right font-mono font-bold">
                        {getFeatureLimit('shoppingLists') === Infinity ? 'Unbegrenzt' : `${getFeatureLimit('shoppingLists')} Liste`}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-semibold text-zinc-900">Scan-Verlauf</td>
                      <td className="py-2.5 px-3">20 Produkte</td>
                      <td className="py-2.5 px-3 text-amber-600 font-bold">Unbegrenzt</td>
                      <td className="py-2.5 pl-3 text-right font-mono font-bold">
                        {getFeatureLimit('historyItems') === Infinity ? 'Unbegrenzt' : `${getFeatureLimit('historyItems')} Einträge`}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-semibold text-zinc-900">Persönlicher Match %</td>
                      <td className="py-2.5 px-3 text-zinc-400">Teaser (unscharf)</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Vollständig</td>
                      <td className="py-2.5 pl-3 text-right font-bold">
                        {hasFeature('personalMatch') ? '✅ Aktiv' : '🔒 Gesperrt'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-semibold text-zinc-900">Gesündere Alternativen</td>
                      <td className="py-2.5 px-3">1 Alternative</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Alle Alternativen</td>
                      <td className="py-2.5 pl-3 text-right font-bold">
                        {hasFeature('unlimitedAlternatives') ? '✅ Alle' : '1 (Basis)'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-semibold text-zinc-900">Mahlzeiten-Tracker</td>
                      <td className="py-2.5 px-3 text-zinc-400">Gesperrt</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Freigeschaltet</td>
                      <td className="py-2.5 pl-3 text-right font-bold">
                        {hasFeature('mealLogging') ? '✅ Aktiv' : '🔒 Gesperrt'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-semibold text-zinc-900">Wasserzähler</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Inklusive</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Inklusive</td>
                      <td className="py-2.5 pl-3 text-right font-bold text-emerald-600">
                        ✅ Aktiv
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Users & Roles Management (Firebase Firestore) */}
        {adminTab === 'users' && (
          <div className="space-y-4">
            {/* Header with reload and info */}
            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-900 tracking-tight">
                      Firebase Nutzer- & Rechteverwaltung
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Rollen (USER / ADMIN) und Abo-Status (FREE / PRO) in Echtzeit in Cloud Firestore verwalten.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchUsers}
                    disabled={isLoadingUsers}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-purple-600' : 'text-zinc-600'}`} />
                    <span>{isLoadingUsers ? 'Lade Nutzer...' : 'Aktualisieren'}</span>
                  </button>
                </div>
              </div>

              {/* KPI Mini-Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Registriert</span>
                  <span className="text-xl font-black text-zinc-900 mt-0.5 block">{dbUsers.length}</span>
                  <span className="text-[10px] text-zinc-500">Konten in Firestore</span>
                </div>
                <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Free Nutzer</span>
                  <span className="text-xl font-black text-zinc-700 mt-0.5 block">
                    {dbUsers.filter(u => (u.subscriptionTier || (u.isPro ? 'PRO' : 'FREE')) === 'FREE').length}
                  </span>
                  <span className="text-[10px] text-zinc-500">Basis-Funktionen</span>
                </div>
                <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pro Abonnenten</span>
                  <span className="text-xl font-black text-amber-700 mt-0.5 block">
                    {dbUsers.filter(u => (u.subscriptionTier || (u.isPro ? 'PRO' : 'FREE')) === 'PRO').length}
                  </span>
                  <span className="text-[10px] text-amber-800 font-medium">Volle Entitlements</span>
                </div>
                <div className="bg-purple-50/60 p-3 rounded-2xl border border-purple-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Admins</span>
                  <span className="text-xl font-black text-purple-700 mt-0.5 block">
                    {dbUsers.filter(u => u.role === 'ADMIN').length}
                  </span>
                  <span className="text-[10px] text-purple-800 font-medium">Volle Admin-Rechte</span>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-zinc-100">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Nutzer suchen nach Name oder E-Mail..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {(['ALL', 'FREE', 'PRO', 'ADMIN'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setUserFilterTier(filter)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                        userFilterTier === filter
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {filter === 'ALL' && `Alle (${dbUsers.length})`}
                      {filter === 'FREE' && `Free (${dbUsers.filter(u => (u.subscriptionTier || 'FREE') === 'FREE').length})`}
                      {filter === 'PRO' && `Pro (${dbUsers.filter(u => (u.subscriptionTier || (u.isPro ? 'PRO' : 'FREE')) === 'PRO').length})`}
                      {filter === 'ADMIN' && `Admins (${dbUsers.filter(u => u.role === 'ADMIN').length})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users List Cards */}
            <div className="space-y-3">
              {dbUsers
                .filter(u => {
                  if (userSearchTerm) {
                    const matchName = u.name?.toLowerCase().includes(userSearchTerm.toLowerCase());
                    const matchEmail = u.email?.toLowerCase().includes(userSearchTerm.toLowerCase());
                    if (!matchName && !matchEmail) return false;
                  }
                  if (userFilterTier === 'ADMIN') return u.role === 'ADMIN';
                  const tier = u.subscriptionTier || (u.isPro ? 'PRO' : 'FREE');
                  if (userFilterTier === 'FREE') return tier === 'FREE';
                  if (userFilterTier === 'PRO') return tier === 'PRO';
                  return true;
                })
                .map((u) => {
                  const isCurrent = u.uid === user.uid;
                  const isUserAdmin = u.role === 'ADMIN';
                  const userTier = u.subscriptionTier || (u.isPro ? 'PRO' : 'FREE');
                  const isUpdating = updatingUid === u.uid;

                  return (
                    <div
                      key={u.uid}
                      className={`bg-white rounded-3xl p-4 border transition-all shadow-xs ${
                        isCurrent ? 'border-purple-300 ring-2 ring-purple-100' : 'border-zinc-200/80'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* User Identity & Info */}
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm uppercase shrink-0 ${
                            isUserAdmin 
                              ? 'bg-purple-100 text-purple-800 ring-2 ring-purple-300' 
                              : userTier === 'PRO' 
                              ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-300' 
                              : 'bg-zinc-100 text-zinc-700'
                          }`}>
                            {u.name ? u.name.charAt(0) : (u.email ? u.email.charAt(0) : 'U')}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-zinc-900 truncate">
                                {u.name || 'Unbenannter Nutzer'}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                                  Du (Aktuell angemeldet)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                              <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="truncate">{u.email || 'Keine E-Mail'}</span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                              <span className="font-mono">UID: {u.uid.slice(0, 10)}...</span>
                              <span>•</span>
                              <span>Ernährung: {u.diet || 'Allesesser'}</span>
                              <span>•</span>
                              <span>Scans heute: {u.dailyScanCount || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Badges & Actions */}
                        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                          {/* Role Badge & Toggle Button */}
                          <div className="flex items-center gap-1.5 bg-zinc-50 p-1.5 rounded-2xl border border-zinc-200/80">
                            <span className={`text-[10px] font-black px-2 py-1 rounded-xl flex items-center gap-1 ${
                              isUserAdmin
                                ? 'bg-purple-600 text-white'
                                : 'bg-zinc-200 text-zinc-700'
                            }`}>
                              <Shield className="w-3 h-3" />
                              {isUserAdmin ? 'ADMIN' : 'USER'}
                            </span>

                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleToggleUserRole(u)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                                isUserAdmin
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                              } disabled:opacity-50`}
                            >
                              {isUserAdmin ? 'Rechte entziehen' : 'Zu Admin machen'}
                            </button>
                          </div>

                          {/* Plan Badge & Toggle Button */}
                          <div className="flex items-center gap-1.5 bg-zinc-50 p-1.5 rounded-2xl border border-zinc-200/80">
                            <span className={`text-[10px] font-black px-2 py-1 rounded-xl flex items-center gap-1 ${
                              userTier === 'PRO'
                                ? 'bg-amber-400 text-amber-950 font-black'
                                : 'bg-zinc-200 text-zinc-600'
                            }`}>
                              <Crown className="w-3 h-3" />
                              {userTier}
                            </span>

                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleToggleUserPro(u)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                                userTier === 'PRO'
                                  ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                                  : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 shadow-2xs'
                              } disabled:opacity-50`}
                            >
                              {userTier === 'PRO' ? 'PRO entziehen' : 'PRO aktivieren'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {dbUsers.length === 0 && !isLoadingUsers && (
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 text-center space-y-2">
                  <Users className="w-8 h-8 text-zinc-300 mx-auto" />
                  <h4 className="text-sm font-bold text-zinc-800">Keine Nutzerkonten gefunden</h4>
                  <p className="text-xs text-zinc-400">
                    Sobald sich Nutzer über Firebase Authentication registrieren, erscheinen sie hier.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Products Database */}
        {adminTab === 'products' && (
          <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-sm text-zinc-900">
                  Produktdatenbank verwalten
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {filteredProducts.length} von {products.length} geladen
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Produkt filtern..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="divide-y divide-zinc-100 max-h-[65vh] overflow-y-auto">
              {filteredProducts.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3 hover:bg-zinc-50/50 px-2 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-12 h-12 rounded-xl object-cover bg-zinc-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">{p.brand}</span>
                        <span className="text-[10px] text-zinc-300">•</span>
                        <span className="text-[10px] font-mono text-zinc-400">{p.barcode}</span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-900 truncate">{p.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                        <span className="font-bold text-emerald-600">Score {p.goodiesScore}</span>
                        <span>Nutri {p.nutriScore}</span>
                        <span>Nova {p.novaScore}</span>
                        <span>{p.nutritionPer100g.calories} kcal</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditProduct(p)}
                      className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openProductDetail(p)}
                      className="p-2 text-zinc-400 hover:text-zinc-700 transition-colors"
                      title="Ansehen"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProduct(p.id)}
                      className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Unknown Barcodes */}
        {adminTab === 'unknown-barcodes' && (
          <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-sm text-zinc-900">
                  Gemeldete unbekannte Barcodes
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Synchronisiert mit der Cloud-Datenbank (unknown_barcodes).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-100 p-0.5 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setBarcodeFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      barcodeFilter === 'ALL' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Alle ({unknownBarcodes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      barcodeFilter === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Offen ({unknownBarcodes.filter(b => b.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeFilter('resolved')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      barcodeFilter === 'resolved' ? 'bg-white text-emerald-700 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Gelöst ({unknownBarcodes.filter(b => b.status === 'resolved').length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshBarcodes}
                  disabled={isRefreshingBarcodes}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-all disabled:opacity-50"
                  title="Aus Firestore neu laden"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingBarcodes ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Neu laden</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {unknownBarcodes
                .filter(item => {
                  if (barcodeFilter === 'pending') return item.status === 'pending';
                  if (barcodeFilter === 'resolved') return item.status === 'resolved';
                  return true;
                })
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-zinc-900">
                          {item.barcode}
                        </span>
                        {item.status === 'resolved' ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Gelöst
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            Prüfung ausstehend
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-500 block mt-0.5">
                        {item.notes || 'Keine Zusatznotiz angegeben'} • {item.reportedAt}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              resetProductForm();
                              setFormBarcode(item.barcode);
                              if (item.notes) setFormName(item.notes);
                              setAdminTab('create-product');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
                          >
                            Produkt anlegen
                          </button>
                          <button
                            type="button"
                            onClick={() => resolveUnknownBarcode(item.id)}
                            className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-colors"
                          >
                            Als gelöst markieren
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            resetProductForm();
                            setFormBarcode(item.barcode);
                            if (item.notes) setFormName(item.notes);
                            setAdminTab('create-product');
                          }}
                          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-colors"
                        >
                          Details bearbeiten
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteUnknownBarcode(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Eintrag löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

              {unknownBarcodes.length === 0 && (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  Aktuell liegen keine gemeldeten unbekannten Barcodes vor.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Reports & Meldungen */}
        {adminTab === 'reports' && (
          <div className="space-y-4">
            {/* Header with KPI and Refresh */}
            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span>Gemeldete Produktanalysen & Bugs</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Prüfe Nutzer-Feedback zu falschen Angaben, fehlerhaften Barcodes oder technischen App-Problemen.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isRefreshingReports}
                  onClick={async () => {
                    setIsRefreshingReports(true);
                    try {
                      await refreshReports();
                      showToast('Meldungen aktualisiert');
                    } finally {
                      setIsRefreshingReports(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingReports ? 'animate-spin text-emerald-600' : 'text-zinc-500'}`} />
                  <span>Aktualisieren</span>
                </button>
              </div>
            </div>

            {/* KPI Status Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div 
                onClick={() => setReportStatusFilter('pending')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  reportStatusFilter === 'pending'
                    ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800">Offen</span>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-2xl font-black text-zinc-900 mt-1 block">
                  {reports.filter(r => r.status === 'pending').length}
                </span>
                <span className="text-[10px] text-zinc-400">Ausstehende Prüfung</span>
              </div>

              <div 
                onClick={() => setReportStatusFilter('in_review')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  reportStatusFilter === 'in_review'
                    ? 'bg-blue-50/80 border-blue-300 shadow-xs'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-800">In Prüfung</span>
                  <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-2xl font-black text-zinc-900 mt-1 block">
                  {reports.filter(r => r.status === 'in_review').length}
                </span>
                <span className="text-[10px] text-zinc-400">Wird bearbeitet</span>
              </div>

              <div 
                onClick={() => setReportStatusFilter('resolved')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  reportStatusFilter === 'resolved'
                    ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800">Behoben</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-2xl font-black text-zinc-900 mt-1 block">
                  {reports.filter(r => r.status === 'resolved').length}
                </span>
                <span className="text-[10px] text-zinc-400">Abgeschlossen</span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl p-3 border border-zinc-200 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-bold text-zinc-400 mr-1.5 shrink-0">Typ:</span>
                <button
                  type="button"
                  onClick={() => setReportTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    reportTypeFilter === 'all'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Alle ({reports.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReportTypeFilter('product')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                    reportTypeFilter === 'product'
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <Package className="w-3 h-3" />
                  <span>Produkte ({reports.filter(r => r.type === 'product').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportTypeFilter('bug')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                    reportTypeFilter === 'bug'
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <Bug className="w-3 h-3" />
                  <span>Bugs ({reports.filter(r => r.type === 'bug').length})</span>
                </button>

                <div className="h-4 w-px bg-zinc-200 mx-1 shrink-0" />

                <span className="text-[11px] font-bold text-zinc-400 mr-1.5 shrink-0">Status:</span>
                <button
                  type="button"
                  onClick={() => setReportStatusFilter('all')}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap ${
                    reportStatusFilter === 'all'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={() => setReportStatusFilter('pending')}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap ${
                    reportStatusFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  Offen
                </button>
                <button
                  type="button"
                  onClick={() => setReportStatusFilter('in_review')}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap ${
                    reportStatusFilter === 'in_review'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  In Prüfung
                </button>
                <button
                  type="button"
                  onClick={() => setReportStatusFilter('resolved')}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap ${
                    reportStatusFilter === 'resolved'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Behoben
                </button>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={reportSearchTerm}
                  onChange={(e) => setReportSearchTerm(e.target.value)}
                  placeholder="Meldungen durchsuchen..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            {/* Reports List */}
            <div className="space-y-3">
              {reports
                .filter(r => {
                  if (reportTypeFilter !== 'all' && r.type !== reportTypeFilter) return false;
                  if (reportStatusFilter !== 'all' && r.status !== reportStatusFilter) return false;
                  if (reportSearchTerm.trim()) {
                    const q = reportSearchTerm.toLowerCase();
                    const matchReason = r.reason.toLowerCase().includes(q);
                    const matchDetails = (r.details || '').toLowerCase().includes(q);
                    const matchProd = (r.productName || '').toLowerCase().includes(q) || (r.productBarcode || '').includes(q);
                    const matchUser = (r.userName || '').toLowerCase().includes(q) || (r.userEmail || '').toLowerCase().includes(q);
                    if (!matchReason && !matchDetails && !matchProd && !matchUser) return false;
                  }
                  return true;
                })
                .map((r) => {
                  const linkedProd = products.find(p => p.id === r.productId || (r.productBarcode && p.barcode === r.productBarcode));
                  return (
                    <div
                      key={r.id}
                      className={`bg-white rounded-3xl p-5 border transition-all space-y-3 shadow-xs ${
                        r.status === 'pending'
                          ? 'border-amber-200/90'
                          : r.status === 'in_review'
                          ? 'border-blue-200/90'
                          : 'border-zinc-200 opacity-80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            r.type === 'product'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {r.type === 'product' ? <Package className="w-5 h-5" /> : <Bug className="w-5 h-5" />}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                r.type === 'product'
                                  ? 'bg-amber-100/70 text-amber-800'
                                  : 'bg-purple-100/70 text-purple-800'
                              }`}>
                                {r.type === 'product' ? 'Produktanalyse' : 'App-Problem'}
                              </span>

                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                r.status === 'pending'
                                  ? 'bg-amber-500 text-white'
                                  : r.status === 'in_review'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                {r.status === 'pending' ? 'Offen' : r.status === 'in_review' ? 'In Prüfung' : 'Behoben'}
                              </span>

                              <span className="text-[11px] text-zinc-400">
                                {r.createdAt ? new Date(r.createdAt).toLocaleString('de-DE') : 'Kürzlich'}
                              </span>
                            </div>

                            <h4 className="font-black text-sm text-zinc-900 pt-0.5">
                              {r.reason}
                            </h4>

                            {(r.userName || r.userEmail) && (
                              <p className="text-[11px] text-zinc-500">
                                Gemeldet von: <span className="font-semibold text-zinc-700">{r.userName || r.userEmail}</span>
                                {r.userEmail && r.userName && ` (${r.userEmail})`}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Controls */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          {r.status !== 'in_review' && (
                            <button
                              type="button"
                              onClick={() => {
                                updateReportStatus(r.id, 'in_review');
                                showToast('Status auf „In Prüfung“ gesetzt');
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                              title="In Prüfung nehmen"
                            >
                              In Prüfung
                            </button>
                          )}

                          {r.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => {
                                updateReportStatus(r.id, 'resolved');
                                showToast('Meldung als behoben markiert');
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer"
                              title="Als behoben markieren"
                            >
                              Als behoben
                            </button>
                          )}

                          {r.status === 'resolved' && (
                            <button
                              type="button"
                              onClick={() => {
                                updateReportStatus(r.id, 'pending');
                                showToast('Meldung wieder geöffnet');
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                              title="Wiedereröffnen"
                            >
                              Wiedereröffnen
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              deleteReport(r.id);
                              showToast('Meldung gelöscht');
                            }}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Meldung löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Product Box if product report */}
                      {r.type === 'product' && (
                        <div className="bg-zinc-50/80 rounded-2xl p-3 border border-zinc-200/80 flex items-center justify-between gap-2">
                          <div className="text-xs">
                            <span className="font-bold text-zinc-800">
                              {r.productName || (linkedProd ? linkedProd.name : 'Unbenanntes Produkt')}
                            </span>
                            {(r.productBrand || linkedProd?.brand) && (
                              <span className="text-zinc-500 ml-1.5">
                                • {r.productBrand || linkedProd?.brand}
                              </span>
                            )}
                            {(r.productBarcode || linkedProd?.barcode) && (
                              <span className="font-mono text-[11px] text-zinc-400 ml-2">
                                [EAN: {r.productBarcode || linkedProd?.barcode}]
                              </span>
                            )}
                          </div>

                          {linkedProd && (
                            <button
                              type="button"
                              onClick={() => openProductDetail(linkedProd)}
                              className="px-2.5 py-1 rounded-xl bg-white border border-zinc-200 hover:border-emerald-300 text-emerald-700 text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                            >
                              <span>Zum Produkt</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Details Box */}
                      {r.details && (
                        <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-200/60 text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                          <span className="font-bold text-zinc-500 block mb-0.5 text-[10px] uppercase tracking-wider">
                            Details & Beschreibung:
                          </span>
                          {r.details}
                        </div>
                      )}
                    </div>
                  );
                })}

              {reports.length === 0 && (
                <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 shadow-xs space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-sm text-zinc-900">Keine offenen Meldungen</h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Super! Zurzeit liegen weder Beschwerden über falsche Produktangaben noch gemeldete App-Bugs vor.
                  </p>
                </div>
              )}

              {reports.length > 0 && reports.filter(r => {
                if (reportTypeFilter !== 'all' && r.type !== reportTypeFilter) return false;
                if (reportStatusFilter !== 'all' && r.status !== reportStatusFilter) return false;
                if (reportSearchTerm.trim()) {
                  const q = reportSearchTerm.toLowerCase();
                  const matchReason = r.reason.toLowerCase().includes(q);
                  const matchDetails = (r.details || '').toLowerCase().includes(q);
                  const matchProd = (r.productName || '').toLowerCase().includes(q) || (r.productBarcode || '').includes(q);
                  const matchUser = (r.userName || '').toLowerCase().includes(q) || (r.userEmail || '').toLowerCase().includes(q);
                  if (!matchReason && !matchDetails && !matchProd && !matchUser) return false;
                }
                return true;
              }).length === 0 && (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  Keine Meldungen entsprechen den aktuellen Filterkriterien.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Create or Edit Product Form */}
        {adminTab === 'create-product' && (
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-zinc-900">
                  {editingProductId ? `Produkt bearbeiten: ${formName || 'Ohne Name'}` : 'Neues Produkt in Goodies aufnehmen'}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {editingProductId 
                    ? 'Passe Produktdaten, Bild-URL oder Nährwerte direkt an.' 
                    : 'Trage die Produktdaten ein, um sie allen Nutzern im Scanner bereitzustellen.'}
                </p>
              </div>
              {editingProductId && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  Bearbeitungsmodus
                </span>
              )}
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Image URL with live preview */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3.5 space-y-2">
                <label className="text-[11px] font-bold text-zinc-700 flex items-center justify-between">
                  <span>Produktbild über Bild-URL festlegen oder ändern</span>
                  {formImageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      className="text-[10px] text-rose-500 hover:underline font-normal"
                    >
                      Bild entfernen
                    </button>
                  )}
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-zinc-200 bg-white overflow-hidden shrink-0 flex items-center justify-center relative shadow-xs">
                    {formImageUrl ? (
                      <img
                        src={formImageUrl}
                        alt="Vorschau"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-zinc-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="url"
                      placeholder="https://images.openfoodfacts.org/... oder https://images.unsplash.com/..."
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-zinc-400">
                      Gültige HTTPS Bild-URL einfügen (z. B. von OpenFoodFacts oder Hersteller-CDN).
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">EAN-Barcode *</label>
                  <input
                    type="text"
                    required
                    placeholder="z. B. 4008400404127"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">Produktname *</label>
                  <input
                    type="text"
                    required
                    placeholder="z. B. Bio Haferdrink Barista"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">Marke</label>
                  <input
                    type="text"
                    placeholder="z. B. Oatly"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">Menge / Packungsgröße</label>
                  <input
                    type="text"
                    placeholder="z. B. 1000 ml"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">Goodies Score (0-100)</label>
                  <CleanNumberInput
                    min={0}
                    max={100}
                    value={formGoodiesScore}
                    onChange={setFormGoodiesScore}
                    placeholder="85"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">Nutri-Score</label>
                  <select
                    value={formNutriScore}
                    onChange={(e) => setFormNutriScore(e.target.value as NutriScore)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="A">Nutri-Score A</option>
                    <option value="B">Nutri-Score B</option>
                    <option value="C">Nutri-Score C</option>
                    <option value="D">Nutri-Score D</option>
                    <option value="E">Nutri-Score E</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">Nova-Score (1-4)</label>
                  <select
                    value={formNovaScore}
                    onChange={(e) => setFormNovaScore(Number(e.target.value) as NovaScore)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value={1}>1 - Unverarbeitet</option>
                    <option value={2}>2 - Kulinarische Zutat</option>
                    <option value={3}>3 - Verarbeitet</option>
                    <option value={4}>4 - Hochverarbeitet</option>
                  </select>
                </div>
              </div>

              {/* Nutrition */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Kalorien</label>
                  <CleanNumberInput
                    value={formCalories}
                    onChange={setFormCalories}
                    placeholder="0"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1.5 text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Protein (g)</label>
                  <CleanNumberInput
                    step={0.1}
                    value={formProtein}
                    onChange={setFormProtein}
                    placeholder="0"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1.5 text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Kohlenhydr.</label>
                  <CleanNumberInput
                    step={0.1}
                    value={formCarbs}
                    onChange={setFormCarbs}
                    placeholder="0"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1.5 text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Zucker (g)</label>
                  <CleanNumberInput
                    step={0.1}
                    value={formSugars}
                    onChange={setFormSugars}
                    placeholder="0"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1.5 text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Fett (g)</label>
                  <CleanNumberInput
                    step={0.1}
                    value={formFat}
                    onChange={setFormFat}
                    placeholder="0"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1.5 text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Ballastst. (g)</label>
                  <CleanNumberInput
                    step={0.1}
                    value={formFiber}
                    onChange={setFormFiber}
                    placeholder="0"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1.5 text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Ingredients & Labels */}
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Zutatenliste</label>
                <textarea
                  rows={2}
                  value={formIngredients}
                  onChange={(e) => setFormIngredients(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Labels (kommagetrennt)</label>
                <input
                  type="text"
                  value={formLabels}
                  onChange={(e) => setFormLabels(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-6 rounded-2xl shadow-sm transition-all"
                >
                  {editingProductId ? 'Änderungen speichern' : 'Produkt speichern & veröffentlichen'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs py-3 px-4 rounded-2xl transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
