import { LoginForm } from "@/components/login-form";

export function LoginPage() {
  return (
    <div className="bg-blue-200 flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <LoginForm />
      </div>
    </div>
  );
}
