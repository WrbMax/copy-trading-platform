import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, TrendingUp, TrendingDown, ListOrdered, Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = trpc.user.adminDashboard.useQuery();

  // 用户维度
  const userCards = [
    { label: "注册用户总数", value: stats?.totalUsers ?? 0, unit: "人", icon: Users, color: "text-primary" },
    { label: "用户累计盈利", value: `${(stats?.totalProfit ?? 0).toFixed(2)}`, unit: "USDT", icon: TrendingUp, color: "text-profit" },
    { label: "用户累计亏损", value: `${(stats?.totalLoss ?? 0).toFixed(2)}`, unit: "USDT", icon: TrendingDown, color: "text-loss" },
    { label: "异常订单", value: stats?.abnormalOrders ?? 0, unit: "笔", icon: ListOrdered, color: "text-loss" },
  ];

  // 平台收入维度
  const revenueCards = [
    {
      label: "平台服务费收入",
      value: `${(stats?.totalDeducted ?? 0).toFixed(2)}`,
      unit: "USDT",
      icon: Wallet,
      color: "text-profit",
      desc: "从用户余额扣除的服务费总额",
    },
    {
      label: "分给推荐人",
      value: `${(stats?.totalRevenueShare ?? 0).toFixed(2)}`,
      unit: "USDT",
      icon: ArrowUpRight,
      color: "text-yellow-500",
      desc: "分成给各级邀请人的总额",
    },
    {
      label: "平台净收入",
      value: `${(stats?.platformNetRevenue ?? 0).toFixed(2)}`,
      unit: "USDT",
      icon: TrendingUp,
      color: "text-primary",
      desc: "服务费收入 − 推荐人分成",
    },
  ];

  // 资金维度
  const fundCards = [
    { label: "总充值金额", value: `${(stats?.totalDeposits ?? 0).toFixed(2)}`, unit: "USDT", icon: ArrowDownLeft, color: "text-profit" },
    { label: "总提现金额", value: `${(stats?.totalWithdrawals ?? 0).toFixed(2)}`, unit: "USDT", icon: ArrowUpRight, color: "text-primary" },
    { label: "待审充值", value: stats?.pendingDeposits ?? 0, unit: "笔", icon: CreditCard, color: "text-yellow-500" },
    { label: "待审提现", value: stats?.pendingWithdrawals ?? 0, unit: "笔", icon: CreditCard, color: "text-yellow-500" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-muted-foreground text-sm mt-1">平台整体运营数据概览</p>
        </div>

        {/* 平台收入 */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">平台收入</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {revenueCards.map((c) => (
              <Card key={c.label} className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                      <p className="text-xs text-muted-foreground">{c.unit}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{c.desc}</p>
                    </div>
                    <c.icon className={`w-5 h-5 ${c.color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 用户数据 */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">用户数据</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {userCards.map((c) => (
              <Card key={c.label} className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                      <p className="text-xs text-muted-foreground">{c.unit}</p>
                    </div>
                    <c.icon className={`w-5 h-5 ${c.color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 资金数据 */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">资金数据</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fundCards.map((c) => (
              <Card key={c.label} className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                      <p className="text-xs text-muted-foreground">{c.unit}</p>
                    </div>
                    <c.icon className={`w-5 h-5 ${c.color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">快速操作</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/admin/funds", label: "审核充值申请", badge: stats?.pendingDeposits ?? 0 },
                { href: "/admin/funds", label: "审核提现申请", badge: stats?.pendingWithdrawals ?? 0 },
                { href: "/admin/signals", label: "管理信号源" },
                { href: "/admin/users", label: "用户管理" },
              ].map((item) => (
                <a key={item.label} href={item.href} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <span className="text-sm text-foreground">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500 text-xs font-medium">{item.badge} 待处理</span>
                  )}
                </a>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">系统状态</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "数据库连接", status: "正常", color: "text-profit" },
                { label: "信号接收", status: "就绪", color: "text-profit" },
                { label: "策略执行", status: "运行中", color: "text-profit" },
                { label: "收益分成", status: "自动结算", color: "text-profit" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <span className={`text-xs font-medium ${s.color} flex items-center gap-1`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />{s.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
