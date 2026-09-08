import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Sparkles, Check } from 'lucide-react';

interface WaterCelebrationProps {
  active: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  color: string;
  delay: number;
}

export const WaterCelebration: React.FC<WaterCelebrationProps> = ({ active }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      // Generate 16 subtle water celebration particles
      const colors = ['#38bdf8', '#0ea5e9', '#06b6d4', '#67e8f9', '#a5f3fc', '#10b981'];
      const newParticles: Particle[] = Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 220,
        y: -40 - Math.random() * 80,
        scale: 0.6 + Math.random() * 0.7,
        color: colors[i % colors.length],
        delay: 0.2 + (i * 0.05)
      }));
      setParticles(newParticles);
    }
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeOut' } }}
          className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20"
        >
          {/* Subtle water ripple wave originating from the center */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0.8 }}
            animate={{ scale: [0.2, 1.3, 2.2], opacity: [0.7, 0.4, 0] }}
            transition={{ duration: 1.8, delay: 0.2, ease: 'easeOut' }}
            className="absolute w-28 h-28 rounded-full bg-cyan-400/20 border-2 border-cyan-400/40"
          />

          <motion.div
            initial={{ scale: 0.1, opacity: 0.9 }}
            animate={{ scale: [0.1, 1.1, 1.8], opacity: [0.8, 0.3, 0] }}
            transition={{ duration: 2.0, delay: 0.4, ease: 'easeOut' }}
            className="absolute w-24 h-24 rounded-full bg-sky-300/20 border border-sky-400/50"
          />

          {/* Floating water droplets / confetti */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{
                x: p.x,
                y: p.y,
                opacity: [0, 1, 1, 0],
                scale: [0, p.scale, p.scale, 0],
                rotate: (Math.random() - 0.5) * 180
              }}
              transition={{ duration: 2.1, delay: p.delay, ease: 'easeOut' }}
              className="absolute w-2.5 h-2.5 rounded-full shadow-xs"
              style={{ backgroundColor: p.color }}
            />
          ))}

          {/* Non-intrusive banner badge that floats softly in then dissolves at 2.6s */}
          <motion.div
            initial={{ y: 15, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.3 }}
            className="bg-gradient-to-r from-cyan-600 to-sky-600 text-white px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2 border border-white/20"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Droplets className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-wide">Wasserziel erreicht!</span>
              <span className="text-[10px] text-cyan-100 font-medium">100% geschafft heute</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 ml-1 shrink-0" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
