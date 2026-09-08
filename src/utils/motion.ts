/**
 * Goodies Motion System
 * Einheitliche, hochwertige Animationen für ein lebendiges, flüssiges App-Gefühl.
 * Respektiert prefers-reduced-motion und setzt auf performante GPU-Transforms.
 */

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Standard Springs
export const springTransition = {
  type: 'spring' as const,
  damping: 24,
  stiffness: 280,
  mass: 0.8
};

export const gentleSpring = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 200
};

export const snappySpring = {
  type: 'spring' as const,
  damping: 20,
  stiffness: 350
};

// View / Page Transitions
export const viewTransitionVariants = {
  initial: { opacity: 0, y: 8, scale: 0.99 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: { 
    opacity: 0, 
    y: -6, 
    scale: 0.99,
    transition: {
      duration: 0.16,
      ease: 'easeIn'
    }
  }
};

// Stagger Container & Child Variants
export const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02
    }
  }
};

export const staggerItemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  }
};

// Bottom Sheet Spring Variants
export const bottomSheetVariants = {
  hidden: { y: '100%', opacity: 0.6 },
  compact: { 
    y: 0, 
    opacity: 1,
    transition: springTransition
  },
  expanded: { 
    y: 0, 
    opacity: 1,
    transition: springTransition
  },
  exit: { 
    y: '100%', 
    opacity: 0,
    transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] }
  }
};

// Interactive Button Tap
export const tapScale = {
  scale: 0.96,
  transition: { duration: 0.1 }
};

export const cardHover = {
  scale: 1.01,
  transition: { duration: 0.15 }
};
