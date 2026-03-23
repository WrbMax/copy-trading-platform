import { useState } from "react";
import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, TestTube, Shield, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function ExchangeApi() {
  const utils = trpc.useUtils();
  const { data: apis, isLoading } = trpc.exchange.list.useQuery();
  const [open, setOpen] = useState(false);
  const [exchange, setExchange] = useState<"binance" | "okx">("binance");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");

  const bindMutation = trpc.exchange.bind.useMutation({
    onSuccess: () => {
      toast.success("API绑定成功");
      utils.exchange.list.invalidate();
      setOpen(false);
      setApiKey(""); setSecretKey(""); setPassphrase(""); setLabel("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.exchange.delete.useMutation({
    onSuccess: () => { toast.success("已删除"); utils.exchange.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const testMutation = trpc.exchange.test.useMutation({
    onSuccess: (r) => { toast[r.success ? "success" : "error"](r.message); utils.exchange.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = trpc.exchange.toggle.useMutation({
    onSuccess: () => utils.exchange.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  return (
    <UserLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">API绑定管理</h1>
            <p className="text-muted-foreground text-sm mt-1">绑定交易所API，密钥加密存储，不明文展示</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2"><Plus className="w-4 h-4" />绑定新API</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>绑定交易所API</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-2 text-sm text-primary">
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>API密钥使用AES-256-GCM加密存储，仅用于执行跟单交易，建议开启仅交易权限，禁止提现权限。</span>
                </div>
                <div className="space-y-2">
                  <Label>交易所</Label>
                  <Select value={exchange} onValueChange={(v) => setExchange(v as any)}>
                    <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="binance">币安 (Binance)</SelectItem>
                      <SelectItem value="okx">OKX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>备注名称（可选）</Label>
                  <Input placeholder="如：我的主账户" value={label} onChange={(e) => setLabel(e.target.value)} className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input placeholder="请输入API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <Input type="password" placeholder="请输入Secret Key" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="bg-input border-border" />
                </div>
                {exchange === "okx" && (
                  <div className="space-y-2">
                    <Label>Passphrase（OKX必填）</Label>
                    <Input type="password" placeholder="请输入Passphrase" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="bg-input border-border" />
                  </div>
                )}
                <Button className="w-full" onClick={() => bindMutation.mutate({ exchange, label, apiKey, secretKey, passphrase: passphrase || undefined })} disabled={bindMutation.isPending || !apiKey || !secretKey}>
                  {bindMutation.isPending ? "绑定中..." : "确认绑定"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : !apis?.length ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">暂无绑定的交易所API</p>
              <p className="text-sm text-muted-foreground mt-1">绑定API后即可开启策略跟单</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {apis.map((api) => (
              <Card key={api.id} className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                        {api.exchange === "binance" ? "BN" : "OKX"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{api.label || (api.exchange === "binance" ? "币安" : "OKX")}</p>
                          <Badge variant="outline" className="text-xs">{api.exchange}</Badge>
                          {api.isVerified ? (
                            <Badge className="text-xs bg-profit text-foreground border-0"><CheckCircle className="w-3 h-3 mr-1" />已验证</Badge>
                          ) : api.testStatus === "failed" ? (
                            <Badge variant="destructive" className="text-xs"><AlertCircle className="w-3 h-3 mr-1" />验证失败</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />未验证</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">API Key: {api.apiKeyEncrypted}</p>
                        {api.testMessage && <p className="text-xs text-muted-foreground mt-0.5">{api.testMessage}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={api.isActive} onCheckedChange={(v) => toggleMutation.mutate({ id: api.id, isActive: v })} />
                      <Button size="sm" variant="outline" className="bg-transparent text-xs" onClick={() => testMutation.mutate({ id: api.id })} disabled={testMutation.isPending}>
                        <TestTube className="w-3.5 h-3.5 mr-1" />测试
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("确认删除此API？")) deleteMutation.mutate({ id: api.id }); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />安全说明</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• API密钥使用AES-256-GCM算法加密存储，密钥不会明文展示</li>
              <li>• 建议为跟单专用创建子账户API，仅开启合约交易权限</li>
              <li>• 严禁开启提现权限，平台不会主动发起提现操作</li>
              <li>• 如发现异常，请立即在交易所删除对应API密钥</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
