import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, ArrowDownRight } from "lucide-react";
import { formatDate } from "@/lib/time";

export default function Earnings() {
  const [page, setPage] = useState(1);
  const { data: stats } = trpc.strategy.revenueShareStats.useQuery();
  const { data } = trpc.user.myRevenueShares.useQuery({ page, limit: 20 });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <UserLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">我的收益</h1>
          <p className="text-muted-foreground text-sm mt-1">收益分成收入与扣减明细</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">累计收益分成收入</p>
              <p className="text-2xl font-bold text-profit mt-1">+{(stats?.totalReceived ?? 0).toFixed(4)} USDT</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">累计被扣收益分成</p>
              <p className="text-2xl font-bold text-loss mt-1">-{(stats?.totalDeducted ?? 0).toFixed(4)} USDT</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">净收益分成</p>
              <p className={`text-2xl font-bold mt-1 ${((stats?.totalReceived ?? 0) - (stats?.totalDeducted ?? 0)) >= 0 ? "text-profit" : "text-loss"}`}>
                {((stats?.totalReceived ?? 0) - (stats?.totalDeducted ?? 0)).toFixed(4)} USDT
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">分成明细</CardTitle></CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">暂无收益分成记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">类型</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">关联用户</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">分成比例</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">金额</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r: any) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="px-4 py-3">
                          {r.recipientId === r.traderId ? (
                            <span className="flex items-center gap-1 text-loss text-xs"><ArrowDownRight className="w-3.5 h-3.5" />被扣分成</span>
                          ) : (
                            <span className="flex items-center gap-1 text-profit text-xs"><TrendingUp className="w-3.5 h-3.5" />收益分成</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">用户 #{r.traderId}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{parseFloat(r.ratio).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right font-semibold text-profit">+{parseFloat(r.amount).toFixed(4)}</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
    </UserLayout>
  );
}
