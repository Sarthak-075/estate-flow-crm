'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetPasswordAction } from '@/features/auth/actions/resetPasswordAction';

export default function ResetPasswordPage() {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await resetPasswordAction(formData);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.push('/login?reset=1'), 2000);
    } else {
      setError(result.error ?? 'Reset failed');
    }
  };

  return (
    <div>
      <h2 className="text-2xl mb-4">Reset Password</h2>
      {error && <p className="text-red-500">{error}</p>}
      {success ? (
        <p className="text-green-600">Password updated. Redirecting to login...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">New Password</label>
            <input type="password" name="password" required className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              required
              className="w-full border rounded p-2"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
            Reset Password
          </button>
        </form>
      )}
    </div>
  );
}
