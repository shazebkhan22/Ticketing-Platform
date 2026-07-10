import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useSmtpSettings, useUpdateSmtpSettings } from "@/hooks/useSettings";
import { smtpSettingsSchema, type SmtpSettingsValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function SettingsPage() {
  const { data: settings, isLoading } = useSmtpSettings();
  const updateMutation = useUpdateSmtpSettings();

  const form = useForm<SmtpSettingsValues>({
    resolver: zodResolver(smtpSettingsSchema),
    defaultValues: {
      host: "",
      port: 587,
      username: "",
      password: "",
      fromAddress: "",
      fromName: "",
      secure: false,
    },
  });

  useEffect(() => {
    if (!settings) return;
    form.reset({
      host: settings.host,
      port: settings.port,
      username: settings.username,
      password: "",
      fromAddress: settings.fromAddress,
      fromName: settings.fromName,
      secure: settings.secure,
    });
  }, [settings, form]);

  async function onSubmit(values: SmtpSettingsValues) {
    try {
      await updateMutation.mutateAsync(values);
      toast.success("SMTP settings saved");
      form.setValue("password", "");
    } catch {
      toast.error("Failed to save SMTP settings");
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-bold text-neutral-800">Settings</h2>
        <p className="text-sm text-neutral-500 max-w-xl">
          Configure the SMTP server used to email customers (repair-complete and feedback
          requests) and employees.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP Host</FormLabel>
                    <FormControl>
                      <Input placeholder="smtp.gmail.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={settings?.hasPassword ? "Leave blank to keep current password" : ""}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fromAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="noreply@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Cygnus Support" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secure"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      Use TLS/SSL (secure)
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
