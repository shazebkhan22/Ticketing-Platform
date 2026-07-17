import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { cn } from "@/lib/utils"
import { loginSchema, type LoginFormValues } from "@/lib/schemas"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { login } = useAuth()
  const navigate = useNavigate()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values.username, values.password)
      navigate("/")
    } catch (err) {
      if (isAxiosError(err)) {
        if (!err.response) {
          form.setError("root", {
            message: "Internal server error. Try again shortly.",
          })
        } else if (err.response.status === 401) {
          form.setError("root", { message: "Invalid username or password" })
        } else {
          form.setError("root", {
            message: err.response.data?.error || "Something went wrong. Please try again.",
          })
        }
      } else {
        form.setError("root", { message: "Something went wrong. Please try again." })
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 shadow-neutral-400 shadow-2xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form className="p-6 md:p-8" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <img src="/Cygnus Exp.png" alt="Cygnus" className="mb-2 h-10 w-auto" />
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-balance text-muted-foreground">Login to your account</p>
                </div>

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="helpdesk" autoComplete="username" {...field} />
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
                      <div className="flex items-center">
                        <FormLabel>Password</FormLabel>
                        <a
                          href="#"
                          className="ml-auto text-sm underline-offset-2 hover:underline"
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.root.message}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="mb-20"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Signing in..." : "Login"}
                </Button>
              </div>
            </form>
          </Form>
          <div className="relative hidden bg-muted md:block">
            <img
              src="/Lodha.jpg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
