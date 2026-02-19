"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import CentreResearchHome from "@/components/landing/CentreResearchHome";

// Single loading shell used for both server and client initial render to avoid hydration mismatch
function HomeLoadingShell() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Always render the same shell until mounted so server and client match (avoids hydration error)
  if (!mounted) {
    return <HomeLoadingShell />;
  }

  if (isLoading) {
    return <HomeLoadingShell />;
  }

  // If admin/staff is logged in, redirect to admin dashboard
  if (isAuthenticated && hasRole(["ADMIN", "MANAGER", "STAFF"])) {
    if (typeof window !== "undefined") {
      window.location.href = "/admin-dashboard";
    }
    return <HomeLoadingShell />;
  }

  // If sales manager is logged in, redirect to sales manager analytics
  if (isAuthenticated && hasRole(["SALES_MANAGER"])) {
    if (typeof window !== "undefined") {
      window.location.href = "/sales-manager/analytics";
    }
    return <HomeLoadingShell />;
  }

  // If sales rep is logged in, redirect to orders
  if (isAuthenticated && hasRole(["SALES_REP"])) {
    if (typeof window !== "undefined") {
      window.location.href = "/orders";
    }
    return <HomeLoadingShell />;
  }

  return <CentreResearchHome />;
}
