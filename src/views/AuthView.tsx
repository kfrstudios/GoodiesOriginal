import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  KeyRound
} from 'lucide-react';
import { 
  loginWithEmail, 
  registerWithEmail, 
  loginWithGoogle, 
  loginWithApple, 
  resetPassword, 
  getAuthErrorMessage 
} from '../services/firebase';

interface AuthViewProps {
  onAuthSuccess: (user: any, isNewUser: boolean) => void;
}

type AuthMode = 'login' | 'register' | 'forgot_password';

export function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleModeChange = (newMode: AuthMode) => {
    clearMessages();
    setMode(newMode);
  };

  // Google Login
  const handleGoogleLogin = async () => {
    clearMessages();
    setIsLoading(true);
    try {
      const user = await loginWithGoogle();
      onAuthSuccess(user, Boolean(user.isNewUser));
    } catch (err: any) {
      console.warn('Google login notice:', err);
      setErrorMsg(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Apple Login
  const handleAppleLogin = async () => {
    clearMessages();
    setIsLoading(true);
    try {
      const user = await loginWithApple();
      onAuthSuccess(user, false);
    } catch (err: any) {
      console.warn('Apple login notice:', err);
      setErrorMsg(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Email / Password Form Submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearMessages();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Bitte gib deine E-Mail-Adresse ein.');
      return;
    }

    if (mode === 'forgot_password') {
      setIsLoading(true);
      try {
        await resetPassword(cleanEmail);
        setSuccessMsg('Eine E-Mail zum Zurücksetzen deines Passworts wurde versendet.');
      } catch (err: any) {
        setErrorMsg(getAuthErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Bitte gib dein Passwort ein.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMsg('Das Passwort muss mindestens 6 Zeichen lang sein.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Die eingegebenen Passwörter stimmen nicht überein.');
        return;
      }

      setIsLoading(true);
      try {
        const newUser = await registerWithEmail(cleanEmail, password);
        onAuthSuccess(newUser, true);
      } catch (err: any) {
        setErrorMsg(getAuthErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login mode
      setIsLoading(true);
      try {
        const user = await loginWithEmail(cleanEmail, password);
        onAuthSuccess(user, false);
      } catch (err: any) {
        setErrorMsg(getAuthErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-zinc-900 flex flex-col justify-center max-w-md mx-auto px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/15 mb-4"
        >
          <span className="font-black text-2xl tracking-tighter">G</span>
        </motion.div>
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
          {mode === 'register' ? 'Konto erstellen' : mode === 'forgot_password' ? 'Passwort vergessen' : 'Willkommen bei Goodies'}
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          {mode === 'register' 
            ? 'Erstelle dein persönliches Profil für bewusste Ernährung.' 
            : mode === 'forgot_password'
            ? 'Gib deine E-Mail ein, um ein neues Passwort anzufordern.'
            : 'Dein smarter Begleiter für bewusste Ernährung & Food-Transparenz.'}
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
        {/* Error / Success Feedback */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 font-medium"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 font-medium"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Social Sign-ins (Apple & Google) - Visible in Login and Register */}
        {mode !== 'forgot_password' && (
          <div className="space-y-2.5">
            {/* Apple Login */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleAppleLogin}
              className="w-full h-12 bg-black hover:bg-zinc-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.03-7.62-7.85-11.77-14.44-6-9.5-10.74-20.2-14.23-32.1-3.48-11.9-5.23-23.08-5.23-33.53 0-14.15 3.49-26.06 10.47-35.73 6.98-9.67 15.93-14.58 26.85-14.74 4.58 0 9.87 1.25 15.86 3.75 6 2.5 10.02 3.8 12.07 3.92 2.05-.12 6.27-1.46 12.65-4.04 6.38-2.58 11.75-3.74 16.12-3.49 12.02.66 21.6 4.97 28.74 12.94-10.5 6.38-15.63 15.22-15.38 26.52.25 8.92 3.65 16.32 10.19 22.21 6.54 5.89 14.38 9.38 23.52 10.47-2.32 7.02-5.18 14.07-8.58 21.15zM119.22 31.85c0-7.39 2.67-14.28 8.01-20.67 5.34-6.39 11.83-10.42 19.46-12.08.13 1.13.2 2.14.2 3.03 0 7.39-2.73 14.34-8.19 20.85-5.46 6.51-12.06 10.45-19.8 11.82-.09-.98-.14-1.99-.14-3.03z" />
              </svg>
              <span>Mit Apple anmelden</span>
            </button>

            {/* Google Login */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleLogin}
              className="w-full h-12 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200/90 rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Mit Google anmelden</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="w-full border-t border-zinc-200" />
              <span className="absolute bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                oder
              </span>
            </div>
          </div>
        )}

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {/* Email */}
          <div>
            <label className="text-[11px] font-bold text-zinc-500 block mb-1">
              E-Mail-Adresse
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine.email@beispiel.de"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Password */}
          {mode !== 'forgot_password' && (
            <div>
              <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                Passwort
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Confirm Password (Register mode) */}
          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                Passwort bestätigen
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'register' ? (
              <>
                <span>Konto erstellen</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'forgot_password' ? (
              <>
                <span>Passwort-Link anfordern</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Anmelden</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Secondary Links */}
        <div className="pt-2 text-center space-y-2">
          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => handleModeChange('forgot_password')}
                className="text-xs text-zinc-500 hover:text-emerald-700 font-semibold transition-colors block mx-auto"
              >
                Passwort vergessen?
              </button>
              <div className="text-xs text-zinc-600 pt-1">
                Noch kein Konto?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('register')}
                  className="font-extrabold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                >
                  Registrieren
                </button>
              </div>
            </>
          )}

          {mode === 'register' && (
            <div className="text-xs text-zinc-600">
              Bereits registriert?{' '}
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="font-extrabold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
              >
                Anmelden
              </button>
            </div>
          )}

          {mode === 'forgot_password' && (
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className="text-xs text-emerald-600 font-extrabold hover:underline"
            >
              Zurück zur Anmeldung
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
