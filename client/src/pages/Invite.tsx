import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Gift, Users, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export default function Invite() {
  const { data: profile } = trpc.user.profile.useQuery();
  const { data: teamStats } = trpc.user.teamStats.useQuery();

  const inviteCode = profile?.inviteCode || "";
  const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
  const inviteUrl = `${window.location.origin}${basePath}/register?ref=${inviteCode}`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}已复制`);
  };

  return (
    <UserLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">邀请好友</h1>
          <p className="text-muted-foreground text-sm mt-1">邀请好友加入，获得多级收益分成</p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">我的邀请码</p>
                <p className="text-xs text-muted-foreground">分享给好友，绑定上下级关系</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <p className="text-3xl font-bold text-center tracking-widest text-primary">{inviteCode || "加载中..."}</p>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => copy(inviteCode, "邀请码")}>
                <Copy className="w-4 h-4 mr-1" />复制邀请码
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => copy(inviteUrl, "邀请链接")}>
                <LinkIcon className="w-4 h-4 mr-1" />复制邀请链接
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">直属下级</p>
              <p className="text-2xl font-bold text-foreground mt-1">{teamStats?.directCount ?? 0} <span className="text-sm font-normal text-muted-foreground">人</span></p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">团队总人数</p>
              <p className="text-2xl font-bold text-foreground mt-1">{teamStats?.totalCount ?? 0} <span className="text-sm font-normal text-muted-foreground">人</span></p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">邀请奖励说明</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>邀请好友加入后，您将成为其上级，享受多级收益分成：</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>当您的下级产生盈利订单时，系统将按差额分账方式向您分配收益</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>分成比例由管理员根据您的级别设置，层级越深差额越小</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>收益分成实时结算，直接入账到您的平台余额</li>
            </ul>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs">
              邀请链接：<span className="font-mono break-all">{inviteUrl}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
