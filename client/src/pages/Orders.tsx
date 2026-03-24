import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight, Clock, BarChart2 } from "lucide-react";

function PnlBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-sm">-</span>;
  const n = parseFloat(value);
  if (n > 0) return <span className="text-profit font-semibold text-sm">+{n.toFixed(4)}</span>;
  if (n < 0) return <span className="text-loss font-semibold text-sm">{n.toFixed(4)}</span>;
  return <span className="text-muted-foreground text-sm">0.0000</span>;
}

function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

const ACTION_LABELS: Record<string, { label: string; isLong: boolean }> = {
  open_long:  { label: "开多", isLong: true },
  open_short: { label: "开空", isLong: false },
  close_long: { label: "平多", isLong: true },
  close_short:{ label: "平空", isLong: false },
  close_all:  { label: "全平", isLong: false },
};

const EXCHANGE_LABELS: Record<string, string> = {
  okx: "OKX", binance: "Binance", bybit: "Bybit", bitget: "Bitget", gate: "Gate.io",
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
          <p className="text-muted-foreground text-sm mt-1">查看所有策略跟单的开平仓记录和盈亏情况</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "总订单数", value: stats?.totalOrders ?? 0, unit: "笔", icon: <BarChart2 className="w-4 h-4" /> },
            { label: "持仓中", value: stats?.openOrders ?? 0, unit: "笔", color: "text-primary", icon: <TrendingUp className="w-4 h-4" /> },
            { label: "总盈利", value: (stats?.totalProfit ?? 0).toFixed(2), unit: "USDT", color: "text-profit", icon: <TrendingUp className="w-4 h-4" /> },
            { label: "净盈亏", value: `${(stats?.netPnl ?? 0) >= 0 ? "+" : ""}${(stats?.netPnl ?? 0).toFixed(4)}`, unit: "USDT", color: (stats?.netPnl ?? 0) >= 0 ? "text-profit" : "text-loss", icon: <TrendingDown className="w-4 h-4" /> },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <span className={`${s.color || "text-muted-foreground"} opacity-60`}>{s.icon}</span>
                </div>
                <p className={`text-xl font-bold ${s.color || "text-foreground"}`}>
                  {s.value} <span className="text-sm font-normal text-muted-foreground">{s.unit}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              订单列表
              {total > 0 && <span className="text-xs text-muted-foreground font-normal ml-1">共 {total} 笔</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>暂无订单记录</p>
                <p className="text-xs mt-1">订阅策略后，跟单订单将在此显示</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">交易对</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">方向</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">交易所</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">倍数</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">数量</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">开仓价</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">平仓价</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">手续费</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">扣除分成</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">净盈亏</th>
                      <th className="text-center px-4 py-3 text-muted-foreground font-medium text-xs">状态</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">开仓时间</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">平仓时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((order) => {
                      const actionInfo = ACTION_LABELS[order.action] || { label: order.action, isLong: true };
                      return (
                        <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-1.5">
                              {order.isAbnormal && (
                                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                              )}
                              <span className="font-mono text-xs">{order.symbol}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${actionInfo.isLong ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"}`}>
                              {actionInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">
                              {EXCHANGE_LABELS[order.exchange] || order.exchange || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                            {order.multiplier ? `${parseFloat(order.multiplier).toFixed(1)}x` : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs">
                            {parseFloat(order.actualQuantity || "0").toFixed(4)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                            {order.openPrice ? parseFloat(order.openPrice).toFixed(2) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                            {order.closePrice ? parseFloat(order.closePrice).toFixed(2) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                            {order.fee ? parseFloat(order.fee).toFixed(4) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-loss">
                            {order.revenueShareDeducted && parseFloat(order.revenueShareDeducted) > 0 ? `-${parseFloat(order.revenueShareDeducted).toFixed(4)}` : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <PnlBadge value={order.netPnl} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {order.status === "open" ? (
                              <Badge className="bg-primary/15 text-primary border-0 text-xs">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1 animate-pulse" />
                                持仓中
                              </Badge>
                            ) : order.status === "closed" ? (
                              <Badge variant="secondary" className="text-xs">已平仓</Badge>
                            ) : order.status === "failed" ? (
                              <Badge variant="destructive" className="text-xs">失败</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">{order.status}</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(order.openTime)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(order.closeTime)}
                          </td>
                        </tr>
                      );
                    })}
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
