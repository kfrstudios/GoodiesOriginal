import { Gender, ActivityLevel, HealthGoal } from '../types';

interface NutritionMetricsInput {
  gender?: Gender;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  healthGoal?: HealthGoal;
  priorities?: string[];
}

export interface CalculatedDailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  maxSugar: number;
  maxSalt: number;
}

/**
 * Calculates scientifically grounded daily calorie, macro, and water targets
 * using the Mifflin-St Jeor equation and tailored macronutrient ratios.
 */
export function calculateDailyTargets(input: NutritionMetricsInput): CalculatedDailyGoals {
  const weight = input.weightKg && input.weightKg > 30 && input.weightKg < 250 ? input.weightKg : 70;
  const height = input.heightCm && input.heightCm > 100 && input.heightCm < 240 ? input.heightCm : 175;
  const age = input.age && input.age > 10 && input.age < 110 ? input.age : 30;
  const gender = input.gender || 'other';

  // Mifflin-St Jeor formula for Basal Metabolic Rate (BMR)
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else if (gender === 'female') {
    bmr -= 161;
  } else {
    bmr -= 78; // neutral midpoint
  }

  // Activity Level Multiplier (PAL)
  let pal = 1.35;
  switch (input.activityLevel) {
    case 'sedentary':
      pal = 1.2;
      break;
    case 'light':
      pal = 1.375;
      break;
    case 'moderate':
      pal = 1.55;
      break;
    case 'active':
      pal = 1.725;
      break;
    case 'very_active':
      pal = 1.9;
      break;
    default:
      pal = 1.4;
  }

  let tdee = Math.round(bmr * pal);

  // Goal adjustments
  switch (input.healthGoal) {
    case 'lose_weight':
      tdee = Math.round(tdee * 0.82); // ~18% deficit
      break;
    case 'build_muscle':
      tdee = Math.round(tdee * 1.12); // ~12% surplus
      break;
    case 'healthy_eating':
    case 'maintain':
    default:
      // maintenance
      break;
  }

  // Safety clamps for daily calories
  const finalCalories = Math.max(1400, Math.min(4200, tdee));

  // Protein targets (g / kg bodyweight)
  let proteinFactor = 1.4;
  if (input.healthGoal === 'build_muscle' || input.priorities?.includes('Mehr Eiweiß')) {
    proteinFactor = 1.9;
  } else if (input.healthGoal === 'lose_weight') {
    proteinFactor = 1.6;
  }
  const protein = Math.round(weight * proteinFactor);

  // Fat targets (~25-30% of energy)
  const fatCalories = finalCalories * 0.28;
  const fat = Math.round(fatCalories / 9);

  // Carbs from remaining calories (4 kcal / g)
  const proteinCalories = protein * 4;
  const remainingCalories = Math.max(0, finalCalories - proteinCalories - fatCalories);
  const carbs = Math.round(remainingCalories / 4);

  // Water: ~35ml per kg bodyweight, minimum 2000ml, maximum 4500ml
  let water = Math.round(weight * 35);
  if (input.activityLevel === 'active' || input.activityLevel === 'very_active') {
    water += 500;
  }
  water = Math.max(2000, Math.min(4500, Math.round(water / 250) * 250));

  // Max sugar: WHO recommendation < 10% or < 5% of energy
  let maxSugar = Math.round((finalCalories * 0.08) / 4); // ~8% energy
  if (input.priorities?.includes('Weniger Zucker')) {
    maxSugar = Math.min(30, Math.round((finalCalories * 0.05) / 4));
  }

  // Max salt: WHO recommendation < 5-6g/day
  let maxSalt = 6;
  if (input.priorities?.includes('Weniger Salz')) {
    maxSalt = 4.5;
  }

  return {
    calories: finalCalories,
    protein,
    carbs,
    fat,
    water,
    maxSugar,
    maxSalt
  };
}
