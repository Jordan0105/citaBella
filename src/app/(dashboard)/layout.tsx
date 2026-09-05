import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { BottomNav } from "@/components/shared/bottom-nav";
import { Logo } from "@/components/shared/logo";
import { UserMenu } from "@/components/shared/user-menu";
import { NotificationsBell } from "@/features/notifications/components/notifications-bell";
import { getAuthContext } from "@/features/auth/queries/get-auth-context";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const isOwner = auth.role === "owner";

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        isOwner={isOwner}
        className="sticky top-0 hidden h-screen lg:flex"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden lg:block" aria-hidden />
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <UserMenu fullName={auth.fullName} role={auth.role} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-8">
          {children}
        </main>
        <BottomNav isOwner={isOwner} className="lg:hidden" />
      </div>
    </div>
  );
}
