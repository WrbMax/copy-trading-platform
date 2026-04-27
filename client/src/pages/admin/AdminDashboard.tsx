import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, TrendingDown, ListOrdered, Crown, Clock, CheckCircle } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = trpc.user.adminDashboard.useQuery();
  const { data: subStats } = trpc.subscription.adminStats.useQuery();

  // 订阅收入维度
  const subscriptionCards = [
    {
      label: "有效订阅用户",
      value: subStats?.activeSubscribers ?? 0,
      unit: "人",
      icon: Crown,
      color: "text-primary",
      desc: "当前订阅有效的用户数",
    },
    {
      label: "本月订阅收入",
      value: `${(subStats?.monthRevenue ?? 0).toFixed(2)}`,
      unit: "USDT",
      icon: TrendingUp,
      color: "text-profit",
      desc: "本月已生效的订阅金额",
    },
    {
      label: "累计订阅收入",
      value: `${(subStats?.totalRevenue ?? 0).toFixed(2)}`,
      unit: "USDT",
      icon: Crown,
      color: "text-primary",
      desc: "历史累计订阅收入总额",
    },
    {
      label: "待支付订单",
      value: subStats?.orders?.pending ?? 0,
      unit: "笔",
      icon: Clock,
      color: "text-yellow-500",
      desc: "等待链上确认的订单",
    },
    {
      label: "已支付订单",
      value: subStats?.orders?.paid ?? 0,
      unit: "笔",
      icon: CheckCircle,
      color: "text-profit",
      desc: "已成功支付的订单数",
    },
  ];

  // 用户维度
  const userCards = [
    { label: "注册用户总数", value: stats?.totalUsers ?? 0, unit: "人", icon: Users, color: "text-primary" },
    { label: "用户累计盈利", value: `${(stats?.totalProfit ?? 0).toFixed(2)}`, unit: "USDT", icon: TrendingUp, color: "text-profit" },
    { label: "用户累计亏损", value: `${(stats?.totalLoss ?? 0).toFixed(2)}`, unit: "USDT", icon: TrendingDown, color: "text-loss" },
    { label: "异常订单", value: stats?.abnormalOrders ?? 0, unit: "笔", icon: ListOrdered, color: "text-loss" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-muted-foreground text-sm mt-1">平台整体运营数据概览</p>
        </div>

        {/* 订阅收入 */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">订阅数据</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {subscriptionCards.map((c) => (
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

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">快速操作</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/admin/subscription", label: "订阅管理 / 扫链确认", badge: subStats?.orders?.pending ?? 0 },
                { href: "/admin/subscription", label: "审核待处理订阅记录", badge: subStats?.pendingReview ?? 0 },
                { href: "/admin/signals", label: "管理信号源" },
                { href: "/admin/users", label: "用户管理" },
                { href: "/admin/orders", label: "跟单订单监控" },
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
                { label: "订阅验证", status: "自动检测", color: "text-profit" },
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
