import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Team() {
  const { data: stats } = trpc.user.teamStats.useQuery();
  const { data: profile } = trpc.user.profile.useQuery();

  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">团队数据</h1>
            <p className="text-muted-foreground text-sm mt-1">查看您的团队规模</p>
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
            { label: "我的分成比例", value: `${parseFloat(profile?.revenueShareRatio || "0").toFixed(1)}`, unit: "%", icon: TrendingUp },
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

      </div>
    </UserLayout>
  );
}
