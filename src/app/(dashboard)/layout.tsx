import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Dashboard layout – ensures the user is authenticated before rendering children.
 * If no session exists, redirects to the login page.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // While loading, you could render a spinner – omitted for brevity.
  return <>{children}</>;
}
