import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, TrendingUp, ListOrdered, Zap, Coins } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = trpc.user.adminDashboard.useQuery();

  const cards = [
    { label: "注册用户总数", value: stats?.totalUsers ?? 0, unit: "人", icon: Users, color: "text-primary" },
    { label: "总充值笔数", value: stats?.totalDeposits ?? 0, unit: "笔", icon: CreditCard, color: "text-profit" },
    { label: "异常订单", value: stats?.abnormalOrders ?? 0, unit: "笔", icon: ListOrdered, color: "text-loss" },
    { label: "平台总盈利", value: `${(stats?.totalProfit ?? 0).toFixed(2)}`, unit: "USDT", icon: TrendingUp, color: "text-profit" },
    { label: "待审充值", value: stats?.pendingDeposits ?? 0, unit: "笔", icon: CreditCard, color: "text-yellow-500" },
    { label: "待审提现", value: stats?.pendingWithdrawals ?? 0, unit: "笔", icon: CreditCard, color: "text-yellow-500" },
    { label: "总收益分成", value: `${(stats?.totalRevenueShare ?? 0).toFixed(2)}`, unit: "USDT", icon: TrendingUp, color: "text-primary" },
    { label: "总提现笔数", value: stats?.totalWithdrawals ?? 0, unit: "笔", icon: Zap, color: "text-primary" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-muted-foreground text-sm mt-1">平台整体运营数据概览</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((c) => (
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
