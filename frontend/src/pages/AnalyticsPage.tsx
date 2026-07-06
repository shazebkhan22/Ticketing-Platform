import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/useTickets";

const volumeConfig = {
  created: {
    label: "Created",
    color: "var(--chart-2)",
  },
  closed: {
    label: "Closed",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const callTypeConfig = {
  count: {
    label: "Tickets",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const employeeStatusConfig = {
  pending: {
    label: "Pending",
    color: "var(--chart-1)",
  },
  inProgress: {
    label: "In Progress",
    color: "var(--chart-2)",
  },
  closed: {
    label: "Closed",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800">Analytics</h2>
        <p className="text-sm text-neutral-500">
          View your ticketing system analytics and reports.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Volume</CardTitle>
              <CardDescription>Created vs. closed — last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={volumeConfig} className="h-64 w-full">
                <AreaChart data={data?.monthly ?? []}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <defs>
                    <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-created)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-created)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-closed)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-closed)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="created"
                    type="natural"
                    fill="url(#fillCreated)"
                    stroke="var(--color-created)"
                    stackId="a"
                  />
                  <Area
                    dataKey="closed"
                    type="natural"
                    fill="url(#fillClosed)"
                    stroke="var(--color-closed)"
                    stackId="b"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets by Call Type</CardTitle>
              <CardDescription>All-time distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={callTypeConfig} className="h-64 w-full">
                <BarChart data={data?.byCallType ?? []}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="callType"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Tickets by Employee</CardTitle>
              <CardDescription>Pending, in progress, and closed per assignee</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={employeeStatusConfig} className="h-64 w-full">
                <BarChart accessibilityLayer data={data?.byEmployee ?? []}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="employee"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="pending"
                    stackId="a"
                    fill="var(--color-pending)"
                    radius={[0, 0, 4, 4]}
                  />
                  <Bar
                    dataKey="inProgress"
                    stackId="a"
                    fill="var(--color-inProgress)"
                  />
                  <Bar
                    dataKey="closed"
                    stackId="a"
                    fill="var(--color-closed)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Total tickets currently assigned to each employee, by status
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
