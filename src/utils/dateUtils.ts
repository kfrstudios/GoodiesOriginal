/**
 * Comprehensive Date & Week Utilities for Goodies
 * Timezone-safe and automatically derived from system clock
 */

export interface WeekDayInfo {
  dateStr: string; // YYYY-MM-DD
  dayKey: string;  // daily_YYYY-MM-DD
  dayShort: 'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr' | 'Sa' | 'So';
  dayFull: string;
  dateFormatted: string; // e.g. "07.09."
  dayOfMonth: number;
  monthName: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isWeekend: boolean;
}

const GERMAN_DAY_SHORTS: ('Mo' | 'Di' | 'Mi' | 'Do' | 'Fr' | 'Sa' | 'So')[] = [
  'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'
];

const GERMAN_DAY_FULL = [
  'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'
];

const GERMAN_MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

/**
 * Returns today's date in local calendar format YYYY-MM-DD.
 * Prevents UTC midnight drift by using local year, month, day.
 */
export function getTodayCalendarDate(referenceDate: Date = new Date()): string {
  const yyyy = referenceDate.getFullYear();
  const mm = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const dd = String(referenceDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns today's tracker key: daily_YYYY-MM-DD
 */
export function getTodayTrackerKey(referenceDate: Date = new Date()): string {
  return `daily_${getTodayCalendarDate(referenceDate)}`;
}

/**
 * Formats a YYYY-MM-DD date or Date object to German format (e.g., "07.09.2026")
 */
export function formatGermanDate(dateInput: string | Date, includeYear = true): string {
  let d: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  if (!includeYear) return `${dd}.${mm}.`;
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/**
 * Returns the German weekday name for any given date
 */
export function getGermanDayName(dateInput: string | Date, full = false): string {
  let d: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }

  // getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  const dayIndex = d.getDay();
  // Map to Monday-based index (0 = Mo, 6 = So)
  const mondayBasedIdx = dayIndex === 0 ? 6 : dayIndex - 1;
  return full ? GERMAN_DAY_FULL[mondayBasedIdx] : GERMAN_DAY_SHORTS[mondayBasedIdx];
}

/**
 * Computes all 7 days of the calendar week (Monday to Sunday) containing referenceDate.
 * Correctly identifies which day is today, past, or future.
 */
export function getCurrentWeekDays(referenceDate: Date = new Date()): WeekDayInfo[] {
  const todayStr = getTodayCalendarDate(new Date());

  // Determine Monday of this week
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const dayOfWeek = ref.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);

  const week: WeekDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);

    const dateStr = getTodayCalendarDate(currentDay);
    const dayOfMonth = currentDay.getDate();
    const mm = String(currentDay.getMonth() + 1).padStart(2, '0');
    const dd = String(dayOfMonth).padStart(2, '0');
    const monthName = GERMAN_MONTH_NAMES[currentDay.getMonth()];

    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;
    const isWeekend = i === 5 || i === 6; // Sa or So

    week.push({
      dateStr,
      dayKey: `daily_${dateStr}`,
      dayShort: GERMAN_DAY_SHORTS[i],
      dayFull: GERMAN_DAY_FULL[i],
      dateFormatted: `${dd}.${mm}.`,
      dayOfMonth,
      monthName,
      isToday,
      isPast,
      isFuture,
      isWeekend
    });
  }

  return week;
}

/**
 * Returns week range string, e.g. "01.09. – 07.09.2026"
 */
export function getWeekRangeDisplay(weekDays: WeekDayInfo[]): string {
  if (weekDays.length === 0) return '';
  const first = weekDays[0];
  const last = weekDays[weekDays.length - 1];
  return `${first.dateFormatted} – ${last.dateFormatted}`;
}

/**
 * Day-change listener for midnight rollover
 * Automatically calls callback when the calendar day changes.
 */
export function subscribeToDayChange(onDayChange: (newDateStr: string) => void): () => void {
  let lastKnownDate = getTodayCalendarDate();

  const check = () => {
    const current = getTodayCalendarDate();
    if (current !== lastKnownDate) {
      lastKnownDate = current;
      onDayChange(current);
    }
  };

  // Check every 15 seconds
  const intervalId = window.setInterval(check, 15000);

  // Also check whenever tab or window regains focus
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      check();
    }
  };

  window.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', check);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('focus', check);
  };
}
