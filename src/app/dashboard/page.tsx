import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./_components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  return (
    <Suspense>
      <DashboardClient
        currentUserId={user.id as string}
        currentUserRole={user.role as string}
      />
    </Suspense>
  );
}
