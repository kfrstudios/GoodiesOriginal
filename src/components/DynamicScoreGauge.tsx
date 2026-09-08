import { useEffect, useState, useRef } from 'react';

interface DynamicScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  animateOnMount?: boolean;
  label?: string;
  showVerdict?: boolean;
  className?: string;
}

export function DynamicScoreGauge({
  score,
  size = 'md',
  animateOnMount = true,
  label = 'Goodies Score',
  showVerdict = false,
  className = ''
}: DynamicScoreGaugeProps) {
  const [currentScore, setCurrentScore] = useState<number>(animateOnMount ? 0 : score);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Configuration per size
  const config = {
    sm: { radius: 24, strokeWidth: 5, svgSize: 60, textClass: 'text-base font-black', labelClass: 'text-[9px]' },
    md: { radius: 36, strokeWidth: 6, svgSize: 90, textClass: 'text-2xl font-black', labelClass: 'text-[10px]' },
    lg: { radius: 48, strokeWidth: 8, svgSize: 120, textClass: 'text-3xl font-black', labelClass: 'text-xs' },
    hero: { radius: 64, strokeWidth: 10, svgSize: 160, textClass: 'text-5xl font-black', labelClass: 'text-xs' }
  }[size];

  const circumference = 2 * Math.PI * config.radius;

  useEffect(() => {
    // Respect reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrentScore(score);
      return;
    }

    if (!animateOnMount) {
      setCurrentScore(score);
      return;
    }

    startTimeRef.current = null;
    const startVal = 0;
    const targetVal = score;
    const duration = 950; // ms

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out expo for lively deceleration
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const val = Math.round(startVal + (targetVal - startVal) * ease);

      setCurrentScore(val);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentScore(targetVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [score, animateOnMount]);

  // Dynamic colors based on the animated current score
  const getColor = (s: number) => {
    if (s >= 80) return { stroke: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    if (s >= 60) return { stroke: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-800 border-amber-200' };
    return { stroke: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', text: 'text-rose-600', badge: 'bg-rose-50 text-rose-800 border-rose-200' };
  };

  const colors = getColor(currentScore);
  const strokeDashoffset = circumference - (currentScore / 100) * circumference;

  const getVerdictText = (s: number) => {
    if (s >= 85) return 'Hervorragend';
    if (s >= 70) return 'Gut & Empfohlen';
    if (s >= 50) return 'Ausgewogen / Mäßig';
    return 'Kritische Werte';
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: config.svgSize, height: config.svgSize }}>
        <svg
          width={config.svgSize}
          height={config.svgSize}
          className="-rotate-90 transform transition-all"
        >
          {/* Background circle track */}
          <circle
            cx={config.svgSize / 2}
            cy={config.svgSize / 2}
            r={config.radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-zinc-100 dark:text-zinc-800"
          />
          {/* Animated fill circle */}
          <circle
            cx={config.svgSize / 2}
            cy={config.svgSize / 2}
            r={config.radius}
            fill="transparent"
            stroke={colors.stroke}
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-75 ease-out"
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.textClass} tracking-tight ${colors.text} leading-none`}>
            {currentScore}
          </span>
          {size !== 'sm' && (
            <span className="text-[9px] font-bold text-zinc-400 mt-0.5">/ 100</span>
          )}
        </div>
      </div>

      {label && (
        <span className={`font-extrabold text-zinc-500 uppercase tracking-wider mt-1.5 ${config.labelClass}`}>
          {label}
        </span>
      )}

      {showVerdict && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${colors.badge}`}>
          {getVerdictText(currentScore)}
        </span>
      )}
    </div>
  );
}
