"use client";
import { useState } from 'react';
import { signUpWithEmail, signInWithEmail } from '../lib/auth';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    let res;
    try {
      if (mode === 'signup') {
        res = await signUpWithEmail(email, password);
      } else {
        res = await signInWithEmail(email, password);
      }
      
      if (res.error) {
        setError(res.error.message);
      } else {
        // Redirect to /chat on successful authentication
        router.push('/chat');
      }
    } catch (err) {
      setError('An error occurred during authentication');
      console.error('Authentication error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto p-4">
      <input 
        type="email" 
        value={email} 
        onChange={e => setEmail(e.target.value)} 
        placeholder="Email" 
        required 
        className="p-2 border rounded"
      />
      <input 
        type="password" 
        value={password} 
        onChange={e => setPassword(e.target.value)} 
        placeholder="Password" 
        required 
        className="p-2 border rounded"
      />
      <button 
        type="submit"
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
      >
        {mode === 'login' ? 'Login' : 'Sign Up'}
      </button>
      <button 
        type="button" 
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="text-sm text-blue-600 hover:underline"
      >
        {mode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Login'}
      </button>
      {error && (
        <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
          {error}
        </div>
      )}
    </form>
  );
}
