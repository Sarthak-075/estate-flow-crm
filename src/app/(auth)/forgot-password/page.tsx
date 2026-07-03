'use client';

import { useState } from 'react';
import { forgotPasswordAction } from '@/features/auth/actions/forgotPasswordAction';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string>('');
  const [sent, setSent] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await forgotPasswordAction(formData);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error ?? 'Request failed');
    }
  };

  return (
    <div>
      <h2 className="text-2xl mb-4">Forgot Password</h2>
      {error && <p className="text-red-500">{error}</p>}
      {sent ? (
        <p className="text-green-600">Reset email sent. Check your inbox.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Email</label>
            <input type="email" name="email" required className="w-full border rounded p-2" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
            Send Reset Link
          </button>
        </form>
      )}
    </div>
  );
}
