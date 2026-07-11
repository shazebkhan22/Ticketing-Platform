import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts";
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
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/useTickets";
import type {
  AnalyticsInternalTagCount,
  AnalyticsModeCount,
  AnalyticsPriorityCount,
  AnalyticsStatusCount,
} from "@/types/ticket";
import {
  CALL_TYPE_CONFIG,
  EMPLOYEE_STATUS_CONFIG,
  INTERNAL_TAG_CONFIG,
  MODE_CONFIG,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  STATUS_TO_CONFIG_KEY,
  toPieData,
  VOLUME_CONFIG,
} from "@/constants/analytics";

export function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();

  const priorityData = toPieData<AnalyticsPriorityCount>(data?.byPriority, (r) => r.priority);
  const statusData = toPieData<AnalyticsStatusCount>(data?.byStatus, (r) => STATUS_TO_CONFIG_KEY[r.status]);
  const modeData = toPieData<AnalyticsModeCount>(data?.byMode, (r) => r.mode);
  const internalTagData = toPieData<AnalyticsInternalTagCount>(data?.byInternalTag, (r) => r.internalTag);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800">Analytics</h2>
        <p className="text-sm text-neutral-500">
        Track support performance across ticket lifecycles with insightful visual reports.
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
              <ChartContainer config={VOLUME_CONFIG} className="h-64 w-full">
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
              <ChartContainer config={CALL_TYPE_CONFIG} className="h-64 w-full">
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
              <ChartContainer config={EMPLOYEE_STATUS_CONFIG} className="h-64 w-full">
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

          <Card>
            <CardHeader>
              <CardTitle>Tickets by Priority</CardTitle>
              <CardDescription>All-time distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={PRIORITY_CONFIG} className="mx-auto h-64 aspect-square">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                  <Pie data={priorityData} dataKey="count" nameKey="key" innerRadius={55} strokeWidth={4}>
                    {priorityData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets by Status</CardTitle>
              <CardDescription>Current snapshot</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={STATUS_CONFIG} className="mx-auto h-64 aspect-square">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                  <Pie data={statusData} dataKey="count" nameKey="key" innerRadius={55} strokeWidth={4}>
                    {statusData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets by Mode</CardTitle>
              <CardDescription>Which intake channel is busiest — all-time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={MODE_CONFIG} className="mx-auto h-64 aspect-square">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                  <Pie data={modeData} dataKey="count" nameKey="key" innerRadius={55} strokeWidth={4}>
                    {modeData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Internal vs External</CardTitle>
              <CardDescription>All-time split</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={INTERNAL_TAG_CONFIG} className="mx-auto h-64 aspect-square">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                  <Pie data={internalTagData} dataKey="count" nameKey="key" innerRadius={55} strokeWidth={4}>
                    {internalTagData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
