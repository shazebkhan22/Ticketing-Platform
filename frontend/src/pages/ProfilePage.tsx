import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { changePassword, updateProfile } from "@/api/auth";
import { useAuth } from "@/hooks/useAuth";
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
  profileDetailsSchema as detailsSchema,
  changePasswordSchema as passwordSchema,
  type ProfileDetailsValues as DetailsValues,
  type ChangePasswordValues as PasswordValues,
} from "@/lib/schemas";

export function ProfilePage() {
  const { user, setUser } = useAuth();

  const detailsForm = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      displayName: user?.displayName ?? "",
      email: "",
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmitDetails(values: DetailsValues) {
    try {
      const updated = await updateProfile(values.displayName, values.email ?? "");
      setUser(updated);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
  }

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

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Profile</h2>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="mb-8 text-md font-semibold text-slate-700">Account Details</h3>
        <Form {...detailsForm}>
          <form
            onSubmit={detailsForm.handleSubmit(onSubmitDetails)}
            className="space-y-4"
          >
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input value={user.username} disabled />
              </FormControl>
            </FormItem>

            <FormField
              control={detailsForm.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={detailsForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={detailsForm.formState.isSubmitting}>
              {detailsForm.formState.isSubmitting ? "Saving..." : "Save Details"}
            </Button>
          </form>
        </Form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="mb-8 text-md font-semibold text-slate-700">Change Password</h3>
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
            className="space-y-4"
          >
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
