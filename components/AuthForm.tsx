"use client";
import { useState } from 'react';
import { signUpWithEmail, signInWithEmail } from '../lib/auth';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const notifyConnection = async (user: any) => {
    try {
      const response = await fetch('/api/notify-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userName: user.email?.split('@')[0],
          userEmail: user.email
        }),
      });

      if (!response.ok) {
        throw new Error('Errore durante la notifica di connessione');
      }

      return await response.json();
    } catch (error) {
      console.error('Errore notifica connessione:', error);
      // Non blocchiamo il flusso in caso di errore di notifica
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      let res;
      
      if (mode === 'signup') {
        res = await signUpWithEmail(email, password);
      } else {
        res = await signInWithEmail(email, password);
      }
      
      if (res.error) {
        setError(res.error.message);
        setIsLoading(false);
        return;
      }

      // Se il login/registrazione ha successo, notifica Ably
      if (res.data?.user) {
        await notifyConnection(res.data.user);
      }
      
      // Reindirizza alla chat
      router.push('/chat');
      
    } catch (err) {
      setError('Si è verificato un errore durante l\'autenticazione');
      console.error('Errore autenticazione:', err);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-800">
        {mode === 'login' ? 'Accedi' : 'Registrati'}
      </h2>
      
      {error && (
        <div className="p-2 text-sm text-red-600 bg-red-100 rounded">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="La tua email"
          required
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="La tua password"
          required
          minLength={6}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-md text-white font-medium ${
          isLoading
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isLoading ? (
          'Caricamento...'
        ) : mode === 'login' ? (
          'Accedi'
        ) : (
          'Registrati'
        )}
      </button>
      
      <p className="text-center text-sm text-gray-600">
        {mode === 'login' ? 'Non hai un account? ' : 'Hai già un account? '}
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="text-blue-600 hover:underline focus:outline-none"
        >
          {mode === 'login' ? 'Registrati' : 'Accedi'}
        </button>
      </p>
    </form>
  );
}
