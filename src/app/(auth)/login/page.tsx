import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = { title: "Inicia sesión" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-bella-50 via-background to-lavanda-100 p-6 dark:from-background dark:via-background dark:to-accent">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
