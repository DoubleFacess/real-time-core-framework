"use client";
import { useState } from 'react';
import { signUpWithEmail, signInWithEmail } from '../lib/auth';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    let res;
    if (mode === 'signup') {
      res = await signUpWithEmail(email, password);
    } else {
      res = await signInWithEmail(email, password);
    }
    if (res.error) setError(res.error.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
      <button type="submit">{mode === 'login' ? 'Login' : 'Sign Up'}</button>
      <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Switch to Sign Up' : 'Switch to Login'}
      </button>
      {error && <div>{error}</div>}
    </form>
  );
}
