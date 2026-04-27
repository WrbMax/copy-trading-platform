import { formatBeijingDateTime, formatBeijingDate } from "@/lib/dateUtils";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Search, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Users, Receipt, BarChart2,
  ShieldCheck, ShieldOff, Crown, Star
} from "lucide-react";
import { toast } from "sonner";



// ─── 订阅天数徽章 ──────────────────────────────────────────────────────────────
function SubBadge({ days, tier }: { days: number; tier: "basic" | "advanced" }) {
  if (days <= 0) return <span className="text-xs text-muted-foreground">—</span>;
  const isAdv = tier === "advanced";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${
      isAdv ? "bg-purple-500/15 text-purple-400" : "bg-blue-500/15 text-blue-400"
    }`}>
      {isAdv ? <Crown className="w-3 h-3" /> : <Star className="w-3 h-3" />}
      {days}天
    </span>
  );
}

// ─── 邀请成员展开行 ────────────────────────────────────────────────────────────
function InviteesRow({ userId, colSpan }: { userId: number; colSpan: number }) {
  const { data: invitees, isLoading } = trpc.user.adminGetInvitees.useQuery({ userId });
  return (
    <tr>
      <td colSpan={colSpan} className="px-0 py-0">
        <div className="bg-secondary/20 border-b border-border/50 px-8 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">邀请的成员</span>
          </div>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">加载中...</p>
          ) : invitees == null || invitees.length === 0 ? (
            <p className="text-xs text-muted-foreground">该用户暂无邀请成员</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {["ID", "用户名", "邮箱", "状态", "注册时间"].map((h) => (
                    <th key={h} className="text-left py-1 pr-6 text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invitees.map((inv: any) => (
                  <tr key={inv.id} className="border-t border-border/30">
                    <td className="py-1.5 pr-6 text-muted-foreground">#{inv.id}</td>
                    <td className="py-1.5 pr-6 font-medium text-foreground">{inv.name || "-"}</td>
                    <td className="py-1.5 pr-6 text-muted-foreground">{inv.email || "-"}</td>
                    <td className="py-1.5 pr-6">
                      <Badge variant={inv.isActive ? "default" : "secondary"} className="text-xs">
                        {inv.isActive ? "正常" : "禁用"}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-6 text-muted-foreground">{formatBeijingDate(inv.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── 订阅类型标签映射 ─────────────────────────────────────────────────────────
const SUB_TYPE_LABEL: Record<string, string> = {
  trial: "7天免费试用",
  basic_1m: "基础档 · 1个月",
  basic_6m: "基础档 · 6个月",
  basic_1y: "基础档 · 1年",
  advanced_1m: "进阶档 · 1个月",
  advanced_6m: "进阶档 · 6个月",
  advanced_1y: "进阶档 · 1年",
  invite_bonus: "邀请奖励",
  admin_grant: "管理员赠送",
};

const SUB_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  approved: { label: "已生效", color: "text-emerald-400" },
  pending: { label: "待审核", color: "text-yellow-400" },
  rejected: { label: "已拒绝", color: "text-red-400" },
};

// ─── 订阅记录弹窗 ──────────────────────────────────────────────────────────────
function ConsumptionDialog({ user, onClose }: { user: any; onClose: () => void }) {
  const { data: subs, isLoading } = trpc.subscription.adminGetUserSubscriptions.useQuery(
    { userId: user.id, limit: 100 }
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            #{user.id} {user.name} — 订阅记录
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">加载中...</div>
          ) : subs == null || subs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Receipt className="w-10 h-10 opacity-30" />
              <p className="text-sm">该用户暂无订阅记录</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  {["#", "类型", "档次", "天数", "金额", "状态", "到期时间", "备注"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map((sub: any) => {
                  const statusCfg = SUB_STATUS_CONFIG[sub.status] ?? { label: sub.status, color: "text-muted-foreground" };
                  return (
                    <tr key={sub.id} className="border-b border-border/40 hover:bg-secondary/20">
                      <td className="px-3 py-2.5 text-muted-foreground font-mono">#{sub.id}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">
                        {SUB_TYPE_LABEL[sub.type] ?? sub.type}
                      </td>
                      <td className="px-3 py-2.5">
                        {sub.tier === "advanced" ? (
                          <span className="inline-flex items-center gap-1 text-purple-400">
                            <Crown className="w-3 h-3" />进阶
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-400">
                            <Star className="w-3 h-3" />基础
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-foreground whitespace-nowrap">
                        +{sub.daysAdded}天
                      </td>
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                        {parseFloat(sub.amountPaid || 0) > 0
                          ? <span className="text-emerald-400">{parseFloat(sub.amountPaid).toFixed(2)} USDT</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                      <td className={`px-3 py-2.5 font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        {sub.expiryAfter ? formatBeijingDateTime(sub.expiryAfter) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {sub.note ? (
                          <span title={sub.note}>{sub.note.slice(0, 20)}{sub.note.length > 20 ? "..." : ""}</span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {subs != null && subs.length > 0 && (
          <div className="border-t border-border pt-3 mt-2 flex gap-6 text-xs text-muted-foreground">
            <span>共 <strong className="text-foreground">{subs.length}</strong> 条记录</span>
            <span>累计天数 <strong className="text-primary">
              {subs.filter((s: any) => s.status === "approved").reduce((acc: number, s: any) => acc + (s.daysAdded || 0), 0)}天
            </strong></span>
            <span>实付金额 <strong className="text-emerald-400">
              {subs.filter((s: any) => s.status === "approved").reduce((acc: number, s: any) => acc + parseFloat(s.amountPaid || 0), 0).toFixed(2)} USDT
            </strong></span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 跟单记录弹窗 ──────────────────────────────────────────────────────────────
function OrdersDialog({ user, onClose }: { user: any; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.user.adminGetUserOrders.useQuery(
    { userId: user.id, page, limit: 20 }
  );
  const items = data?.items ?? [];
  const stats = data?.stats;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const actionLabel: Record<string, { text: string; color: string }> = {
    open_long:   { text: "开多", color: "text-emerald-400" },
    open_short:  { text: "开空", color: "text-red-400" },
    close_long:  { text: "平多", color: "text-emerald-400" },
    close_short: { text: "平空", color: "text-red-400" },
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            #{user.id} {user.name} — 跟单记录
          </DialogTitle>
        </DialogHeader>

        {stats && (
          <div className="grid grid-cols-4 gap-3 pb-3 border-b border-border">
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">总订单</p>
              <p className="text-lg font-bold">{stats.totalOrders}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">持仓中</p>
              <p className="text-lg font-bold text-blue-400">{stats.openOrders}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">累计盈利</p>
              <p className={`text-lg font-bold ${parseFloat(stats.totalProfit || "0") >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {parseFloat(stats.totalProfit || "0").toFixed(2)} U
              </p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">平台扣费</p>
              <p className="text-lg font-bold text-orange-400">{parseFloat(stats.totalRevenueShare || "0").toFixed(2)} U</p>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">加载中...</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <BarChart2 className="w-10 h-10 opacity-30" />
              <p className="text-sm">该用户暂无跟单记录</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  {["ID", "交易所", "方向", "数量", "倍数", "开仓价", "已实现盈亏", "净盈亏", "状态", "时间"].map((h) => (
                    <th key={h} className="text-left px-2 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const action = actionLabel[item.action] || { text: item.action, color: "text-foreground" };
                  const isOpenOrder = item.action === "open_long" || item.action === "open_short";
                  return (
                    <tr key={item.id} className="border-b border-border/40 hover:bg-secondary/20">
                      <td className="px-2 py-2 text-muted-foreground">#{item.id}</td>
                      <td className="px-2 py-2">{item.exchange}</td>
                      <td className={`px-2 py-2 font-semibold ${action.color}`}>{action.text}</td>
                      <td className="px-2 py-2">{item.actualQuantity ?? "-"}</td>
                      <td className="px-2 py-2">{item.multiplier ? `${item.multiplier}x` : "-"}</td>
                      <td className="px-2 py-2">{item.openPrice ? parseFloat(item.openPrice).toFixed(2) : "-"}</td>
                      <td className={`px-2 py-2 font-semibold ${!isOpenOrder && item.realizedPnl ? (parseFloat(item.realizedPnl) >= 0 ? "text-emerald-400" : "text-red-400") : ""}`}>
                        {!isOpenOrder && item.realizedPnl ? parseFloat(item.realizedPnl).toFixed(4) : "-"}
                      </td>
                      <td className={`px-2 py-2 font-semibold ${!isOpenOrder && item.netPnl ? (parseFloat(item.netPnl) >= 0 ? "text-emerald-400" : "text-red-400") : ""}`}>
                        {!isOpenOrder && item.netPnl ? parseFloat(item.netPnl).toFixed(4) : "-"}
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant={item.status === "open" ? "default" : "secondary"} className="text-xs">
                          {item.status === "open" ? "持仓中" : item.status === "closed" ? "已平仓" : item.status}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">
                        {item.createdAt ? formatBeijingDateTime(item.createdAt) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-3 border-t border-border">
            <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [consumptionUser, setConsumptionUser] = useState<any>(null);
  const [orderUser, setOrderUser] = useState<any>(null);

  const listQuery = trpc.user.adminList.useQuery({ page, limit: 20 });
  const searchQuery = trpc.user.adminSearch.useQuery(
    { keyword: search, page, limit: 20 },
    { enabled: search.trim().length > 0 }
  );
  const toggleMutation = trpc.user.adminToggleUser.useMutation({
    onSuccess: () => {
      toast.success("用户状态已更新");
      listQuery.refetch();
      searchQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const activeQuery = search.trim().length > 0 ? searchQuery : listQuery;
  const { data, isLoading } = activeQuery;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">用户管理</h1>
            <p className="text-sm text-muted-foreground mt-1">共 {total} 名用户</p>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户名、邮箱或 ID"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-input border-border"
          />
        </div>

        {/* 用户表格 */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    {["ID", "用户名", "邮箱", "基础档", "进阶档", "绑定交易所", "状态", "注册时间", "操作"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-muted-foreground">加载中...</td>
                    </tr>
                  )}
                  {items.map((u: any) => (
                    <>
                      <tr key={u.id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">#{u.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {(u.name || u.email || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{u.name || "-"}</p>
                              {u.role === "admin" && (
                                <span className="text-xs text-amber-400">管理员</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{u.email || "-"}</td>
                        <td className="px-4 py-3">
                          <SubBadge days={u.basicDaysLeft ?? 0} tier="basic" />
                        </td>
                        <td className="px-4 py-3">
                          <SubBadge days={u.advancedDaysLeft ?? 0} tier="advanced" />
                        </td>
                        <td className="px-4 py-3">
                          {u.exchangeApiCount > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.exchangeTypes.map((ex: string) => (
                                <Badge key={ex} variant="outline" className="text-xs px-1.5 py-0 capitalize border-border/60">
                                  {ex}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">未绑定</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={u.isActive ? "default" : "secondary"}
                            className={`text-xs ${u.isActive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}`}
                          >
                            {u.isActive ? "正常" : "禁用"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {formatBeijingDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 w-7 p-0 ${u.isActive ? "text-red-400 hover:bg-red-500/10" : "text-emerald-400 hover:bg-emerald-500/10"}`}
                              onClick={() => toggleMutation.mutate({ userId: u.id, isActive: !u.isActive })}
                              title={u.isActive ? "禁用账号" : "启用账号"}
                              disabled={u.role === "admin"}
                            >
                              {u.isActive ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                              onClick={() => setConsumptionUser(u)}
                              title="查看订阅记录"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-blue-400 hover:bg-blue-500/10"
                              onClick={() => setOrderUser(u)}
                              title="查看跟单记录"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 w-7 p-0 ${expandedUserId === u.id ? "text-primary" : "text-muted-foreground"}`}
                              onClick={() => setExpandedUserId(prev => prev === u.id ? null : u.id)}
                              title="查看邀请的成员"
                            >
                              {expandedUserId === u.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedUserId === u.id && (
                        <InviteesRow userId={u.id} colSpan={9} />
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              {!isLoading && items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Users className="w-10 h-10 opacity-30" />
                  <p className="text-sm">暂无用户数据</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 分页 */}
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

        {/* 订阅记录弹窗 */}
        {consumptionUser && (
          <ConsumptionDialog user={consumptionUser} onClose={() => setConsumptionUser(null)} />
        )}
        {/* 跟单记录弹窗 */}
        {orderUser && (
          <OrdersDialog user={orderUser} onClose={() => setOrderUser(null)} />
        )}
      </div>
    </AdminLayout>
  );
}
