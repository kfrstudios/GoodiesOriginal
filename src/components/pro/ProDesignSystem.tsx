import React from 'react';
import { Crown, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { PaywallContext } from '../../types';
import { useApp } from '../../context/AppContext';

// ============================================================================
// 1. EINHEITLICHES PRO-SYMBOL (Golden Premium Look mit Glanzeffekt)
// ============================================================================

export interface ProSymbolProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

const sizeMap = {
  xs: { icon: 'w-3 h-3', box: 'w-3.5 h-3.5' },
  sm: { icon: 'w-3.5 h-3.5', box: 'w-4.5 h-4.5' },
  md: { icon: 'w-4.5 h-4.5', box: 'w-6 h-6' },
  lg: { icon: 'w-6 h-6', box: 'w-8 h-8' },
  xl: { icon: 'w-8 h-8', box: 'w-11 h-11' },
};

/**
 * Zentrales, einheitliches Pro-Symbol mit metallischem Farbverlauf
 * und dezentem animiertem Glanzeffekt.
 */
export function ProSymbol({ size = 'sm', className = '', animate = true }: ProSymbolProps) {
  const dims = sizeMap[size];

  return (
    <span 
      className={`relative inline-flex items-center justify-center shrink-0 rounded-md overflow-hidden ${className}`}
      title="Goodies PRO"
    >
      <Crown 
        className={`${dims.icon} text-amber-900 fill-[url(#goldProGradient)] transition-transform duration-300 drop-shadow-[0_1px_1px_rgba(245,158,11,0.5)]`}
      />

      {/* SVG Definition für den metallischen Gold-Verlauf */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <linearGradient id="goldProGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE082" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#FFF176" />
          </linearGradient>
        </defs>
      </svg>

      {/* Dynamischer, dezenter Glanzeffekt über dem Symbol */}
      {animate && (
        <span 
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-gold-shimmer" />
        </span>
      )}
    </span>
  );
}

// ============================================================================
// 2. EINHEITLICHES PRO-BADGE (Zentrales Designsystem für Labels & Chips)
// ============================================================================

export interface ProBadgeProps {
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'gold' | 'subtle' | 'locked' | 'outline';
  showIcon?: boolean;
  animate?: boolean;
  className?: string;
  onClick?: () => void;
}

export function ProBadge({
  label = 'PRO',
  size = 'sm',
  variant = 'gold',
  showIcon = true,
  animate = true,
  className = '',
  onClick
}: ProBadgeProps) {
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-0.5 font-black tracking-wider',
    sm: 'text-[10.5px] px-2 py-0.5 gap-1 font-black tracking-tight',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-black tracking-tight',
  }[size];

  const iconSizes = {
    xs: 'xs' as const,
    sm: 'xs' as const,
    md: 'sm' as const,
  }[size];

  let variantClasses = '';
  if (variant === 'gold') {
    // Hochwertiger Gold-Look mit metallischem Schein
    variantClasses = 'bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-amber-950 border border-amber-200/90 shadow-[0_1px_3px_rgba(217,119,6,0.2)]';
  } else if (variant === 'subtle') {
    variantClasses = 'bg-amber-50 text-amber-900 border border-amber-200/80';
  } else if (variant === 'locked') {
    variantClasses = 'bg-gradient-to-r from-amber-200/90 via-amber-300 to-amber-200/90 text-amber-950 border border-amber-300/80 shadow-2xs';
  } else if (variant === 'outline') {
    variantClasses = 'bg-transparent text-amber-700 border border-amber-400';
  }

  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full leading-none select-none transition-transform overflow-hidden ${sizeClasses} ${variantClasses} ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${className}`}
    >
      {/* Glanzeffekt */}
      {animate && (variant === 'gold' || variant === 'locked') && (
        <span 
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
          aria-hidden="true"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-gold-shimmer" />
        </span>
      )}

      {showIcon && (
        variant === 'locked' ? (
          <Lock className="w-2.5 h-2.5 text-amber-900 stroke-[2.5]" />
        ) : (
          <ProSymbol size={iconSizes} animate={false} />
        )
      )}

      <span className="relative z-10">{label}</span>
    </Tag>
  );
}

// ============================================================================
// 3. EINHEITLICHER PRO-BUTTON (Goldene Call-to-Action)
// ============================================================================

export interface ProButtonProps {
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  context?: PaywallContext;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function ProButton({
  label = 'Pro abonnieren',
  sublabel,
  size = 'md',
  fullWidth = false,
  context = 'general',
  onClick,
  className = '',
  children
}: ProButtonProps) {
  const { openPaywall } = useApp();
  const displayLabel = children || label;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      openPaywall(context);
    }
  };

  const sizeClasses = {
    sm: 'text-xs py-2 px-3 gap-1.5 rounded-xl',
    md: 'text-xs py-2.5 px-4 gap-2 rounded-2xl',
    lg: 'text-sm py-3.5 px-5 gap-2.5 rounded-2xl',
  }[size];

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.01 }}
      onClick={handleClick}
      className={`relative overflow-hidden font-black bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-amber-950 border border-amber-200/90 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center cursor-pointer ${
        fullWidth ? 'w-full' : 'inline-flex'
      } ${sizeClasses} ${className}`}
    >
      {/* Glanzeffekt */}
      <span 
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]"
        aria-hidden="true"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-gold-shimmer" />
      </span>

      <ProSymbol size={size === 'lg' ? 'md' : 'sm'} animate={false} />

      <div className="relative z-10 flex flex-col items-center">
        <span className="tracking-tight">{displayLabel}</span>
        {sublabel && (
          <span className="text-[10px] font-medium text-amber-900/80 -mt-0.5">{sublabel}</span>
        )}
      </div>

      <ArrowRight className="w-3.5 h-3.5 text-amber-950/80 ml-auto" />
    </motion.button>
  );
}

// ============================================================================
// 4. GESPERRTE PRO-FUNKTION (Grau/Deaktiviert + Goldenes Pro-Badge + Klick-Intercept)
// ============================================================================

export interface LockedProFeatureProps {
  context: PaywallContext;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  isLocked?: boolean;
  className?: string;
  badgeLabel?: string;
  actionText?: string;
}

/**
 * Standardisierte Komponente für gesperrte Pro-Funktionen für Free-Nutzer.
 * Wenn gesperrt:
 * - Graue / deaktivierte Darstellung (graues Icon, grauer Text, reduzierte Hervorhebung)
 * - Prominentes, einheitliches goldenes Pro-Badge
 * - Vermittelt: „Diese Funktion existiert, ist aber Bestandteil von Pro.“
 * - Beim Antippen öffnet sich die Pro-/Abonnement-Ansicht (kein direktes Pro-Freischalten!)
 */
export function LockedProFeature({
  context,
  title,
  description,
  icon,
  children,
  isLocked = true,
  className = '',
  badgeLabel = 'PRO',
  actionText = 'Mit PRO freischalten'
}: LockedProFeatureProps) {
  const { openPaywall } = useApp();

  if (!isLocked) {
    return <>{children}</>;
  }

  const handleInterceptClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openPaywall(context);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleInterceptClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleInterceptClick(e as any);
        }
      }}
      className={`relative rounded-3xl p-4 bg-zinc-50 border border-zinc-200/90 shadow-2xs cursor-pointer hover:border-amber-300/80 transition-all group select-none ${className}`}
      title={`${title} (Goodies PRO Funktion)`}
    >
      {/* Top Bar with Gray Title + Golden Pro Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-zinc-500">
          {icon && (
            <div className="w-7 h-7 rounded-xl bg-zinc-200/70 text-zinc-500 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-zinc-700 tracking-tight">
              {title}
            </h4>
            {description && (
              <p className="text-[11px] text-zinc-400 leading-snug">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Einheitliches goldenes Pro-Badge */}
        <ProBadge label={badgeLabel} size="sm" variant="gold" />
      </div>

      {/* Disabled Content / Children */}
      {children ? (
        <div className="opacity-50 grayscale pointer-events-none">
          {children}
        </div>
      ) : null}

      {/* Subtle Call to Action row at bottom */}
      <div className="mt-3 pt-2.5 border-t border-zinc-200/60 flex items-center justify-between text-[11px]">
        <span className="text-zinc-400 font-medium flex items-center gap-1">
          <Lock className="w-3 h-3 text-zinc-400" />
          Nur für PRO-Mitglieder
        </span>
        <span className="font-extrabold text-amber-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
          <span>{actionText}</span>
          <ArrowRight className="w-3 h-3 text-amber-700" />
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// 5. ZENTRALES PRO-HINWEIS-BANNER (Verlauf, Tracker, Scanner etc.)
// ============================================================================

export interface ProNoticeBannerProps {
  context: PaywallContext;
  title: string;
  description: string;
  buttonLabel?: string;
  className?: string;
}

export function ProNoticeBanner({
  context,
  title,
  description,
  buttonLabel = 'PRO',
  className = ''
}: ProNoticeBannerProps) {
  const { openPaywall } = useApp();

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50/90 via-amber-100/40 to-yellow-50/70 border border-amber-200/80 p-3.5 flex items-center justify-between gap-3 shadow-2xs ${className}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <ProSymbol size="sm" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-extrabold text-zinc-900 tracking-tight">
            {title}
          </h4>
          <p className="text-[11px] text-zinc-600 leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => openPaywall(context)}
        className="relative shrink-0 overflow-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-amber-950 text-xs font-black shadow-xs border border-amber-200 cursor-pointer"
      >
        <span 
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]"
          aria-hidden="true"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-gold-shimmer" />
        </span>
        <Crown className="w-3.5 h-3.5 text-amber-900 fill-amber-900/30" />
        <span>{buttonLabel}</span>
      </motion.button>
    </div>
  );
}
