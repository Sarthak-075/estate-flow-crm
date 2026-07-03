// src/app/onboarding/page.tsx

import OrganizationForm from '@/app/onboarding/ui/OrganizationForm';

export default function OnboardingPage() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-4 text-center text-2xl font-bold">Create Your Organization</h1>
        <OrganizationForm />
      </div>
    </section>
  );
}
