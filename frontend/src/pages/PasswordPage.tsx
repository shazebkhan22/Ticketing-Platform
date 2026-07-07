import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { changePassword } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  changePasswordSchema as passwordSchema,
  type ChangePasswordValues as PasswordValues,
} from "@/lib/schemas";

export function PasswordPage() {
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmitPassword(values: PasswordValues) {
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast.success("Password changed");
      passwordForm.reset();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        passwordForm.setError("currentPassword", { message: "Current password is incorrect" });
      } else {
        toast.error("Failed to change password");
      }
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold text-neutral-800">Change Password</h2>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting ? "Updating..." : "Change Password"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
