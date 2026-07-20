import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { resetPassword } from "@/api/auth";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/schemas";
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

export function ResetPasswordPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    try {
      await resetPassword(token, values.newPassword);
      setDone(true);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 400) {
        form.setError("root", {
          message: "This reset link is invalid or has expired. Please request a new one.",
        });
      } else {
        form.setError("root", { message: "Something went wrong. Please try again." });
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="shadow-neutral-400 shadow-2xl">
          <CardContent className="p-6 md:p-8">
            {done ? (
              <div className="text-center">
                <h1 className="text-xl font-bold">Password updated</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your password has been reset. You can now log in with your new password.
                </p>
                <Button className="mt-6 w-full" onClick={() => navigate("/login")}>
                  Go to login
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <img src="/Cygnus Exp.png" alt="Cygnus" className="mb-2 h-10 w-auto" />
                    <h1 className="text-2xl font-bold">Reset your password</h1>
                    <p className="text-balance text-muted-foreground">
                      Choose a new password for your account.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.formState.errors.root && (
                    <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
                  )}

                  <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Resetting..." : "Reset password"}
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
