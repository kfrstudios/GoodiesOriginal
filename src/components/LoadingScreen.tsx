import { Sparkles, Leaf } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Goodies wird geladen …' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF9F6] text-zinc-900 select-none">
      <div className="relative flex flex-col items-center space-y-6">
        {/* Animated Brand Logo Mark */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
            <Leaf className="w-10 h-10 text-white fill-white/20" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-md animate-bounce">
            <Sparkles className="w-3.5 h-3.5 text-amber-950" />
          </div>
        </div>

        {/* Brand Name & Loading Text */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            Goodies<span className="text-emerald-500">.</span>
          </h2>
          <p className="text-sm font-medium text-zinc-500 animate-pulse">
            {message}
          </p>
        </div>

        {/* Clean subtle progress bar */}
        <div className="w-48 h-1.5 bg-zinc-200/80 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full w-2/3 animate-[progress_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
