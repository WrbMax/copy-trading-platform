import { useState } from "react";
import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Coins, ArrowRightLeft, Gift, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  redeem: "净亏损兑换",
  transfer_in: "积分转入",
  transfer_out: "积分转出",
  admin_add: "管理员增加",
  admin_deduct: "管理员扣减",
};

export default function Points() {
  const utils = trpc.useUtils();
  const { data: balance } = trpc.points.myBalance.useQuery();
  const { data: txData } = trpc.points.myTransactions.useQuery({ page: 1, limit: 20 });
  const { data: stats } = trpc.strategy.orderStats.useQuery();
  const { data: profile } = trpc.user.profile.useQuery();

  const [transferOpen, setTransferOpen] = useState(false);
  const [toUserId, setToUserId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const redeemMutation = trpc.points.redeem.useMutation({
    onSuccess: (r) => { toast.success(`成功兑换 ${r.pointsAdded} 积分！`); utils.points.myBalance.invalidate(); utils.points.myTransactions.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const transferMutation = trpc.points.transfer.useMutation({
    onSuccess: () => { toast.success("积分转出成功"); utils.points.myBalance.invalidate(); utils.points.myTransactions.invalidate(); setTransferOpen(false); setToUserId(""); setTransferAmount(""); },
    onError: (e) => toast.error(e.message),
  });

  const netPnl = (stats?.netPnl ?? 0);
  const canRedeem = netPnl < 0;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const alreadyRedeemedThisMonth = profile?.lastPointsRedeemMonth === currentMonth;

  return (
    <UserLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">积分中心</h1>
          <p className="text-muted-foreground text-sm mt-1">净亏损可兑换积分，积分可在平台内转让</p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">积分余额</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold text-foreground">{balance?.points ?? 0}</p>
                  <p className="text-muted-foreground">积分</p>
                </div>
              </div>
              <Coins className="w-10 h-10 text-primary opacity-60" />
            </div>
            <div className="flex gap-3 mt-4">
              <Button className="flex-1" onClick={() => redeemMutation.mutate()} disabled={redeemMutation.isPending || !canRedeem || alreadyRedeemedThisMonth}>
                <Gift className="w-4 h-4 mr-1" />
                {alreadyRedeemedThisMonth ? "本月已兑换" : canRedeem ? `兑换积分 (可兑 ${Math.floor(Math.abs(netPnl))} 分)` : "暂无可兑换积分"}
              </Button>
              <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1 bg-transparent">
                    <ArrowRightLeft className="w-4 h-4 mr-1" />转让积分
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle>积分转让</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label>目标用户ID</Label>
                      <Input placeholder="请输入用户ID" value={toUserId} onChange={(e) => setToUserId(e.target.value)} className="bg-input border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>转让数量</Label>
                      <Input type="number" placeholder="请输入积分数量" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="bg-input border-border" />
                      <p className="text-xs text-muted-foreground">当前余额：{balance?.points ?? 0} 积分</p>
                    </div>
                    <Button className="w-full" onClick={() => transferMutation.mutate({ toUserId: parseInt(toUserId), amount: parseInt(transferAmount) })} disabled={transferMutation.isPending || !toUserId || !transferAmount}>
                      {transferMutation.isPending ? "转让中..." : "确认转让"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Redeem rules */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-medium flex items-center gap-2"><Info className="w-4 h-4 text-primary" />积分兑换规则</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• 当月净亏损（总亏损 - 总盈利）可按 <span className="text-foreground font-medium">1 USDT = 1 积分</span> 兑换</li>
              <li>• 每月仅限兑换一次，兑换后当月净亏损记录清零</li>
              <li>• 积分可在用户之间自由转让，无手续费</li>
              <li>• 积分暂不可直接兑换为USDT（后续版本开放）</li>
            </ul>
            <div className="p-3 rounded-lg bg-secondary/50 text-sm">
              <p className="text-muted-foreground">当前净盈亏：<span className={`font-semibold ${netPnl >= 0 ? "text-profit" : "text-loss"}`}>{netPnl >= 0 ? "+" : ""}{netPnl.toFixed(4)} USDT</span></p>
              {canRedeem && !alreadyRedeemedThisMonth && (
                <p className="text-primary mt-1">可兑换积分：{Math.floor(Math.abs(netPnl))} 分</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transaction history */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">积分记录</CardTitle></CardHeader>
          <CardContent className="p-0">
            {txData?.items.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">暂无积分记录</p>
            ) : (
              <div className="divide-y divide-border">
                {txData?.items.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{TYPE_LABELS[tx.type] || tx.type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tx.note}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.amount > 0 ? "text-profit" : "text-loss"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
