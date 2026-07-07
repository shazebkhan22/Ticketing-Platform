import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProfile } from "@/api/auth";
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
  type ProfileDetailsValues as DetailsValues,
} from "@/lib/schemas";

export function ProfilePage() {
  const { user, setUser } = useAuth();

  const detailsForm = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      displayName: user?.displayName ?? "",
      email: user?.email ?? "",
    },
  });

  async function onSubmitDetails(values: DetailsValues) {
    try {
      const updated = await updateProfile(values.displayName, user?.email ?? "");
      setUser(updated);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold text-neutral-800">Profile</h2>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        {/* <h3 className="mb-8 text-md font-semibold text-neutral-700">Account Details</h3> */}
        <Form {...detailsForm}>
          <form onSubmit={detailsForm.handleSubmit(onSubmitDetails)} className="space-y-4">
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
                    <Input capitalize {...field} />
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
                    <Input type="email" {...field} value={user.email} disabled />
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
    </div>
  );
}
