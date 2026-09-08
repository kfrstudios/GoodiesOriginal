import { Product, UserProfile } from '../types';

export interface ScoreDimension {
  name: string;
  score: number; // 0 - 100
  maxPoints: number;
  earnedPoints: number;
  weight: string;
  status: 'excellent' | 'good' | 'moderate' | 'poor';
  description: string;
}

export interface DetailedFactor {
  title: string;
  value: string;
  explanation: string;
  type: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
}

export interface ProductInsightReport {
  whyScoreSummary: string;
  dimensions: ScoreDimension[];
  positiveFactors: DetailedFactor[];
  negativeFactors: DetailedFactor[];
  personalMeaning: {
    portionCheck: string;
    satietyAndEnergy: string;
    goalAlignment: string[];
    riskAdvice?: string;
  };
  keyRecommendation: string;
}

/**
 * Generates an in-depth breakdown answering the 4 core product questions.
 */
export function generateProductScoreExplanation(
  product: Product,
  user?: UserProfile
): ProductInsightReport {
  const nut = product.nutritionPer100g || {
    calories: product.calories || 0,
    protein: product.protein || 0,
    carbohydrates: product.carbs || 0,
    sugars: product.sugar || 0,
    fat: product.fat || 0,
    saturatedFat: product.saturatedFat || 0,
    fiber: product.fiber || 0,
    salt: product.salt || 0,
  };

  const additives = product.additives || [];
  const nova = product.novaScore || 1;
  const goodiesScore = product.goodiesScore || 70;

  // 1. Dimensions Breakdown
  // Dimension A: Nährwertbalance (40%)
  let nutritionScore = 100;
  if (nut.sugars > 20) nutritionScore -= 40;
  else if (nut.sugars > 10) nutritionScore -= 20;
  else if (nut.sugars > 5) nutritionScore -= 10;

  if (nut.saturatedFat > 8) nutritionScore -= 25;
  else if (nut.saturatedFat > 4) nutritionScore -= 15;

  if (nut.salt > 1.5) nutritionScore -= 25;
  else if (nut.salt > 0.8) nutritionScore -= 15;

  if (nut.protein >= 10) nutritionScore += 15;
  else if (nut.protein >= 5) nutritionScore += 8;

  if (nut.fiber >= 6) nutritionScore += 15;
  else if (nut.fiber >= 3) nutritionScore += 8;
  nutritionScore = Math.max(10, Math.min(100, nutritionScore));

  // Dimension B: Verarbeitungsgrad NOVA (30%)
  const novaScores: Record<number, number> = { 1: 100, 2: 85, 3: 65, 4: 35 };
  const processingScore = novaScores[nova] || 60;

  // Dimension C: Zusatzstoffe & E-Nummern (20%)
  let additiveScore = 100;
  const highRisk = additives.filter(a => a.risk === 'high' || a.risk === 'avoid').length;
  const moderateRisk = additives.filter(a => a.risk === 'moderate').length;
  additiveScore -= (highRisk * 35 + moderateRisk * 15 + (additives.length - highRisk - moderateRisk) * 5);
  additiveScore = Math.max(10, Math.min(100, additiveScore));

  // Dimension D: Zusammensetzung & Labels (10%)
  let qualityScore = 75;
  if (product.labels.some(l => /bio|organic|demeter/i.test(l))) qualityScore += 20;
  if (product.labels.some(l => /vegan|vegetarisch|pflanzlich/i.test(l))) qualityScore += 10;
  if (product.labels.some(l => /ohne zuckerzusatz|vollkorn/i.test(l))) qualityScore += 15;
  qualityScore = Math.min(100, qualityScore);

  const dimensions: ScoreDimension[] = [
    {
      name: 'Nährwertqualität',
      score: nutritionScore,
      maxPoints: 40,
      earnedPoints: Math.round((nutritionScore / 100) * 40),
      weight: '40% Gewichtung',
      status: nutritionScore >= 80 ? 'excellent' : nutritionScore >= 60 ? 'good' : nutritionScore >= 40 ? 'moderate' : 'poor',
      description: `Bewertet Makronährstoffe: Zucker (${nut.sugars}g), gesättigte Fette (${nut.saturatedFat}g) sowie wertvolle Proteine (${nut.protein}g) und Ballaststoffe (${nut.fiber}g).`
    },
    {
      name: 'Verarbeitungsgrad (NOVA)',
      score: processingScore,
      maxPoints: 30,
      earnedPoints: Math.round((processingScore / 100) * 30),
      weight: '30% Gewichtung',
      status: nova === 1 ? 'excellent' : nova === 2 ? 'good' : nova === 3 ? 'moderate' : 'poor',
      description: nova === 1 
        ? 'Stufe 1: Naturbelassenes oder minimal verarbeitetes Lebensmittel ohne industrielle Zerlegung.'
        : nova === 2
        ? 'Stufe 2: Kulinarische Grundzutat mit einfacher Verarbeitung.'
        : nova === 3
        ? 'Stufe 3: Verarbeitetes Lebensmittel aus einfachen Komponenten.'
        : 'Stufe 4: Ultra-hochverarbeitet. Enthält industrielle Isolate, Bindemittel oder Modifikationen.'
    },
    {
      name: 'Zusatzstoffe & E-Nummern',
      score: additiveScore,
      maxPoints: 20,
      earnedPoints: Math.round((additiveScore / 100) * 20),
      weight: '20% Gewichtung',
      status: additives.length === 0 ? 'excellent' : highRisk === 0 && moderateRisk === 0 ? 'good' : highRisk > 0 ? 'poor' : 'moderate',
      description: additives.length === 0 
        ? '0 Zusatzstoffe: Vollständig saubere Zutatenliste ohne künstliche Hilfsstoffe.'
        : `${additives.length} Zusatzstoff(e) detektiert (${highRisk > 0 ? `${highRisk} kritisch` : 'überwiegend harmlos'}).`
    },
    {
      name: 'Qualitätskriterien & Siegel',
      score: qualityScore,
      maxPoints: 10,
      earnedPoints: Math.round((qualityScore / 100) * 10),
      weight: '10% Gewichtung',
      status: qualityScore >= 85 ? 'excellent' : qualityScore >= 70 ? 'good' : 'moderate',
      description: product.labels.length > 0
        ? `Zertifizierungen: ${product.labels.join(', ')} fließen positiv in die Gesamtnote ein.`
        : 'Keine besonderen Zusatzsiegel oder Bio-Auszeichnungen hinterlegt.'
    }
  ];

  // 2. Positive Factors
  const positiveFactors: DetailedFactor[] = [];
  if (nut.protein >= 8) {
    positiveFactors.push({
      title: 'Hoher Proteingehalt',
      value: `${nut.protein}g / 100g`,
      explanation: 'Unterstützt effektiven Muskelaufbau, Gewebeerneuerung und lang anhaltende Sättigung.',
      type: 'positive',
      impact: 'high'
    });
  } else if (nut.protein >= 4) {
    positiveFactors.push({
      title: 'Gute Proteinquelle',
      value: `${nut.protein}g / 100g`,
      explanation: 'Liefert wertvolle Aminosäuren für den täglichen Grundbedarf.',
      type: 'positive',
      impact: 'medium'
    });
  }

  if (nut.fiber >= 5) {
    positiveFactors.push({
      title: 'Hervorragender Ballaststoffanteil',
      value: `${nut.fiber}g / 100g`,
      explanation: 'Fördert ein gesundes Mikrobiom im Darm und verlangsamt die Glukoseaufnahme.',
      type: 'positive',
      impact: 'high'
    });
  }

  if (nut.sugars <= 3) {
    positiveFactors.push({
      title: 'Sehr zuckerarm',
      value: `${nut.sugars}g / 100g`,
      explanation: 'Verhindert Insulinspitzen und schützt vor Heißhungerattacken.',
      type: 'positive',
      impact: 'high'
    });
  }

  if (nut.saturatedFat <= 1.5) {
    positiveFactors.push({
      title: 'Wenig gesättigte Fettsäuren',
      value: `${nut.saturatedFat}g / 100g`,
      explanation: 'Günstiges Lipidprofil zur Unterstützung der kardiovaskulären Herzgesundheit.',
      type: 'positive',
      impact: 'medium'
    });
  }

  if (additives.length === 0) {
    positiveFactors.push({
      title: 'Frei von künstlichen Zusatzstoffen',
      value: 'Clean Label',
      explanation: 'Keine Konservierungsstoffe, Farbstoffe, Emulgatoren oder Süßungsmittel enthalten.',
      type: 'positive',
      impact: 'high'
    });
  }

  if (nova <= 2) {
    positiveFactors.push({
      title: 'Geringer Verarbeitungsgrad',
      value: `NOVA ${nova}`,
      explanation: 'Besteht aus natürlichen Rohstoffen ohne industrielle Raffination.',
      type: 'positive',
      impact: 'medium'
    });
  }

  // 3. Negative / Critical Factors
  const negativeFactors: DetailedFactor[] = [];
  if (nut.sugars > 15) {
    const cubes = Math.round((nut.sugars / 3) * 10) / 10;
    negativeFactors.push({
      title: 'Sehr hoher Zuckergehalt',
      value: `${nut.sugars}g / 100g (~${cubes} Zuckerwürfel)`,
      explanation: 'Entspricht einer hohen glykämischen Last mit starkem Blutzuckeranstieg und Insulinausschüttung.',
      type: 'negative',
      impact: 'high'
    });
  } else if (nut.sugars > 8) {
    negativeFactors.push({
      title: 'Erhöhter Zuckeranteil',
      value: `${nut.sugars}g / 100g`,
      explanation: 'Übersteigt die empfohlene Menge für eine zuckerbewusste Ernährung.',
      type: 'negative',
      impact: 'medium'
    });
  }

  if (nut.salt > 1.4) {
    negativeFactors.push({
      title: 'Hoher Salzgehalt',
      value: `${nut.salt}g / 100g`,
      explanation: 'Deckt bereits einen beträchtlichen Teil des maximalen Tagesbedarfs (WHO: max. 5g Salz pro Tag).',
      type: 'negative',
      impact: 'high'
    });
  }

  if (nut.saturatedFat > 5) {
    negativeFactors.push({
      title: 'Hoher Anteil gesättigter Fette',
      value: `${nut.saturatedFat}g / 100g`,
      explanation: 'Ein dauerhaft hoher Konsum kann ungünstige Blutfettwerte und LDL-Cholesterin begünstigen.',
      type: 'negative',
      impact: 'high'
    });
  }

  if (nova === 4) {
    negativeFactors.push({
      title: 'Ultra-hochverarbeitetes Produkt',
      value: 'NOVA 4',
      explanation: 'Industriell hergestellt mit Zutaten wie isolierten Proteinen, Invertzucker oder Aromen.',
      type: 'negative',
      impact: 'high'
    });
  }

  const criticalAdditives = additives.filter(a => a.risk === 'high' || a.risk === 'avoid');
  if (criticalAdditives.length > 0) {
    negativeFactors.push({
      title: 'Bedenkliche Zusatzstoffe gefunden',
      value: criticalAdditives.map(a => `${a.code} (${a.name})`).join(', '),
      explanation: 'Stehen in Studien unter Beobachtung bezüglich Darmflora, Allergiepotenzial oder Stoffwechsel.',
      type: 'negative',
      impact: 'high'
    });
  }

  // 4. "Was bedeutet das für mich?" (Personal Translation)
  const sugarCubes100g = Math.round(nut.sugars / 3);
  let portionText = `Bei einer Standardportion nimmst du ca. ${Math.round(nut.calories * 1.5)} kcal und ${Math.round(nut.sugars * 1.5)}g Zucker zu dir.`;
  if (nut.sugars > 15) {
    portionText = `Vorsicht bei der Portionsgröße: Pro 100g stecken umgerechnet rund ${sugarCubes100g} Stücke Würfelzucker in diesem Produkt. Eine normale Portion liefert schnell über 50% deines empfohlenen Tagesmaximums.`;
  } else if (nut.sugars <= 3) {
    portionText = `Sehr alltagstauglich: Da dieses Produkt mit unter 3g Zucker pro 100g praktisch zuckerfrei ist, belastet es deinen täglichen Glukosehaushalt kaum.`;
  }

  let satietyText = 'Bietet solide Nährstoffe für den Alltag.';
  if (nut.fiber >= 5 && nut.protein >= 8) {
    satietyText = 'Exzellente Sättigungswirkung: Die Kombination aus wertvollen Pflanzen- oder Milchproteinen und Ballaststoffen hält den Magen lange voll und den Blutzuckerspiegel stabil.';
  } else if (nut.fiber < 1.5 && nut.sugars > 12) {
    satietyText = 'Schnelle Verpuffung: Kaum Ballaststoffe bei gleichzeitig schnellen Kohlenhydraten führen dazu, dass die Energie rasch abfällt und zeitnah erneuter Appetit entsteht.';
  }

  // User Goal Alignment
  const goalAlignment: string[] = [];
  const userPriorities = user?.priorities || ['Weniger Zucker', 'Mehr Eiweiß'];

  if (userPriorities.includes('Weniger Zucker')) {
    if (nut.sugars <= 5) {
      goalAlignment.push('✅ Passt ideal zu deinem Ziel „Weniger Zucker“ (unter 5g / 100g).');
    } else {
      goalAlignment.push(`⚠️ Konflikt mit Ziel „Weniger Zucker“: Enthält ${nut.sugars}g Zucker pro 100g.`);
    }
  }

  if (userPriorities.includes('Mehr Eiweiß') || userPriorities.includes('Muskelaufbau')) {
    if (nut.protein >= 8) {
      goalAlignment.push(`✅ Unterstützt dein Ziel „Mehr Eiweiß“: Starke ${nut.protein}g Protein pro 100g.`);
    } else {
      goalAlignment.push(`ℹ️ Liefert moderat Eiweiß (${nut.protein}g). Für ein starkes Proteinprofil sind Alternativen vorzuziehen.`);
    }
  }

  if (userPriorities.includes('Weniger Salz')) {
    if (nut.salt <= 0.3) {
      goalAlignment.push('✅ Sehr natriumarm – ideal für salzbewusste Ernährung.');
    } else if (nut.salt > 1.0) {
      goalAlignment.push(`⚠️ Enthält ${nut.salt}g Salz pro 100g – Salzlimit im Blick behalten.`);
    }
  }

  // Fallback if no specific priorities matched
  if (goalAlignment.length === 0) {
    if (goodiesScore >= 75) {
      goalAlignment.push('✅ Aus ernährungsphysiologischer Sicht bedenkenlos für den regelmäßigen Verzehr empfohlen.');
    } else {
      goalAlignment.push('ℹ️ Eignet sich als gelegentlicher Genuss, sollte jedoch nicht die Basis deiner Hauptmahlzeiten bilden.');
    }
  }

  // Summary headline
  let whyScoreSummary = '';
  if (goodiesScore >= 80) {
    whyScoreSummary = `Mit ${goodiesScore} von 100 Punkten gehört dieses Produkt zu den hochwertigsten Optionen seiner Kategorie. Der Score basiert vor allem auf der sauberen Zusammensetzung (${additives.length === 0 ? 'ohne Zusatzstoffe' : 'wenig Zusätze'}) und der ausgewogenen Nährwertbalance.`;
  } else if (goodiesScore >= 60) {
    whyScoreSummary = `Mit ${goodiesScore} Punkten schneidet das Produkt solide ab. Zwar liefert es solide Nährwerte, Punkteabzüge gibt es jedoch für ${nut.sugars > 8 ? 'den Zuckeranteil' : nut.salt > 1 ? 'den Salzgehalt' : 'den Verarbeitungsgrad'}.`;
  } else {
    whyScoreSummary = `Mit ${goodiesScore} Punkten erhält das Produkt eine kritische Einstufung. Hauptgründe für den niedrigen Score sind ${nut.sugars > 15 ? 'ein sehr hoher Zuckergehalt' : 'ein ungünstiges Fett-/Salzprofil'} und eine ${nova === 4 ? 'ultra-hohe industrielle Verarbeitung' : 'kritische Zutatenliste'}.`;
  }

  return {
    whyScoreSummary,
    dimensions,
    positiveFactors,
    negativeFactors,
    personalMeaning: {
      portionCheck: portionText,
      satietyAndEnergy: satietyText,
      goalAlignment,
      riskAdvice: criticalAdditives.length > 0 ? 'Aufgrund der bedenklichen E-Nummern wird der regelmäßige Verzehr nicht empfohlen.' : undefined
    },
    keyRecommendation: goodiesScore >= 75 ? 'Empfohlene Wahl' : 'Bessere Alternative prüfen'
  };
}
