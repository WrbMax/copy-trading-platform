import { formatBeijingMonthDay } from "@/lib/dateUtils";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";

const ACTION_META: Record<string, { label: string; colorClass: string }> = {
  open_long:   { label: "开多", colorClass: "bg-profit/20 text-profit" },
  open_short:  { label: "开空", colorClass: "bg-loss/20 text-loss" },
  close_long:  { label: "平多", colorClass: "bg-profit/10 text-profit/70" },
  close_short: { label: "平空", colorClass: "bg-loss/10 text-loss/70" },
  close_all:   { label: "全平", colorClass: "bg-muted text-muted-foreground" },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending:  { label: "待执行", className: "bg-yellow-500/15 text-yellow-500 border-0" },
  open:     { label: "持仓中", className: "bg-primary/15 text-primary border-0" },
  closed:   { label: "已平仓", className: "bg-muted text-muted-foreground border-0" }, // 平仓单用，开仓单会单独判断
  failed:   { label: "失败",   className: "bg-loss/15 text-loss border-0" },
  cancelled:{ label: "已取消", className: "bg-muted text-muted-foreground border-0" },
};

const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance", okx: "OKX", bybit: "Bybit", bitget: "Bitget", gate: "Gate.io",
};

export default function AdminOrders() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [showAbnormal, setShowAbnormal] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data } = trpc.strategy.adminAllOrders.useQuery({ page, limit: 30 });
  const allItems = data?.items ?? [];
  const items = showAbnormal ? allItems.filter((o: any) => o.isAbnormal) : allItems;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 30);

  const markMutation = trpc.strategy.adminMarkAbnormal.useMutation({
    onSuccess: () => { toast.success("已标记"); utils.strategy.adminAllOrders.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">订单监控</h1>
            <p className="text-muted-foreground text-sm mt-1">每笔开仓和平仓均单独展示，与交易所历史成交一一对应（共 {total} 条）</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">仅看异常</span>
            <Switch checked={showAbnormal} onCheckedChange={setShowAbnormal} />
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["用户", "信号源", "交易所", "交易对", "方向", "数量", "倍数", "成交价", "手续费", "已实现盈亏", "净盈亏", "状态", "异常", "时间"].map((h) => (
                      <th key={h} className="text-left px-3 py-3 text-muted-foreground font-medium whitespace-nowrap text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((order: any) => {
                    const st = STATUS_LABELS[order.status] ?? { label: order.status, className: "" };
                    const meta = ACTION_META[order.action] ?? { label: order.action, colorClass: "bg-muted text-muted-foreground" };
                    const isOpen = order.action === "open_long" || order.action === "open_short";
                    const price = isOpen ? order.openPrice : order.closePrice;
                    const time = isOpen ? (order.openTime ?? order.createdAt) : (order.closeTime ?? order.createdAt);
                    const isExpanded = expandedId === order.id;
                    const netPnl = order.netPnl ? parseFloat(order.netPnl) : null;
                    const realizedPnl = order.realizedPnl ? parseFloat(order.realizedPnl) : null;

                    return (
                      <>
                        <tr
                          key={order.id}
                          className={`border-b border-border/50 hover:bg-secondary/30 cursor-pointer ${order.isAbnormal ? "bg-yellow-500/5" : ""}`}
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        >
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground text-xs">{order.userName || "未知"}</span>
                              <span className="text-xs text-muted-foreground">ID:{order.userId}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{order.signalSourceName || "-"}</td>
                          <td className="px-3 py-2.5 text-xs font-medium">{EXCHANGE_LABELS[order.exchange] || order.exchange}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-foreground">{order.symbol}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${meta.colorClass}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                            {parseFloat(order.actualQuantity || "0").toFixed(4)}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {parseFloat(order.multiplier || "1").toFixed(1)}x
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                            {price ? parseFloat(price).toFixed(2) : "-"}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                            {order.fee ? parseFloat(order.fee).toFixed(4) : "-"}
                          </td>
                          {/* 已实现盈亏：只有平仓单才有 */}
                          <td className="px-3 py-2.5">
                            {isOpen ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : realizedPnl !== null ? (
                              <span className={`font-semibold text-xs ${realizedPnl >= 0 ? "text-profit" : "text-loss"}`}>
                                {realizedPnl >= 0 ? "+" : ""}{realizedPnl.toFixed(4)}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">-</span>}
                          </td>
                          {/* 净盈亏：只有平仓单才有 */}
                          <td className="px-3 py-2.5">
                            {isOpen ? (
                              order.status === "open"
                                ? <span className="text-xs text-muted-foreground">持仓中</span>
                                : <span className="text-xs text-muted-foreground">-</span>
                            ) : netPnl !== null ? (
                              <span className={`font-semibold text-xs ${netPnl >= 0 ? "text-profit" : "text-loss"}`}>
                                {netPnl >= 0 ? "+" : ""}{netPnl.toFixed(4)}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">-</span>}
                          </td>
                          <td className="px-3 py-2.5">
                             <Badge className={`text-xs ${st.className}`}>
                               {isOpen && order.status === "closed" ? "已开仓" : st.label}
                             </Badge>
                           </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); markMutation.mutate({ orderId: order.id, isAbnormal: !order.isAbnormal }); }}
                              className={`p-1 rounded ${order.isAbnormal ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {time ? formatBeijingMonthDay(time) : "-"}
                          </td>
                        </tr>
                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr key={`${order.id}-detail`} className="bg-secondary/20">
                            <td colSpan={14} className="px-4 py-3">
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                <div>
                                  <p className="text-muted-foreground">信号数量</p>
                                  <p className="font-semibold">{parseFloat(order.signalQuantity || "0").toFixed(4)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">开仓价</p>
                                  <p className="font-semibold font-mono">{order.openPrice ? parseFloat(order.openPrice).toFixed(4) : "-"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">平仓价</p>
                                  <p className="font-semibold font-mono">{order.closePrice ? parseFloat(order.closePrice).toFixed(4) : "-"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">交易所订单号</p>
                                  <p className="font-mono text-xs break-all">{order.exchangeOrderId || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">订单ID</p>
                                  <p className="font-mono">{order.id}</p>
                                </div>
                              </div>
                              {order.errorMessage && (
                                <div className="mt-2 flex items-start gap-2 p-2 rounded bg-loss/10 text-loss text-xs">
                                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                  <span>{order.errorMessage}</span>
                                </div>
                              )}
                              {order.abnormalNote && (
                                <div className="mt-2 flex items-start gap-2 p-2 rounded bg-yellow-500/10 text-yellow-600 text-xs">
                                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                  <span>{order.abnormalNote}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
              {items.length === 0 && <p className="text-center py-12 text-muted-foreground">暂无订单数据</p>}
            </div>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
