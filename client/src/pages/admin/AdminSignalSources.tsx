import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Zap, Key, Eye, EyeOff, Clock, Shield } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  name: "", symbol: "", tradingPair: "", referencePosition: "",
  expectedMonthlyReturnMin: "", expectedMonthlyReturnMax: "", description: "",
  apiKey: "", apiSecret: "", webhookSecret: "",
};

export default function AdminSignalSources() {
  const utils = trpc.useUtils();
  const { data: sources, isLoading } = trpc.strategy.adminListSources.useQuery();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);

  const { data: signalLogs } = trpc.strategy.adminSignalLogs.useQuery(
    { signalSourceId: selectedSourceId ?? undefined, page: 1, limit: 50 },
    { enabled: selectedSourceId !== null }
  );

  const createMutation = trpc.strategy.adminCreateSource.useMutation({
    onSuccess: () => { toast.success("信号源已创建"); utils.strategy.adminListSources.invalidate(); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = trpc.strategy.adminUpdateSource.useMutation({
    onSuccess: () => { toast.success("信号源已更新"); utils.strategy.adminListSources.invalidate(); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = trpc.strategy.adminUpdateSource.useMutation({
    onSuccess: () => utils.strategy.adminListSources.invalidate(),
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setOpen(false); setEditId(null); setForm(EMPTY_FORM); setShowApiKey(false); setShowApiSecret(false); setShowWebhook(false); };

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setOpen(true); };
  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({
      name: s.name, symbol: s.symbol, tradingPair: s.tradingPair,
      referencePosition: s.referencePosition,
      expectedMonthlyReturnMin: s.expectedMonthlyReturnMin,
      expectedMonthlyReturnMax: s.expectedMonthlyReturnMax,
      description: s.description || "",
      apiKey: "", apiSecret: "", webhookSecret: s.webhookSecret || "",
    });
    setOpen(true);
  };

  const handleSave = () => {
    const base = {
      name: form.name, symbol: form.symbol, tradingPair: form.tradingPair,
      referencePosition: parseFloat(form.referencePosition),
      expectedMonthlyReturnMin: parseFloat(form.expectedMonthlyReturnMin),
      expectedMonthlyReturnMax: parseFloat(form.expectedMonthlyReturnMax),
      description: form.description || undefined,
    };
    const apiFields: Record<string, string | undefined> = {};
    if (form.apiKey) apiFields.apiKey = form.apiKey;
    if (form.apiSecret) apiFields.apiSecret = form.apiSecret;
    if (form.webhookSecret) apiFields.webhookSecret = form.webhookSecret;

    if (editId) {
      updateMutation.mutate({ id: editId, ...base, ...apiFields });
    } else {
      createMutation.mutate({ ...base, ...apiFields });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">信号源管理</h1>
            <p className="text-muted-foreground text-sm mt-1">配置策略信号源，管理交易标的、API密钥和预期收益</p>
          </div>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />新建信号源</Button>
        </div>

        <Tabs defaultValue="sources">
          <TabsList>
            <TabsTrigger value="sources">信号源列表</TabsTrigger>
            <TabsTrigger value="logs">信号日志</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !sources?.length ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Zap className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">暂无信号源，点击右上角创建</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sources.map((s: any) => (
                  <Card key={s.id} className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center text-primary font-bold text-sm">
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

                      {/* API Key Status */}
                      <div className="p-2 rounded bg-secondary/30 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Key className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">API Key:</span>
                          <span className="font-mono text-xs">{s.apiKeyMasked || "未配置"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Shield className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">API Secret:</span>
                          <span className="font-mono text-xs">{s.apiSecretMasked || "未配置"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Shield className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">接入密码:</span>
                          <span className="font-mono text-xs">{s.webhookSecret ? "已设置" : "未配置"}</span>
                        </div>
                      </div>

                      {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                      <div className="flex items-center justify-between">
                        <Badge variant={s.isActive ? "default" : "secondary"} className="text-xs">
                          {s.isActive ? <><span className="w-1.5 h-1.5 bg-current rounded-full mr-1 animate-pulse" />运行中</> : "已停用"}
                        </Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedSourceId(s.id)}>
                            <Clock className="w-4 h-4 mr-1" />日志
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                            <Edit className="w-4 h-4 mr-1" />编辑
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">信号触发记录</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant={selectedSourceId === null ? "default" : "outline"} onClick={() => setSelectedSourceId(null)}>全部</Button>
                    {sources?.map((s: any) => (
                      <Button key={s.id} size="sm" variant={selectedSourceId === s.id ? "default" : "outline"} onClick={() => setSelectedSourceId(s.id)}>
                        {s.symbol}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!signalLogs?.items?.length ? (
                  <p className="text-center text-muted-foreground py-8">暂无信号日志</p>
                ) : (
                  <div className="space-y-2">
                    {signalLogs.items.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 text-sm">
                        <div className="flex items-center gap-3">
                          <Badge variant={log.status === "completed" ? "default" : log.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                            {log.status}
                          </Badge>
                          <span className="font-mono">{log.action}</span>
                          <span className="text-muted-foreground">{log.symbol}</span>
                          <span>数量: {log.quantity}</span>
                          {log.price && <span>价格: {log.price}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "编辑信号源" : "新建信号源"}</DialogTitle></DialogHeader>

            {/* Basic Info */}
            <div className="space-y-4 mt-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">基本信息</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "name", label: "策略名称", placeholder: "如：以太坊指标策略" },
                  { key: "symbol", label: "交易标的代码", placeholder: "如：ETH" },
                  { key: "tradingPair", label: "交易对", placeholder: "如：ETHUSDT" },
                  { key: "referencePosition", label: "参考仓位 (USDT)", placeholder: "如：1500" },
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

              <Separator />

              {/* API Credentials */}
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">信号源 API 配置</p>
              {editId && (
                <p className="text-xs text-yellow-500">编辑模式下，留空表示不修改原有密钥</p>
              )}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">API Key</Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder={editId ? "留空不修改" : "输入 API Key"}
                      value={form.apiKey}
                      onChange={(e) => setForm(f => ({ ...f, apiKey: e.target.value }))}
                      className="bg-input border-border text-sm pr-10 font-mono"
                    />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">API Secret</Label>
                  <div className="relative">
                    <Input
                      type={showApiSecret ? "text" : "password"}
                      placeholder={editId ? "留空不修改" : "输入 API Secret"}
                      value={form.apiSecret}
                      onChange={(e) => setForm(f => ({ ...f, apiSecret: e.target.value }))}
                      className="bg-input border-border text-sm pr-10 font-mono"
                    />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowApiSecret(!showApiSecret)}>
                      {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">接入密码 (Webhook Secret)</Label>
                  <div className="relative">
                    <Input
                      type={showWebhook ? "text" : "password"}
                      placeholder={editId ? "留空不修改" : "输入接入密码"}
                      value={form.webhookSecret}
                      onChange={(e) => setForm(f => ({ ...f, webhookSecret: e.target.value }))}
                      className="bg-input border-border text-sm pr-10 font-mono"
                    />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowWebhook(!showWebhook)}>
                      {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
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
