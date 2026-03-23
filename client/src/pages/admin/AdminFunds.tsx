import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, Wallet, Settings, Save } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-500",
  approved: "bg-profit text-profit",
  rejected: "bg-loss text-loss",
  completed: "bg-profit text-profit",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "待审核", approved: "已通过", rejected: "已拒绝", completed: "已完成",
};

export default function AdminFunds() {
  const utils = trpc.useUtils();
  const [depPage, setDepPage] = useState(1);
  const [witPage, setWitPage] = useState(1);
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [reviewType, setReviewType] = useState<"deposit" | "withdrawal">("deposit");
  const [rejectReason, setRejectReason] = useState("");
  const [txHashInput, setTxHashInput] = useState("");

  // System config state
  const [walletAddress, setWalletAddress] = useState("");
  const [withdrawalFeeRate, setWithdrawalFeeRate] = useState("");
  const [withdrawalMinAmount, setWithdrawalMinAmount] = useState("");

  const { data: deposits } = trpc.funds.adminDeposits.useQuery({ page: depPage, limit: 20 });
  const { data: withdrawals } = trpc.funds.adminWithdrawals.useQuery({ page: witPage, limit: 20 });
  const { data: configs } = trpc.funds.adminGetConfig.useQuery();

  useEffect(() => {
    if (configs) {
      const configMap = new Map(configs.map((c: any) => [c.configKey, c.configValue]));
      setWalletAddress((configMap.get("platform_deposit_address") as string) || "");
      setWithdrawalFeeRate((configMap.get("withdrawal_fee_rate") as string) || "0.01");
      setWithdrawalMinAmount((configMap.get("withdrawal_min_amount") as string) || "10");
    }
  }, [configs]);

  const setConfigMutation = trpc.funds.adminSetConfig.useMutation({
    onSuccess: () => { toast.success("配置已保存"); utils.funds.adminGetConfig.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const reviewDepMutation = trpc.funds.adminReviewDeposit.useMutation({
    onSuccess: () => { toast.success("审核完成"); utils.funds.adminDeposits.invalidate(); setReviewItem(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const reviewWitMutation = trpc.funds.adminReviewWithdrawal.useMutation({
    onSuccess: () => { toast.success("审核完成"); utils.funds.adminWithdrawals.invalidate(); setReviewItem(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const openReview = (item: any, type: "deposit" | "withdrawal") => {
    setReviewItem(item); setReviewType(type); setRejectReason(""); setTxHashInput("");
  };

  const handleApprove = () => {
    if (reviewType === "deposit") {
      reviewDepMutation.mutate({ depositId: reviewItem.id, approved: true });
    } else {
      reviewWitMutation.mutate({ withdrawalId: reviewItem.id, approved: true, txHash: txHashInput || undefined });
    }
  };

  const handleReject = () => {
    if (reviewType === "deposit") {
      reviewDepMutation.mutate({ depositId: reviewItem.id, approved: false, reviewNote: rejectReason });
    } else {
      reviewWitMutation.mutate({ withdrawalId: reviewItem.id, approved: false, reviewNote: rejectReason });
    }
  };

  const saveConfig = (key: string, value: string) => {
    setConfigMutation.mutate({ key, value });
  };

  const isPending = reviewDepMutation.isPending || reviewWitMutation.isPending;

  const renderTable = (items: any[], type: "deposit" | "withdrawal") => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {["用户ID", "金额 (USDT)", type === "deposit" ? "TxHash" : "收款地址", "状态", "提交时间", "操作"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item: any) => (
            <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/30">
              <td className="px-4 py-3 text-muted-foreground">#{item.userId}</td>
              <td className="px-4 py-3 font-semibold text-foreground">{parseFloat(item.amount).toFixed(4)}</td>
              <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                {type === "deposit" ? (item.txHash ? `${item.txHash.slice(0, 10)}...` : "-") : (item.toAddress ? `${item.toAddress.slice(0, 10)}...` : "-")}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || "bg-secondary text-muted-foreground"}`}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</td>
              <td className="px-4 py-3">
                {item.status === "pending" && (
                  <Button size="sm" variant="outline" className="bg-transparent text-xs" onClick={() => openReview(item, type)}>审核</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-12 text-muted-foreground">暂无数据</p>}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">资金管理</h1>
          <p className="text-muted-foreground text-sm mt-1">审核充提申请、配置收款钱包和手续费</p>
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="bg-secondary">
            <TabsTrigger value="settings"><Settings className="w-3.5 h-3.5 mr-1" />系统设置</TabsTrigger>
            <TabsTrigger value="deposits">充值审核 {deposits?.items.filter((d: any) => d.status === "pending").length ? `(${deposits.items.filter((d: any) => d.status === "pending").length})` : ""}</TabsTrigger>
            <TabsTrigger value="withdrawals">提现审核 {withdrawals?.items.filter((w: any) => w.status === "pending").length ? `(${withdrawals.items.filter((w: any) => w.status === "pending").length})` : ""}</TabsTrigger>
          </TabsList>

          {/* System Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Wallet Address */}
              <Card className="bg-card border-border md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" />平台收款钱包地址</CardTitle>
                  <p className="text-xs text-muted-foreground">用户充值时将看到此地址，请确保是您的 BSC (BEP-20) USDT 收款地址</p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Input
                      placeholder="输入 BSC 链 USDT 收款钱包地址 (0x...)"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="bg-input border-border font-mono text-sm flex-1"
                    />
                    <Button onClick={() => saveConfig("platform_deposit_address", walletAddress)} disabled={setConfigMutation.isPending}>
                      <Save className="w-4 h-4 mr-1" />保存
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Withdrawal Fee Rate */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">提现手续费率</CardTitle>
                  <p className="text-xs text-muted-foreground">用户提现时收取的手续费比例（0.01 = 1%）</p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="如：0.01"
                      value={withdrawalFeeRate}
                      onChange={(e) => setWithdrawalFeeRate(e.target.value)}
                      className="bg-input border-border text-sm flex-1"
                    />
                    <Button onClick={() => saveConfig("withdrawal_fee_rate", withdrawalFeeRate)} disabled={setConfigMutation.isPending}>
                      <Save className="w-4 h-4 mr-1" />保存
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">当前费率: {(parseFloat(withdrawalFeeRate || "0") * 100).toFixed(1)}%</p>
                </CardContent>
              </Card>

              {/* Min Withdrawal */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">最低提现金额</CardTitle>
                  <p className="text-xs text-muted-foreground">用户单次提现的最低金额限制 (USDT)</p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      placeholder="如：10"
                      value={withdrawalMinAmount}
                      onChange={(e) => setWithdrawalMinAmount(e.target.value)}
                      className="bg-input border-border text-sm flex-1"
                    />
                    <Button onClick={() => saveConfig("withdrawal_min_amount", withdrawalMinAmount)} disabled={setConfigMutation.isPending}>
                      <Save className="w-4 h-4 mr-1" />保存
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="deposits" className="mt-4">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                {renderTable(deposits?.items ?? [], "deposit")}
              </CardContent>
            </Card>
            {Math.ceil((deposits?.total ?? 0) / 20) > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setDepPage(p => Math.max(1, p - 1))} disabled={depPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm text-muted-foreground">{depPage}</span>
                <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setDepPage(p => p + 1)} disabled={depPage >= Math.ceil((deposits?.total ?? 0) / 20)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-4">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                {renderTable(withdrawals?.items ?? [], "withdrawal")}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!reviewItem} onOpenChange={(v) => !v && setReviewItem(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>审核{reviewType === "deposit" ? "充值" : "提现"}申请</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="p-4 rounded-lg bg-secondary/50 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">用户ID</span><span>#{reviewItem?.userId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">金额</span><span className="font-semibold">{parseFloat(reviewItem?.amount || "0").toFixed(4)} USDT</span></div>
                {reviewType === "withdrawal" && reviewItem?.fee && (
                  <div className="flex justify-between"><span className="text-muted-foreground">手续费</span><span>{parseFloat(reviewItem.fee).toFixed(4)} USDT</span></div>
                )}
                {reviewItem?.txHash && <div className="flex justify-between"><span className="text-muted-foreground">TxHash</span><span className="font-mono text-xs break-all">{reviewItem.txHash}</span></div>}
                {reviewItem?.fromAddress && <div className="flex justify-between"><span className="text-muted-foreground">来源地址</span><span className="font-mono text-xs break-all">{reviewItem.fromAddress}</span></div>}
                {reviewItem?.toAddress && <div className="flex justify-between"><span className="text-muted-foreground">收款地址</span><span className="font-mono text-xs break-all">{reviewItem.toAddress}</span></div>}
                {reviewItem?.proofNote && <div className="flex justify-between"><span className="text-muted-foreground">备注</span><span>{reviewItem.proofNote}</span></div>}
              </div>
              {reviewType === "withdrawal" && (
                <div className="space-y-2">
                  <Label className="text-sm">转账 TxHash（通过时填写）</Label>
                  <Input placeholder="链上转账哈希" value={txHashInput} onChange={(e) => setTxHashInput(e.target.value)} className="bg-input border-border font-mono text-sm" />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm">拒绝原因（拒绝时必填）</Label>
                <Input placeholder="请输入拒绝原因" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="bg-input border-border" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 bg-transparent border-destructive/40 text-destructive hover:bg-destructive/10" onClick={handleReject} disabled={isPending || !rejectReason}>
                  <XCircle className="w-4 h-4 mr-1" />拒绝
                </Button>
                <Button className="flex-1" onClick={handleApprove} disabled={isPending}>
                  <CheckCircle className="w-4 h-4 mr-1" />{isPending ? "处理中..." : "通过"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
