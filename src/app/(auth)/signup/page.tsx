'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signupAction } from '@/features/auth/actions/signupAction';

export default function SignupPage() {
  const [error, setError] = useState<string>('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await signupAction(formData);
    if (result.success) {
      // After signup Supabase sends verification email, redirect to login
      router.push('/login?sent=1');
    } else {
      setError(result.error ?? 'Signup failed');
    }
  };

  return (
    <div>
      <h2 className="text-2xl mb-4">Sign Up</h2>
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Email</label>
          <input type="email" name="email" required className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block mb-1">Password</label>
          <input type="password" name="password" required className="w-full border rounded p-2" />
        </div>
        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded">
          Sign Up
        </button>
      </form>
    </div>
  );
}
