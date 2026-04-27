import { useState } from "react";
import { formatBeijingDateTimeShort, formatBeijingDate } from "@/lib/dateUtils";
import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gift, Users, Star, Copy, Check, Calendar, Crown,
  Share2, Link2, ChevronDown, ChevronUp, UserCheck,
  UserX, Clock, TrendingUp, Award
} from "lucide-react";
import { toast } from "sonner";

// ─── 通用复制函数（兼容 HTTP 和 HTTPS）────────────────────────────────────────
function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error("execCommand failed"));
    } catch (e) {
      document.body.removeChild(ta);
      reject(e);
    }
  });
}

// ─── 订阅状态标签 ─────────────────────────────────────────────────────────────
function SubscriptionBadge({ activeTier, basicExpiry, advancedExpiry, trialUsed }: {
  activeTier: string | null;
  basicExpiry: Date | null;
  advancedExpiry: Date | null;
  trialUsed: boolean;
}) {
  const now = new Date();
  const basicActive = basicExpiry && new Date(basicExpiry) > now;
  const advancedActive = advancedExpiry && new Date(advancedExpiry) > now;

  if (advancedActive) {
    return (
      <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs">
        <Crown className="w-3 h-3 mr-1" />
        进阶档有效
      </Badge>
    );
  }
  if (basicActive) {
    return (
      <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
        <UserCheck className="w-3 h-3 mr-1" />
        基础档有效
      </Badge>
    );
  }
  if (!trialUsed) {
    return (
      <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-xs">
        <Clock className="w-3 h-3 mr-1" />
        未使用试用
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-border text-xs">
      <UserX className="w-3 h-3 mr-1" />
      未订阅
    </Badge>
  );
}

// ─── 被邀请人行 ───────────────────────────────────────────────────────────────
function InviteeRow({ invitee, bonuses }: {
  invitee: {
    id: number;
    name: string | null;
    email: string | null;
    createdAt: Date;
    activeTier: string | null;
    basicExpiry: Date | null;
    advancedExpiry: Date | null;
    trialUsed: boolean;
  };
  bonuses: Array<{
    id: number;
    relatedUserId: number | null;
    daysAdded: number;
    tier: string | null;
    note: string | null;
    createdAt: Date;
  }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const myBonuses = bonuses.filter(b => b.relatedUserId === invitee.id);
  const totalDays = myBonuses.reduce((sum, b) => sum + b.daysAdded, 0);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* 主行 */}
      <div
        className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => myBonuses.length > 0 && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">
              {(invitee.name || invitee.email || "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {invitee.name || "未设置昵称"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {invitee.email} · 注册于 {formatBeijingDate(invitee.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          <SubscriptionBadge
            activeTier={invitee.activeTier}
            basicExpiry={invitee.basicExpiry}
            advancedExpiry={invitee.advancedExpiry}
            trialUsed={invitee.trialUsed}
          />
          {totalDays > 0 && (
            <span className="text-sm font-bold text-amber-500 whitespace-nowrap">
              +{totalDays} 天
            </span>
          )}
          {myBonuses.length > 0 && (
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* 展开的奖励明细 */}
      {expanded && myBonuses.length > 0 && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2">
          <p className="text-xs text-muted-foreground font-medium mb-2">奖励天数明细</p>
          {myBonuses.map(bonus => (
            <div key={bonus.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-amber-500/10 rounded flex items-center justify-center">
                  <Star className="w-3 h-3 text-amber-500" />
                </div>
                <span className="text-muted-foreground">
                  {bonus.note ?? (bonus.tier === "advanced" ? "进阶档订阅奖励" : "基础档订阅奖励")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{formatBeijingDateTimeShort(bonus.createdAt)}</span>
                <span className="font-bold text-amber-500">+{bonus.daysAdded} 天</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function InviteReward() {
  const { data: teamStats } = trpc.subscription.teamStats.useQuery();
  const { data: inviteeData } = trpc.subscription.inviteeList.useQuery();
  const { data: me } = trpc.auth.me.useQuery();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAllInvitees, setShowAllInvitees] = useState(false);

  const inviteCode = me?.inviteCode ?? null;
  const inviteLink = inviteCode
    ? `${window.location.origin}/register?ref=${inviteCode}`
    : null;

  const invitees = inviteeData?.invitees ?? [];
  const bonusDetails = inviteeData?.bonusDetails ?? [];
  const displayedInvitees = showAllInvitees ? invitees : invitees.slice(0, 5);

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await copyText(inviteLink);
      toast.success("邀请链接已复制");
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await copyText(inviteCode);
      toast.success("邀请码已复制");
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <UserLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            邀请奖励
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            邀请好友订阅，双方均可获得额外订阅天数
          </p>
        </div>

        {/* 邀请链接卡片 */}
        <Card className="bg-gradient-to-br from-primary/10 to-violet-500/5 border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">我的邀请链接</span>
            </div>
            <div className="space-y-3">
              {/* 邀请链接 */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background/60 border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground font-mono truncate">
                  {inviteLink ?? "加载中..."}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0 gap-1.5"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Link2 className="w-3.5 h-3.5" />}
                  {copiedLink ? "已复制" : "复制链接"}
                </Button>
              </div>
              {/* 邀请码 */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background/60 border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground tracking-widest text-center">
                  {inviteCode ?? "---"}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCode}
                  className="shrink-0 gap-1.5"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? "已复制" : "复制邀请码"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 统计数据 */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">累计邀请</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{invitees.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">位好友注册</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">有效订阅</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {teamStats?.directSubscribers ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">位正在订阅中</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">累计奖励</span>
              </div>
              <p className="text-2xl font-bold text-amber-500">
                {teamStats?.totalBonusDays ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">天订阅时长</p>
            </CardContent>
          </Card>
        </div>

        {/* 被邀请人列表 */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                我邀请的用户
                {invitees.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{invitees.length}</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invitees.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">还没有邀请任何好友</p>
                <p className="text-xs text-muted-foreground/60 mt-1">分享您的邀请链接，邀请好友注册</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedInvitees.map(invitee => (
                  <InviteeRow
                    key={invitee.id}
                    invitee={invitee}
                    bonuses={bonusDetails}
                  />
                ))}
                {invitees.length > 5 && (
                  <button
                    onClick={() => setShowAllInvitees(!showAllInvitees)}
                    className="w-full text-xs text-primary hover:text-primary/80 transition-colors py-2 flex items-center justify-center gap-1"
                  >
                    {showAllInvitees ? (
                      <><ChevronUp className="w-3.5 h-3.5" />收起</>
                    ) : (
                      <><ChevronDown className="w-3.5 h-3.5" />查看全部 {invitees.length} 位</>
                    )}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 奖励天数明细（全部） */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              天数增加明细
              {bonusDetails.length > 0 && (
                <Badge variant="secondary" className="text-xs">{bonusDetails.length} 条</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bonusDetails.length === 0 ? (
              <div className="text-center py-8">
                <Award className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">暂无奖励记录</p>
                <p className="text-xs text-muted-foreground/60 mt-1">邀请好友订阅后，奖励天数将显示在这里</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bonusDetails.map(bonus => {
                  // 找到对应的被邀请人名称
                  const invitee = invitees.find(u => u.id === bonus.relatedUserId);
                  const inviteeName = invitee?.name || invitee?.email || `用户 #${bonus.relatedUserId}`;
                  return (
                    <div
                      key={bonus.id}
                      className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
                          <Star className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {inviteeName} 订阅奖励
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              bonus.tier === "advanced"
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-primary/10 text-primary"
                            }`}>
                              {bonus.tier === "advanced" ? "进阶档" : "基础档"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatBeijingDateTimeShort(bonus.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-amber-500 shrink-0">+{bonus.daysAdded} 天</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 奖励规则 */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              奖励规则
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  tier: "订阅 1 个月",
                  ratio: "10%",
                  bonus: "奖励 3 天",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                  border: "border-blue-500/20",
                },
                {
                  tier: "订阅 6 个月",
                  ratio: "20%",
                  bonus: "奖励 36 天",
                  color: "text-purple-500",
                  bg: "bg-purple-500/10",
                  border: "border-purple-500/20",
                },
                {
                  tier: "订阅 1 年",
                  ratio: "30%",
                  bonus: "奖励 109 天",
                  color: "text-amber-500",
                  bg: "bg-amber-500/10",
                  border: "border-amber-500/20",
                },
              ].map((item) => (
                <div
                  key={item.tier}
                  className={`flex items-center justify-between ${item.bg} border ${item.border} rounded-xl px-4 py-3`}
                >
                  <div className="flex items-center gap-3">
                    <Crown className={`w-4 h-4 ${item.color}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.tier}</p>
                      <p className="text-xs text-muted-foreground">对应时长的 {item.ratio}</p>
                    </div>
                  </div>
                  <Badge className={`${item.bg} ${item.color} border-current/30 font-semibold`}>
                    {item.bonus}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              被邀请人每次续费（包括首次订阅和后续续费），邀请人均可获得对应比例的奖励天数。
              奖励天数自动累加到您的订阅有效期。
            </p>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
