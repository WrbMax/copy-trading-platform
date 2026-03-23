import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [feeRate, setFeeRate] = useState("");

  const { data: deposits } = trpc.funds.adminDeposits.useQuery({ page: depPage, limit: 20 });
  const { data: withdrawals } = trpc.funds.adminWithdrawals.useQuery({ page: witPage, limit: 20 });

  const reviewDepMutation = trpc.funds.adminReviewDeposit.useMutation({
    onSuccess: () => { toast.success("审核完成"); utils.funds.adminDeposits.invalidate(); setReviewItem(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const reviewWitMutation = trpc.funds.adminReviewWithdrawal.useMutation({
    onSuccess: () => { toast.success("审核完成"); utils.funds.adminWithdrawals.invalidate(); setReviewItem(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const openReview = (item: any, type: "deposit" | "withdrawal") => {
    setReviewItem(item); setReviewType(type); setRejectReason(""); setFeeRate("");
  };

  const handleApprove = () => {
    if (reviewType === "deposit") {
      reviewDepMutation.mutate({ depositId: reviewItem.id, approved: true });
    } else {
      reviewWitMutation.mutate({ withdrawalId: reviewItem.id, approved: true });
    }
  };

  const handleReject = () => {
    if (reviewType === "deposit") {
      reviewDepMutation.mutate({ depositId: reviewItem.id, approved: false, reviewNote: rejectReason });
    } else {
      reviewWitMutation.mutate({ withdrawalId: reviewItem.id, approved: false, reviewNote: rejectReason });
    }
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
          <h1 className="text-2xl font-bold">资金审核</h1>
          <p className="text-muted-foreground text-sm mt-1">审核用户充值和提现申请</p>
        </div>

        <Tabs defaultValue="deposits">
          <TabsList className="bg-secondary">
            <TabsTrigger value="deposits">充值审核 {deposits?.items.filter((d: any) => d.status === "pending").length ? `(${deposits.items.filter((d: any) => d.status === "pending").length})` : ""}</TabsTrigger>
            <TabsTrigger value="withdrawals">提现审核 {withdrawals?.items.filter((w: any) => w.status === "pending").length ? `(${withdrawals.items.filter((w: any) => w.status === "pending").length})` : ""}</TabsTrigger>
          </TabsList>

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
                {reviewItem?.txHash && <div className="flex justify-between"><span className="text-muted-foreground">TxHash</span><span className="font-mono text-xs">{reviewItem.txHash}</span></div>}
                {reviewItem?.toAddress && <div className="flex justify-between"><span className="text-muted-foreground">收款地址</span><span className="font-mono text-xs">{reviewItem.toAddress}</span></div>}
              </div>
              {reviewType === "withdrawal" && (
                <div className="space-y-2">
                  <Label>手续费率 (%) 留空则使用系统默认</Label>
                  <Input type="number" placeholder="如：1.5" value={feeRate} onChange={(e) => setFeeRate(e.target.value)} className="bg-input border-border" />
                </div>
              )}
              <div className="space-y-2">
                <Label>拒绝原因（拒绝时必填）</Label>
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
