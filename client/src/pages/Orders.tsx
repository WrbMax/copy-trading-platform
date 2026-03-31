import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Clock, BarChart2 } from "lucide-react";

function PnlCell({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground text-xs">-</span>;
  const n = parseFloat(value);
  if (isNaN(n)) return <span className="text-muted-foreground text-xs">-</span>;
  if (n > 0) return <span className="text-profit font-semibold text-xs">+{n.toFixed(4)}</span>;
  if (n < 0) return <span className="text-loss font-semibold text-xs">{n.toFixed(4)}</span>;
  return <span className="text-muted-foreground text-xs">0.0000</span>;
}

function formatTime(d: Date | string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleString("zh-CN", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

const ACTION_META: Record<string, { label: string; colorClass: string }> = {
  open_long:   { label: "开多", colorClass: "bg-profit/20 text-profit" },
  open_short:  { label: "开空", colorClass: "bg-loss/20 text-loss" },
  close_long:  { label: "平多", colorClass: "bg-profit/10 text-profit/70" },
  close_short: { label: "平空", colorClass: "bg-loss/10 text-loss/70" },
  close_all:   { label: "全平", colorClass: "bg-muted text-muted-foreground" },
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
          <p className="text-muted-foreground text-sm mt-1">每笔开仓和平仓均单独展示，与交易所历史成交一一对应</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "总交易笔数", value: stats?.totalOrders ?? 0, unit: "笔", icon: <BarChart2 className="w-4 h-4" /> },
            { label: "持仓中", value: stats?.openOrders ?? 0, unit: "笔", color: "text-primary", icon: <TrendingUp className="w-4 h-4" /> },
            { label: "累计盈利", value: (stats?.totalProfit ?? 0).toFixed(2), unit: "USDT", color: "text-profit", icon: <TrendingUp className="w-4 h-4" /> },
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
              {total > 0 && <span className="text-xs text-muted-foreground font-normal ml-1">共 {total} 条</span>}
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
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">成交价</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">手续费</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">已实现盈亏</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">净盈亏</th>
                      <th className="text-center px-4 py-3 text-muted-foreground font-medium text-xs">状态</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((order) => {
                      const meta = ACTION_META[order.action] ?? { label: order.action, colorClass: "bg-muted text-muted-foreground" };
                      const isOpen = order.action === "open_long" || order.action === "open_short";
                      // 成交价：开仓用 openPrice，平仓用 closePrice
                      const price = isOpen ? order.openPrice : order.closePrice;
                      // 时间：开仓用 openTime / createdAt，平仓用 closeTime / createdAt
                      const time = isOpen ? (order.openTime ?? order.createdAt) : (order.closeTime ?? order.createdAt);

                      return (
                        <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs font-medium text-foreground">{order.symbol}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${meta.colorClass}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {EXCHANGE_LABELS[order.exchange] || order.exchange || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                            {order.multiplier ? `${parseFloat(order.multiplier).toFixed(1)}x` : "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            {parseFloat(order.actualQuantity || "0").toFixed(4)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                            {price ? parseFloat(price).toFixed(2) : "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                            {order.fee ? parseFloat(order.fee).toFixed(4) : "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {/* 开仓单没有已实现盈亏 */}
                            {isOpen ? <span className="text-muted-foreground text-xs">-</span> : <PnlCell value={order.realizedPnl} />}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {isOpen
                              ? (order.status === "open"
                                  ? <span className="text-muted-foreground text-xs">持仓中</span>
                                  : <span className="text-muted-foreground text-xs">-</span>)
                              : <PnlCell value={order.netPnl} />
                            }
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {order.status === "open" ? (
                              <Badge className="bg-primary/15 text-primary border-0 text-xs">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1 animate-pulse inline-block" />
                                持仓中
                              </Badge>
                            ) : order.status === "closed" ? (
                              isOpen
                                ? <Badge variant="secondary" className="text-xs">已开仓</Badge>
                                : <Badge variant="secondary" className="text-xs">已平仓</Badge>
                            ) : order.status === "failed" ? (
                              <Badge variant="destructive" className="text-xs">失败</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">{order.status}</Badge>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(time)}
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
