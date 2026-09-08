import { useState, useEffect, useMemo } from 'react';
import { 
  Flame, 
  Droplets, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  ChevronRight, 
  Sparkles, 
  Trophy, 
  Award,
  Zap,
  Info,
  Clock
} from 'lucide-react';
import { getCurrentWeekDays, getWeekRangeDisplay, subscribeToDayChange, WeekDayInfo } from '../utils/dateUtils';
import { DailyTrackerDoc, MealLogItem, UserProfile } from '../types';

interface WeeklyTrackerCardProps {
  user: UserProfile;
  todayMeals: MealLogItem[];
  waterIntakeMl: number;
  weeklyTrackers: Record<string, DailyTrackerDoc>;
  onSelectDay?: (dateStr: string) => void;
}

export function WeeklyTrackerCard({
  user,
  todayMeals,
  waterIntakeMl,
  weeklyTrackers,
  onSelectDay
}: WeeklyTrackerCardProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayDateStr, setSelectedDayDateStr] = useState<string | null>(null);

  // Subscribe to midnight rollover so day changes automatically without refresh
  useEffect(() => {
    const unsubscribe = subscribeToDayChange(() => {
      setCurrentDate(new Date());
    });
    return unsubscribe;
  }, []);

  // Compute week days dynamically
  const weekDays = useMemo(() => getCurrentWeekDays(currentDate), [currentDate]);
  const weekRange = useMemo(() => getWeekRangeDisplay(weekDays), [weekDays]);

  const calorieTarget = user.dailyGoals?.calories || 2150;
  const waterTarget = user.dailyGoals?.water || 2500;
  const proteinTarget = user.dailyGoals?.protein || 110;

  // Compile day stats
  const dayStats = useMemo(() => {
    return weekDays.map((day) => {
      let dayMeals: MealLogItem[] = [];
      let dayWater = 0;

      if (day.isToday) {
        dayMeals = todayMeals;
        dayWater = waterIntakeMl;
      } else {
        const trackerDoc = weeklyTrackers[day.dayKey];
        if (trackerDoc) {
          dayMeals = trackerDoc.meals || [];
          dayWater = trackerDoc.waterMl || 0;
        }
      }

      const totalKcal = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
      const totalProtein = dayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
      const totalCarbs = dayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
      const totalFat = dayMeals.reduce((sum, m) => sum + (m.fat || 0), 0);

      // Calorie goal check: if user ate and is within +/- 15% or up to target
      const isLogged = dayMeals.length > 0 || dayWater > 0;
      const isCalorieGoalMet = totalKcal > 0 && totalKcal <= calorieTarget * 1.1 && totalKcal >= calorieTarget * 0.8;
      const isWaterGoalMet = dayWater >= waterTarget;
      const isGoalMet = isCalorieGoalMet || (isWaterGoalMet && totalKcal > 0);

      return {
        ...day,
        meals: dayMeals,
        waterMl: dayWater,
        calories: totalKcal,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        isLogged,
        isCalorieGoalMet,
        isWaterGoalMet,
        isGoalMet
      };
    });
  }, [weekDays, todayMeals, waterIntakeMl, weeklyTrackers, calorieTarget, waterTarget]);

  // Aggregate week statistics
  const loggedDays = dayStats.filter((d) => d.isLogged || d.isToday);
  const daysGoalMetCount = dayStats.filter((d) => d.isGoalMet).length;
  
  const averageCalories = loggedDays.length > 0
    ? Math.round(loggedDays.reduce((sum, d) => sum + d.calories, 0) / loggedDays.length)
    : 0;

  const averageWater = loggedDays.length > 0
    ? Math.round(loggedDays.reduce((sum, d) => sum + d.waterMl, 0) / loggedDays.length)
    : 0;

  const averageProtein = loggedDays.length > 0
    ? Math.round(loggedDays.reduce((sum, d) => sum + d.protein, 0) / loggedDays.length)
    : 0;

  // Calculate current streak of met goals up to today
  const currentStreak = useMemo(() => {
    let streak = 0;
    // Iterate backwards starting from today
    const todayIndex = dayStats.findIndex((d) => d.isToday);
    if (todayIndex === -1) return 0;

    for (let i = todayIndex; i >= 0; i--) {
      const d = dayStats[i];
      if (d.isGoalMet) {
        streak++;
      } else if (d.isToday && d.calories === 0) {
        // Day just started, don't break streak yet
        continue;
      } else {
        break;
      }
    }
    return streak;
  }, [dayStats]);

  const selectedDayInfo = useMemo(() => {
    if (!selectedDayDateStr) return null;
    return dayStats.find((d) => d.dateStr === selectedDayDateStr) || null;
  }, [selectedDayDateStr, dayStats]);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-6">
      {/* Header: Dynamic calendar week & status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-base text-zinc-900 dark:text-white tracking-tight">
              Wochen-Tracking PRO
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Kalenderwoche: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{weekRange}</span> (Mo – So)
          </p>
        </div>

        {/* Top KPI chips */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{currentStreak} Tage Streak</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{daysGoalMetCount} / 7 im Ziel</span>
          </div>
        </div>
      </div>

      {/* Week Interactive Day Bars */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium px-1">
          <span>Tagesübersicht (Mo – So)</span>
          <span>Ziel: {calorieTarget.toLocaleString('de-DE')} kcal / Tag</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {dayStats.map((day) => {
            const heightPercent = calorieTarget > 0 
              ? Math.min(100, Math.round((day.calories / calorieTarget) * 100))
              : 0;
            const isSelected = selectedDayDateStr === day.dateStr;

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => {
                  setSelectedDayDateStr(isSelected ? null : day.dateStr);
                  if (onSelectDay) onSelectDay(day.dateStr);
                }}
                className={`relative flex flex-col items-center p-2 rounded-2xl border transition-all text-center group focus:outline-none ${
                  day.isToday
                    ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/50 shadow-sm ring-2 ring-emerald-500/20'
                    : isSelected
                    ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600'
                    : 'bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {/* "Heute" badge */}
                {day.isToday && (
                  <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-emerald-500 text-[9px] font-black text-white tracking-wider uppercase shadow-xs">
                    Heute
                  </span>
                )}

                {/* Day Header */}
                <span className={`text-[11px] font-bold ${
                  day.isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'
                }`}>
                  {day.dayShort}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {day.dateFormatted}
                </span>

                {/* Vertical Bar */}
                <div className="w-full bg-zinc-200/60 dark:bg-zinc-700/60 rounded-full h-24 my-2 relative flex flex-col justify-end p-0.5 overflow-hidden">
                  <div
                    className={`w-full rounded-full transition-all duration-500 ${
                      day.isGoalMet
                        ? 'bg-emerald-500'
                        : day.isToday
                        ? 'bg-emerald-400'
                        : day.calories > 0
                        ? 'bg-zinc-400 dark:bg-zinc-500'
                        : 'bg-transparent'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Calorie value */}
                <span className="text-[10px] font-extrabold text-zinc-900 dark:text-white leading-none">
                  {day.calories > 0 ? `${Math.round(day.calories)}` : '—'}
                </span>

                {/* Goal indicator icon */}
                <div className="mt-1">
                  {day.isGoalMet ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : day.waterMl >= waterTarget ? (
                    <Droplets className="w-3.5 h-3.5 text-sky-500 fill-sky-500/30" />
                  ) : (
                    <div className="w-3.5 h-3.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Inspection */}
      {selectedDayInfo && (
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-900 dark:text-white">
                {selectedDayInfo.dayFull}, {selectedDayInfo.dateFormatted}
              </span>
              {selectedDayInfo.isToday && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                  Heute
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedDayDateStr(null)}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-medium"
            >
              Schließen ✕
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 block">Kalorien</span>
              <span className="font-extrabold text-sm text-zinc-900 dark:text-white">
                {Math.round(selectedDayInfo.calories)} <span className="text-[10px] font-normal text-zinc-400">kcal</span>
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 block">Wasser</span>
              <span className="font-extrabold text-sm text-sky-600 dark:text-sky-400">
                {selectedDayInfo.waterMl} <span className="text-[10px] font-normal text-zinc-400">ml</span>
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 block">Protein</span>
              <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400">
                {Math.round(selectedDayInfo.protein)}g
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 block">Mahlzeiten</span>
              <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                {selectedDayInfo.meals.length}
              </span>
            </div>
          </div>

          {selectedDayInfo.meals.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                Protokollierte Einträge:
              </span>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {selectedDayInfo.meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                        {meal.productName}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {meal.amountLabel || `${meal.portionGrams}g`} • {meal.mealType}
                      </span>
                    </div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      +{meal.calories} kcal
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 italic text-center py-2">
              Keine Mahlzeiten für diesen Tag eingetragen.
            </p>
          )}
        </div>
      )}

      {/* Modern 3-Column Weekly Summary & Averages */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <Flame className="w-4 h-4 text-emerald-500" />
            <span>Ø Kalorien</span>
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white">
            {averageCalories.toLocaleString('de-DE')} <span className="text-xs font-medium text-zinc-400">kcal/Tag</span>
          </p>
          <p className="text-[11px] text-zinc-400">
            Ziel: {calorieTarget} kcal
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <Droplets className="w-4 h-4 text-sky-500" />
            <span>Ø Wasser</span>
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white">
            {averageWater.toLocaleString('de-DE')} <span className="text-xs font-medium text-zinc-400">ml/Tag</span>
          </p>
          <p className="text-[11px] text-zinc-400">
            Ziel: {waterTarget} ml
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span>Ø Protein</span>
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white">
            {averageProtein} <span className="text-xs font-medium text-zinc-400">g/Tag</span>
          </p>
          <p className="text-[11px] text-zinc-400">
            Ziel: {proteinTarget} g
          </p>
        </div>
      </div>

      {/* Motivational & Contextual Summary */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
          <Trophy className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300">
            Wochenanalyse & Motivation
          </h4>
          <p className="text-xs text-emerald-800/90 dark:text-emerald-400/90 leading-relaxed">
            {daysGoalMetCount >= 5
              ? 'Hervorragende Leistung! Du hast an der Mehrheit der Tage dein Ernährungsziel gemeistert.'
              : daysGoalMetCount >= 2
              ? `Guter Fortschritt! Du hast bereits an ${daysGoalMetCount} Tagen dein Ziel erreicht. Bleib dran!`
              : 'Nutze die verbleibenden Tage dieser Woche, um deine Tagesziele zu erreichen und deine Streak aufzubauen!'}
          </p>
        </div>
      </div>
    </div>
  );
}
