import { useState } from "react";
import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, UserPlus, Percent, Check, X, BarChart2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── 订单展示辅助组件 ──────────────────────────────────────────────────────────

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

// ─── 成员交易记录弹窗 ──────────────────────────────────────────────────────────

function MemberOrdersDialog({
  inviteeId,
  open,
  onClose,
}: {
  inviteeId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.user.inviteeMemberOrders.useQuery(
    { inviteeId: inviteeId ?? 0, page, limit: 20 },
    { enabled: open && inviteeId !== null }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const stats = data?.stats;
  const inviteeName = data?.inviteeName ?? "";

  // 切换成员时重置分页
  const handleOpenChange = (v: boolean) => {
    if (!v) { onClose(); setPage(1); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col bg-card border-border">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="w-4 h-4 text-primary" />
            {inviteeName} 的交易记录
          </DialogTitle>
        </DialogHeader>

        {/* 统计摘要 */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 shrink-0">
            {[
              { label: "总交易笔数", value: stats.totalOrders, unit: "笔" },
              { label: "持仓中", value: stats.openOrders, unit: "笔", color: "text-primary" },
              { label: "累计盈利", value: stats.totalProfit.toFixed(2), unit: "USDT", color: "text-profit" },
              {
                label: "净盈亏",
                value: `${stats.netPnl >= 0 ? "+" : ""}${stats.netPnl.toFixed(4)}`,
                unit: "USDT",
                color: stats.netPnl >= 0 ? "text-profit" : "text-loss",
              },
            ].map((s) => (
              <div key={s.label} className="bg-secondary/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold mt-0.5 ${s.color ?? "text-foreground"}`}>
                  {s.value} <span className="text-xs font-normal text-muted-foreground">{s.unit}</span>
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 订单表格 */}
        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无交易记录</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border bg-secondary/20">
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs">交易对</th>
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs">方向</th>
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs">交易所</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs">倍数</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs">数量</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs">成交价</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs">手续费</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs">已实现盈亏</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs">净盈亏</th>
                  <th className="text-center px-3 py-2.5 text-muted-foreground font-medium text-xs">状态</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs">时间</th>
                </tr>
              </thead>
              <tbody>
                {items.map((order: any) => {
                  const meta = ACTION_META[order.action] ?? { label: order.action, colorClass: "bg-muted text-muted-foreground" };
                  const isOpen = order.action === "open_long" || order.action === "open_short";
                  const price = isOpen ? order.openPrice : order.closePrice;
                  const time = isOpen ? (order.openTime ?? order.createdAt) : (order.closeTime ?? order.createdAt);

                  return (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs font-medium text-foreground">{order.symbol}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${meta.colorClass}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {EXCHANGE_LABELS[order.exchange] || order.exchange || "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                        {order.multiplier ? `${parseFloat(order.multiplier).toFixed(1)}x` : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {parseFloat(order.actualQuantity || "0").toFixed(4)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                        {price ? parseFloat(price).toFixed(2) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                        {order.fee ? parseFloat(order.fee).toFixed(4) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isOpen ? <span className="text-muted-foreground text-xs">-</span> : <PnlCell value={order.realizedPnl} />}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isOpen
                          ? (order.status === "open"
                              ? <span className="text-muted-foreground text-xs">持仓中</span>
                              : <span className="text-muted-foreground text-xs">-</span>)
                          : <PnlCell value={order.netPnl} />
                        }
                      </td>
                      <td className="px-3 py-2 text-center">
                        {order.status === "open" ? (
                          <Badge className="bg-primary/15 text-primary border-0 text-xs">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1 animate-pulse inline-block" />
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
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(time)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 shrink-0 pt-2 border-t border-border">
            <Button variant="outline" size="sm" className="bg-transparent h-7 w-7 p-0"
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="bg-transparent h-7 w-7 p-0"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────

export default function Team() {
  const utils = trpc.useUtils();
  const { data: stats } = trpc.user.teamStats.useQuery();
  const { data: profile } = trpc.user.profile.useQuery();
  const { data: invitees } = trpc.user.myInvitees.useQuery();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRatio, setEditRatio] = useState("");

  // 查看交易记录弹窗状态
  const [viewingInviteeId, setViewingInviteeId] = useState<number | null>(null);

  const setRatioMutation = trpc.user.setInviteeRevenueShare.useMutation({
    onSuccess: () => {
      toast.success("分成比例已更新");
      utils.user.myInvitees.invalidate();
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">团队数据</h1>
            <p className="text-muted-foreground text-sm mt-1">查看您的团队规模与分成设置</p>
          </div>
          <Button asChild size="sm">
            <Link href="/invite" className="flex items-center gap-1"><UserPlus className="w-4 h-4" />邀请成员</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "团队总人数", value: stats?.totalCount ?? 0, unit: "人", icon: Users },
            { label: "直推人数", value: stats?.directCount ?? 0, unit: "人", icon: UserPlus },
            { label: "团队总盈利", value: `${(stats?.teamProfit ?? 0).toFixed(2)}`, unit: "USDT", icon: TrendingUp },
            { label: "我的分成比例", value: `${parseFloat(profile?.revenueShareRatio || "0").toFixed(1)}`, unit: "%", icon: Percent },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{s.value} <span className="text-sm font-normal text-muted-foreground">{s.unit}</span></p>
                  </div>
                  <s.icon className="w-5 h-5 text-primary opacity-60" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Invitee List with Revenue Share Setting */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> 我邀请的成员
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!invitees || invitees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无邀请成员</p>
                <p className="text-xs mt-1">分享您的邀请链接来邀请新成员</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["成员", "邮箱", "分成比例", "状态", "加入时间", "操作"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invitees.map((inv: any) => (
                      <tr key={inv.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="px-4 py-3 text-foreground font-medium">{inv.name || `用户#${inv.id}`}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{inv.email}</td>
                        <td className="px-4 py-3">
                          {editingId === inv.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={parseFloat(profile?.revenueShareRatio || "0")}
                                max="70"
                                step="0.1"
                                value={editRatio}
                                onChange={(e) => setEditRatio(e.target.value)}
                                className="w-20 h-7 text-xs bg-input border-border"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-emerald-500"
                                onClick={() => setRatioMutation.mutate({ inviteeId: inv.id, ratio: parseFloat(editRatio) })}
                                disabled={setRatioMutation.isPending}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-primary font-semibold">
                              {parseFloat(inv.revenueShareRatio || "0").toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${inv.isActive ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}>
                            {inv.isActive ? "正常" : "已禁用"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* 查看交易记录按钮 */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => setViewingInviteeId(inv.id)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              交易记录
                            </Button>
                            {editingId !== inv.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => { setEditingId(inv.id); setEditRatio(inv.revenueShareRatio || "0"); }}
                              >
                                设置分成
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              提示：您可以为邀请的成员设置分成比例，范围为 {parseFloat(profile?.revenueShareRatio || "0").toFixed(1)}% - 70%。该比例表示下级盈利时被扣除的比例，其中您与下级比例的差额部分为您的推荐收益。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 成员交易记录弹窗 */}
      <MemberOrdersDialog
        inviteeId={viewingInviteeId}
        open={viewingInviteeId !== null}
        onClose={() => setViewingInviteeId(null)}
      />
    </UserLayout>
  );
}
