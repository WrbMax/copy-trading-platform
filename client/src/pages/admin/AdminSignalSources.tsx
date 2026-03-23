import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Zap } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = { name: "", symbol: "", tradingPair: "", referencePosition: "", expectedMonthlyReturnMin: "", expectedMonthlyReturnMax: "", description: "" };

export default function AdminSignalSources() {
  const utils = trpc.useUtils();
  const { data: sources } = trpc.strategy.adminListSources.useQuery();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const createMutation = trpc.strategy.adminCreateSource.useMutation({
    onSuccess: () => { toast.success("信号源已创建"); utils.strategy.adminListSources.invalidate(); setOpen(false); setForm(EMPTY_FORM); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = trpc.strategy.adminUpdateSource.useMutation({
    onSuccess: () => { toast.success("信号源已更新"); utils.strategy.adminListSources.invalidate(); setOpen(false); setEditId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = trpc.strategy.adminUpdateSource.useMutation({
    onSuccess: () => utils.strategy.adminListSources.invalidate(),
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setOpen(true); };
  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({ name: s.name, symbol: s.symbol, tradingPair: s.tradingPair, referencePosition: s.referencePosition, expectedMonthlyReturnMin: s.expectedMonthlyReturnMin, expectedMonthlyReturnMax: s.expectedMonthlyReturnMax, description: s.description || "" });
    setOpen(true);
  };

  const handleSave = () => {
    const payload = { name: form.name, symbol: form.symbol, tradingPair: form.tradingPair, referencePosition: parseFloat(form.referencePosition), expectedMonthlyReturnMin: parseFloat(form.expectedMonthlyReturnMin), expectedMonthlyReturnMax: parseFloat(form.expectedMonthlyReturnMax), description: form.description };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">信号源管理</h1>
            <p className="text-muted-foreground text-sm mt-1">配置策略信号源，管理交易标的和预期收益</p>
          </div>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />新建信号源</Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources?.map((s) => (
            <Card key={s.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center text-primary font-bold">
                      {s.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{s.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{s.tradingPair}</p>
                    </div>
                  </div>
                  <Switch checked={s.isActive} onCheckedChange={(v) => toggleMutation.mutate({ id: s.id, isActive: v })} />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded bg-secondary/50">
                    <p className="text-xs text-muted-foreground">参考仓位</p>
                    <p className="font-semibold">{parseFloat(s.referencePosition).toFixed(0)} USDT</p>
                  </div>
                  <div className="p-2 rounded bg-secondary/50">
                    <p className="text-xs text-muted-foreground">预期月化</p>
                    <p className="font-semibold text-profit">{s.expectedMonthlyReturnMin}~{s.expectedMonthlyReturnMax}%</p>
                  </div>
                </div>
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                <div className="flex items-center justify-between">
                  <Badge variant={s.isActive ? "default" : "secondary"} className="text-xs">
                    {s.isActive ? <><span className="w-1.5 h-1.5 bg-current rounded-full mr-1 animate-pulse" />运行中</> : "已停用"}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                    <Edit className="w-4 h-4 mr-1" />编辑
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(EMPTY_FORM); } }}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "编辑信号源" : "新建信号源"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {[
                { key: "name", label: "策略名称", placeholder: "如：以太坊指标策略" },
                { key: "symbol", label: "交易标的代码", placeholder: "如：ETH" },
                { key: "tradingPair", label: "交易对", placeholder: "如：ETHUSDT" },
                { key: "referencePosition", label: "参考仓位 (USDT)", placeholder: "如：1000" },
                { key: "expectedMonthlyReturnMin", label: "预期月化下限 (%)", placeholder: "如：5" },
                { key: "expectedMonthlyReturnMax", label: "预期月化上限 (%)", placeholder: "如：15" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input placeholder={placeholder} value={(form as any)[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))} className="bg-input border-border text-sm" />
                </div>
              ))}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">策略描述（可选）</Label>
                <Input placeholder="简短描述策略逻辑" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="bg-input border-border text-sm" />
              </div>
            </div>
            <Button className="w-full mt-4" onClick={handleSave} disabled={isPending}>
              {isPending ? "保存中..." : editId ? "保存修改" : "创建信号源"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
