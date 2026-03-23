import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const ACTION_LABELS: Record<string, string> = {
  open_long: "开多", open_short: "开空", close_long: "平多", close_short: "平空", close_all: "全平",
};

export default function AdminOrders() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [showAbnormal, setShowAbnormal] = useState(false);
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
            <p className="text-muted-foreground text-sm mt-1">监控所有用户的策略订单状态</p>
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
                    {["用户", "交易对", "方向", "数量", "开仓价", "平仓价", "净盈亏", "状态", "异常", "时间"].map((h) => (
                      <th key={h} className="text-left px-3 py-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((order: any) => (
                    <tr key={order.id} className={`border-b border-border/50 hover:bg-secondary/30 ${order.isAbnormal ? "bg-yellow-500/5" : ""}`}>
                      <td className="px-3 py-2.5 text-muted-foreground">#{order.userId}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground">{order.symbol}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${order.action?.includes("long") ? "bg-profit text-foreground" : "bg-loss text-foreground"}`}>
                          {ACTION_LABELS[order.action] || order.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{parseFloat(order.actualQuantity || "0").toFixed(4)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{order.openPrice ? parseFloat(order.openPrice).toFixed(4) : "-"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{order.closePrice ? parseFloat(order.closePrice).toFixed(4) : "-"}</td>
                      <td className="px-3 py-2.5">
                        {order.netPnl ? (
                          <span className={parseFloat(order.netPnl) >= 0 ? "text-profit font-semibold" : "text-loss font-semibold"}>
                            {parseFloat(order.netPnl) >= 0 ? "+" : ""}{parseFloat(order.netPnl).toFixed(4)}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        {order.status === "open" ? <Badge className="bg-primary/15 text-primary border-0 text-xs">持仓中</Badge> : <Badge variant="secondary" className="text-xs">{order.status}</Badge>}
                      </td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => markMutation.mutate({ orderId: order.id, isAbnormal: !order.isAbnormal })} className={`p-1 rounded ${order.isAbnormal ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}>
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {order.openTime ? new Date(order.openTime).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))}
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
