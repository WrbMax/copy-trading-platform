import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

function PnlBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-sm">-</span>;
  const n = parseFloat(value);
  if (n > 0) return <span className="text-profit font-semibold text-sm">+{n.toFixed(4)}</span>;
  if (n < 0) return <span className="text-loss font-semibold text-sm">{n.toFixed(4)}</span>;
  return <span className="text-muted-foreground text-sm">0</span>;
}

const ACTION_LABELS: Record<string, string> = {
  open_long: "开多", open_short: "开空", close_long: "平多", close_short: "平空", close_all: "全平",
};

export default function Orders() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.strategy.orders.useQuery({ page, limit: 20 });
  const { data: stats } = trpc.strategy.orderStats.useQuery();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <UserLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">订单记录</h1>
          <p className="text-muted-foreground text-sm mt-1">查看所有策略订单的开平仓记录和盈亏情况</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "总订单数", value: stats?.totalOrders ?? 0, unit: "笔" },
            { label: "持仓订单", value: stats?.openOrders ?? 0, unit: "笔", color: "text-profit" },
            { label: "总盈利", value: (stats?.totalProfit ?? 0).toFixed(2), unit: "USDT", color: "text-profit" },
            { label: "净盈亏", value: `${(stats?.netPnl ?? 0) >= 0 ? "+" : ""}${(stats?.netPnl ?? 0).toFixed(4)}`, unit: "USDT", color: (stats?.netPnl ?? 0) >= 0 ? "text-profit" : "text-loss" },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color || "text-foreground"}`}>{s.value} <span className="text-sm font-normal text-muted-foreground">{s.unit}</span></p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">订单列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">加载中...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">暂无订单记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">交易对</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">方向</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">数量</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">开仓价</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">平仓价</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">净盈亏</th>
                      <th className="text-center px-4 py-3 text-muted-foreground font-medium">状态</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((order) => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {order.isAbnormal && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />}
                            {order.symbol}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${order.action?.includes("long") ? "bg-profit text-foreground" : "bg-loss text-foreground"}`}>
                            {ACTION_LABELS[order.action] || order.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{parseFloat(order.actualQuantity || "0").toFixed(4)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{order.openPrice ? parseFloat(order.openPrice).toFixed(4) : "-"}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{order.closePrice ? parseFloat(order.closePrice).toFixed(4) : "-"}</td>
                        <td className="px-4 py-3 text-right"><PnlBadge value={order.netPnl} /></td>
                        <td className="px-4 py-3 text-center">
                          {order.status === "open" ? (
                            <Badge className="bg-primary/15 text-primary border-0 text-xs">持仓中</Badge>
                          ) : order.status === "closed" ? (
                            <Badge variant="secondary" className="text-xs">已平仓</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">{order.status}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {order.openTime ? new Date(order.openTime).toLocaleDateString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
