import { useState } from "react";
import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "审核中", color: "bg-yellow-500/15 text-yellow-500" },
  approved: { label: "已通过", color: "bg-profit text-profit" },
  rejected: { label: "已拒绝", color: "bg-loss text-loss" },
  completed: { label: "已完成", color: "bg-profit text-profit" },
};

export default function Funds() {
  const utils = trpc.useUtils();
  const { data: balance } = trpc.funds.myBalance.useQuery();
  const { data: depositAddr } = trpc.funds.depositAddress.useQuery();
  const { data: deposits } = trpc.funds.myDeposits.useQuery({ page: 1, limit: 20 });
  const { data: withdrawals } = trpc.funds.myWithdrawals.useQuery({ page: 1, limit: 20 });

  const [depositAmount, setDepositAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [toAddress, setToAddress] = useState("");

  const depositMutation = trpc.funds.submitDeposit.useMutation({
    onSuccess: () => { toast.success("充值申请已提交，等待审核"); utils.funds.myDeposits.invalidate(); setDepositAmount(""); setTxHash(""); setProofNote(""); },
    onError: (e) => toast.error(e.message),
  });

  const withdrawMutation = trpc.funds.submitWithdrawal.useMutation({
    onSuccess: () => { toast.success("提现申请已提交"); utils.funds.myWithdrawals.invalidate(); utils.funds.myBalance.invalidate(); setWithdrawAmount(""); setToAddress(""); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <UserLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">充值提现</h1>
          <p className="text-muted-foreground text-sm mt-1">BSC链USDT充值与提现管理</p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">可用余额</p>
            <p className="text-3xl font-bold text-foreground mt-1">{parseFloat(balance?.balance || "0").toFixed(4)} <span className="text-lg font-normal text-muted-foreground">USDT</span></p>
          </CardContent>
        </Card>

        <Tabs defaultValue="deposit">
          <TabsList className="bg-secondary w-full">
            <TabsTrigger value="deposit" className="flex-1">充值</TabsTrigger>
            <TabsTrigger value="withdraw" className="flex-1">提现</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">记录</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="mt-4 space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">充值地址（BSC链 BEP-20 USDT）</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm text-foreground break-all flex-1">{depositAddr?.address}</p>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(depositAddr?.address || ""); toast.success("已复制"); }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>请仅转入BSC链（BEP-20）的USDT，转入其他网络或代币将导致资产丢失。转账完成后请填写下方信息提交审核。</span>
                </div>
                <div className="space-y-2">
                  <Label>充值金额 (USDT)</Label>
                  <Input type="number" placeholder="请输入充值金额" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label>交易哈希 (TxHash)</Label>
                  <Input placeholder="0x..." value={txHash} onChange={(e) => setTxHash(e.target.value)} className="bg-input border-border font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>备注（可选）</Label>
                  <Input placeholder="其他说明" value={proofNote} onChange={(e) => setProofNote(e.target.value)} className="bg-input border-border" />
                </div>
                <Button className="w-full" onClick={() => depositMutation.mutate({ amount: parseFloat(depositAmount), txHash, proofNote })} disabled={depositMutation.isPending || !depositAmount}>
                  {depositMutation.isPending ? "提交中..." : "提交充值申请"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="mt-4 space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label>提现金额 (USDT)</Label>
                  <Input type="number" placeholder="请输入提现金额" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label>收款地址（BSC链）</Label>
                  <Input placeholder="0x..." value={toAddress} onChange={(e) => setToAddress(e.target.value)} className="bg-input border-border font-mono text-sm" />
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-xs text-muted-foreground space-y-1">
                  <p>• 提现将收取手续费，实际到账金额以审核通知为准</p>
                  <p>• 提现申请提交后将冻结对应余额，审核通过后转账</p>
                  <p>• 请确保收款地址为BSC链地址，填写错误导致的损失自行承担</p>
                </div>
                <Button className="w-full" onClick={() => withdrawMutation.mutate({ amount: parseFloat(withdrawAmount), toAddress })} disabled={withdrawMutation.isPending || !withdrawAmount || !toAddress}>
                  {withdrawMutation.isPending ? "提交中..." : "提交提现申请"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">充值记录</h3>
              {deposits?.items.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">暂无充值记录</p> : (
                <div className="space-y-2">
                  {deposits?.items.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                      <div>
                        <p className="text-sm font-medium">+{parseFloat(d.amount).toFixed(4)} USDT</p>
                        <p className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[d.status]?.color || "bg-secondary text-muted-foreground"}`}>
                        {STATUS_MAP[d.status]?.label || d.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">提现记录</h3>
              {withdrawals?.items.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">暂无提现记录</p> : (
                <div className="space-y-2">
                  {withdrawals?.items.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                      <div>
                        <p className="text-sm font-medium text-loss">-{parseFloat(w.amount).toFixed(4)} USDT</p>
                        <p className="text-xs text-muted-foreground font-mono">{w.toAddress?.slice(0, 10)}...{w.toAddress?.slice(-6)}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[w.status]?.color || "bg-secondary text-muted-foreground"}`}>
                        {STATUS_MAP[w.status]?.label || w.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
}
