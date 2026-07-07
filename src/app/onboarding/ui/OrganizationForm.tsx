// src/app/onboarding/ui/OrganizationForm.tsx

'use client';

import { useTransition, useState } from 'react';
import { createOrganization } from '@/features/organizations/createOrganizationAction';

export default function OrganizationForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createOrganization(formData);
      // The server action returns either undefined (redirect) or {error: string}
      if (result && typeof result === 'object' && 'error' in result) {
        setError(result.error as string);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Organization Name</span>
        <input
          name="organizationName"
          type="text"
          required
          maxLength={100}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          disabled={isPending}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Create Organization'}
      </button>
    </form>
  );
}
