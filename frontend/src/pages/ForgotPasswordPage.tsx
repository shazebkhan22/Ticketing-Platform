import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPassword } from "@/api/auth";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    // Always show the same generic confirmation, whether or not the email
    // matched an account — the backend responds identically either way so
    // this page can't be used to check which emails have accounts here.
    try {
      await forgotPassword(values.email);
    } finally {
      setSubmitted(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="shadow-neutral-400 shadow-2xl">
          <CardContent className="p-6 md:p-8">
            {submitted ? (
              <div className="text-center">
                <h1 className="text-xl font-bold">Check your email</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  If an account exists for that email, we've sent a link to reset your password.
                  It expires in 30 minutes.
                </p>
                <Link
                  to="/login"
                  className="mt-6 inline-block text-sm underline-offset-2 hover:underline"
                >
                  Back to login
                </Link>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <img src="/Cygnus Exp.png" alt="Cygnus" className="mb-2 h-10 w-auto" />
                    <h1 className="text-2xl font-bold">Forgot your password?</h1>
                    <p className="text-balance text-muted-foreground">
                      Enter your account email and we'll send you a reset link.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Sending..." : "Send reset link"}
                  </Button>

                  <Link
                    to="/login"
                    className="text-center text-sm underline-offset-2 hover:underline"
                  >
                    Back to login
                  </Link>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
