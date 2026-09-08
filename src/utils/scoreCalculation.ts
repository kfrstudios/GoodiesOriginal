import { NutriScore, NovaScore } from '../types';

export interface ScoreCalculationInput {
  nutriScore?: NutriScore;
  novaScore?: NovaScore;
  calories?: number;
  protein?: number;
  carbs?: number;
  sugars?: number;
  fat?: number;
  saturatedFat?: number;
  fiber?: number;
  salt?: number;
}

/**
 * Calculates a balanced, transparent Goodies-Score (0-100) based on
 * official nutrition parameters per 100g, Nutri-Score, Nova classification,
 * and salt content.
 */
export function calculateGoodiesScoreFromNutrition(input: ScoreCalculationInput): number {
  // 1. Base score derived from Nutri-Score benchmark
  let baseScore = 60;
  switch (input.nutriScore) {
    case 'A':
      baseScore = 90;
      break;
    case 'B':
      baseScore = 78;
      break;
    case 'C':
      baseScore = 62;
      break;
    case 'D':
      baseScore = 44;
      break;
    case 'E':
      baseScore = 24;
      break;
    default:
      baseScore = 65;
  }

  // 2. Adjustments based on degree of processing (Nova Score)
  if (input.novaScore === 1) {
    baseScore += 8; // Unprocessed / fresh
  } else if (input.novaScore === 2) {
    baseScore += 2; // Culinary ingredient
  } else if (input.novaScore === 3) {
    baseScore -= 6; // Processed
  } else if (input.novaScore === 4) {
    baseScore -= 16; // Ultra-processed
  }

  // 3. Positive nutrition bonuses
  const protein = input.protein || 0;
  if (protein >= 15) baseScore += 8;
  else if (protein >= 8) baseScore += 4;

  const fiber = input.fiber || 0;
  if (fiber >= 6) baseScore += 6;
  else if (fiber >= 3) baseScore += 3;

  // 4. Sugar penalties
  const sugars = input.sugars || 0;
  if (sugars > 25) baseScore -= 18;
  else if (sugars > 15) baseScore -= 10;
  else if (sugars > 8) baseScore -= 4;
  else if (sugars <= 3) baseScore += 4;

  // 5. Saturated fat penalties
  const satFat = input.saturatedFat || 0;
  if (satFat > 8) baseScore -= 10;
  else if (satFat > 4) baseScore -= 5;

  // 6. Salt penalties (WHO recommendation: < 5g/day, > 1.5g/100g is very high)
  const salt = input.salt || 0;
  if (salt > 1.5) {
    baseScore -= 14;
  } else if (salt > 0.9) {
    baseScore -= 7;
  } else if (salt <= 0.25) {
    baseScore += 4;
  }

  // Ensure bounded strictly between 5 and 100
  return Math.max(5, Math.min(100, Math.round(baseScore)));
}
