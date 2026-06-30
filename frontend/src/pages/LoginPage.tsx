import { LoginForm } from "@/components/login-form";

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <LoginForm />
      </div>
    </div>
  );
}
