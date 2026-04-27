import { formatBeijingDate, formatBeijingDateSlash, formatBeijingMonthDay } from "@/lib/dateUtils";
import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, Zap, Crown, Gift, CalendarDays,
  BarChart3, CheckCircle2, ArrowUpRight, ArrowDownRight, Minus,
  Clock, AlertCircle
} from "lucide-react";

function StatCard({ title, value, sub, icon: Icon, colorClass, iconBg }: {
  title: string; value: string; sub?: string; icon: any; colorClass?: string; iconBg?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className={`text-2xl font-bold ${colorClass || "text-foreground"}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg || "bg-primary/15 text-primary"}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, { label: string; color: string }> = {
    open_long:   { label: "开多", color: "bg-green-500/15 text-green-400 border-green-500/30" },
    open_short:  { label: "开空", color: "bg-red-500/15 text-red-400 border-red-500/30" },
    close_long:  { label: "平多", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    close_short: { label: "平空", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  };
  const info = map[action] || { label: action, color: "bg-secondary text-muted-foreground" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${info.color}`}>
      {info.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "open") return (
    <span className="inline-flex items-center gap-1 text-xs text-primary">
      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />持仓中
    </span>
  );
  if (status === "closed") return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CheckCircle2 className="w-3 h-3" />已平仓
    </span>
  );
  if (status === "failed") return (
    <span className="inline-flex items-center gap-1 text-xs text-red-400">
      <AlertCircle className="w-3 h-3" />失败
    </span>
  );
  return <span className="text-xs text-muted-foreground">{status}</span>;
}

export default function Dashboard() {
  const { data: profile } = trpc.user.profile.useQuery();
  const { data: orderStats } = trpc.strategy.orderStats.useQuery();
  const { data: strategies } = trpc.strategy.myStrategies.useQuery();
  const { data: subStatus } = trpc.subscription.myStatus.useQuery();
  const { data: recentOrders } = trpc.strategy.orders.useQuery({ page: 1, limit: 5 });

  const totalProfit = orderStats?.totalProfit ?? 0;
  const totalLoss = orderStats?.totalLoss ?? 0;
  const netPnl = totalProfit - totalLoss;
  const totalOrders = orderStats?.totalOrders ?? 0;
  const openOrders = orderStats?.openOrders ?? 0;
  const enabledStrategies = strategies?.filter((s) => s.isEnabled) ?? [];

  // 订阅状态：取基础档或进阶档中较长的剩余天数
  const isActive = subStatus?.basicActive || subStatus?.advancedActive;
  const isTrial = subStatus?.isTrial;
  const daysLeft = Math.max(subStatus?.basicDaysLeft ?? 0, subStatus?.advancedDaysLeft ?? 0);
  const tier = subStatus?.advancedActive ? "进阶档" : subStatus?.basicActive ? "基础档" : null;
  const expiryDate = subStatus?.advancedActive
    ? subStatus.advancedExpiry
    : subStatus?.basicActive
    ? subStatus.basicExpiry
    : null;

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">我的账户</h1>
            <p className="text-muted-foreground text-sm mt-1">欢迎回来，{profile?.name || "用户"}</p>
          </div>
          <Button asChild size="sm">
            <Link href="/invite-reward" className="flex items-center gap-1">
              <Gift className="w-4 h-4" />邀请
            </Link>
          </Button>
        </div>

        {/* Stats Grid - 盈亏统计 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="累计盈利"
            value={`+${totalProfit.toFixed(2)}`}
            sub="USDT"
            icon={TrendingUp}
            colorClass="text-green-400"
            iconBg="bg-green-500/15 text-green-400"
          />
          <StatCard
            title="累计亏损"
            value={`-${totalLoss.toFixed(2)}`}
            sub="USDT"
            icon={TrendingDown}
            colorClass="text-red-400"
            iconBg="bg-red-500/15 text-red-400"
          />
          <StatCard
            title="净盈亏"
            value={`${netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)}`}
            sub="USDT"
            icon={BarChart3}
            colorClass={netPnl > 0 ? "text-green-400" : netPnl < 0 ? "text-red-400" : "text-foreground"}
            iconBg={netPnl > 0 ? "bg-green-500/15 text-green-400" : netPnl < 0 ? "bg-red-500/15 text-red-400" : "bg-primary/15 text-primary"}
          />
          <StatCard
            title="跟单总数"
            value={`${totalOrders}`}
            sub={`${openOrders} 笔持仓中`}
            icon={Zap}
            iconBg="bg-primary/15 text-primary"
          />
        </div>

        {/* Subscription Status Card */}
        <Card className={`border ${isActive ? "border-primary/30 bg-primary/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? "bg-primary/15 text-primary" : "bg-yellow-500/15 text-yellow-500"}`}>
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isActive
                      ? isTrial ? "体验中（免费试用）" : `订阅有效 · ${tier}`
                      : subStatus?.trialUsed ? "订阅已到期" : "未订阅"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isActive
                      ? `剩余 ${daysLeft} 天 · 到期 ${expiryDate ? formatBeijingDateSlash(expiryDate) : "-"}`
                      : subStatus?.trialUsed ? "请订阅以继续使用跟单功能" : "领取7天免费试用，体验全部功能"}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant={isActive ? "outline" : "default"} className="shrink-0">
                <Link href="/subscription">
                  {isActive ? "管理订阅" : subStatus?.trialUsed ? "立即订阅" : "领取试用"}
                </Link>
              </Button>
            </div>
            {isActive && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  邀请奖励累计 {subStatus?.inviteBonusDays ?? 0} 天
                </span>
                {enabledStrategies.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    {enabledStrategies.length} 个策略运行中
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近订单 */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">最近跟单记录</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-primary text-xs">
                <Link href="/orders">查看全部 →</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!recentOrders?.items?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无跟单记录</p>
                {!isActive && (
                  <Button asChild size="sm" className="mt-3">
                    <Link href="/subscription">开通订阅</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.items.map((order: any) => {
                  const pnl = parseFloat(order.netPnl || "0");
                  const hasPnl = order.status === "closed" && order.netPnl != null;
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border hover:border-border/80 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <ActionBadge action={order.action} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{order.symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.exchange?.toUpperCase()} · {order.actualQuantity} 张
                            {order.multiplier && ` · ${order.multiplier}x`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {hasPnl && (
                          <span className={`text-sm font-semibold flex items-center gap-0.5 ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {pnl >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} U
                          </span>
                        )}
                        <div className="text-right">
                          <StatusBadge status={order.status} />
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {order.createdAt ? formatBeijingMonthDay(order.createdAt) : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Strategies */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">启用中的策略</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-primary text-xs">
                <Link href="/strategy">管理策略 →</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {enabledStrategies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无启用的策略</p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/strategy">去开启策略</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {enabledStrategies.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center text-primary text-xs font-bold">
                        {s.signalSource?.symbol?.slice(0, 3) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.signalSource?.name}</p>
                        <p className="text-xs text-muted-foreground">{s.signalSource?.tradingPair} · 倍数 {s.multiplier}x</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        运行中
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        预期月化 {s.signalSource?.expectedMonthlyReturnMin}~{s.signalSource?.expectedMonthlyReturnMax}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/strategy", icon: Zap, label: "策略中心", desc: "开启/关闭策略" },
            { href: "/orders", icon: BarChart3, label: "订单记录", desc: "查看历史订单" },
            { href: "/subscription", icon: Crown, label: "我的订阅", desc: "订阅状态管理" },
            { href: "/invite-reward", icon: Gift, label: "邀请奖励", desc: "邀请好友得天数" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <item.icon className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </UserLayout>
  );
}
