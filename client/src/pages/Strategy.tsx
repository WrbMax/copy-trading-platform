import { useState } from "react";
import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Settings, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Strategy() {
  const utils = trpc.useUtils();
  const { data: sources } = trpc.strategy.list.useQuery();
  const { data: myStrategies } = trpc.strategy.myStrategies.useQuery();
  const { data: apis } = trpc.exchange.list.useQuery();
  const [selectedSource, setSelectedSource] = useState<number | null>(null);
  const [selectedApi, setSelectedApi] = useState<string>("");
  const [multiplier, setMultiplier] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const setStrategyMutation = trpc.strategy.setStrategy.useMutation({
    onSuccess: () => {
      toast.success("策略设置已保存");
      utils.strategy.myStrategies.invalidate();
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const activeApis = apis?.filter((a) => a.isActive) ?? [];

  const openDialog = (sourceId: number) => {
    const existing = myStrategies?.find((s) => s.signalSourceId === sourceId);
    setSelectedSource(sourceId);
    setSelectedApi(existing?.exchangeApiId?.toString() || (activeApis[0]?.id?.toString() ?? ""));
    setMultiplier(parseFloat(existing?.multiplier || "1"));
    setDialogOpen(true);
  };

  const handleSave = (isEnabled: boolean) => {
    if (!selectedSource || !selectedApi) { toast.error("请选择交易所API"); return; }
    setStrategyMutation.mutate({ signalSourceId: selectedSource, exchangeApiId: parseInt(selectedApi), multiplier, isEnabled });
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">策略跟单</h1>
          <p className="text-muted-foreground text-sm mt-1">选择策略并设置跟单倍数，系统将自动执行交易</p>
        </div>

        {activeApis.length === 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">请先绑定交易所API</p>
              <p className="text-xs mt-1 opacity-80">开启策略前需要绑定并验证交易所API</p>
              <Button asChild size="sm" variant="outline" className="mt-2 bg-transparent border-destructive/40 text-destructive hover:bg-destructive/10">
                <Link href="/exchange-api"><a>去绑定API</a></Link>
              </Button>
            </div>
          </div>
        )}

        {/* My Active Strategies */}
        {myStrategies && myStrategies.length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-3">我的策略</h2>
            <div className="space-y-3">
              {myStrategies.map((s) => (
                <Card key={s.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/15 rounded-lg flex items-center justify-center text-primary text-xs font-bold">
                          {s.signalSource?.symbol?.slice(0, 3) || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{s.signalSource?.name}</p>
                          <p className="text-xs text-muted-foreground">{s.signalSource?.tradingPair} · {s.exchangeApi?.exchange} · 倍数 {s.multiplier}x</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={s.isEnabled} onCheckedChange={(v) => {
                          setStrategyMutation.mutate({ signalSourceId: s.signalSourceId, exchangeApiId: s.exchangeApiId, multiplier: parseFloat(s.multiplier), isEnabled: v });
                        }} />
                        <Button size="sm" variant="ghost" onClick={() => openDialog(s.signalSourceId)}>
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Strategies */}
        <div>
          <h2 className="text-base font-semibold mb-3">可用策略</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {sources?.map((source) => {
              const myStrategy = myStrategies?.find((s) => s.signalSourceId === source.id);
              return (
                <Card key={source.id} className="bg-card border-border hover:border-primary/40 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center text-primary font-bold">
                          {source.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{source.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{source.tradingPair}</p>
                        </div>
                      </div>
                      {myStrategy?.isEnabled ? (
                        <Badge className="bg-primary/15 text-primary border-0 text-xs">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1 animate-pulse" />运行中
                        </Badge>
                      ) : myStrategy ? (
                        <Badge variant="secondary" className="text-xs">已配置</Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {source.description && <p className="text-sm text-muted-foreground">{source.description}</p>}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground">参考仓位</p>
                        <p className="text-sm font-semibold mt-0.5">{parseFloat(source.referencePosition).toFixed(0)} USDT</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground">预期月化</p>
                        <p className="text-sm font-semibold mt-0.5 text-profit">{source.expectedMonthlyReturnMin}~{source.expectedMonthlyReturnMax}%</p>
                      </div>
                    </div>
                    <Button className="w-full" size="sm" onClick={() => openDialog(source.id)} disabled={activeApis.length === 0}>
                      <Zap className="w-4 h-4 mr-1" />
                      {myStrategy ? "修改设置" : "开启跟单"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Config Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>策略跟单设置</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">选择交易所API</label>
                <Select value={selectedApi} onValueChange={setSelectedApi}>
                  <SelectTrigger className="bg-input border-border"><SelectValue placeholder="选择API" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {activeApis.map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.label || a.exchange} ({a.exchange})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">跟单倍数</label>
                  <span className="text-lg font-bold text-primary">{multiplier}x</span>
                </div>
                <Slider min={0.1} max={10} step={0.1} value={[multiplier]} onValueChange={([v]) => setMultiplier(v)} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.1x（最小）</span><span>10x（最大）</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
                <TrendingUp className="w-4 h-4 inline mr-1 text-primary" />
                倍数越大，实际交易量越大，盈亏也成比例放大。请根据风险承受能力设置。
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => handleSave(false)} disabled={setStrategyMutation.isPending}>
                  保存（暂不启用）
                </Button>
                <Button className="flex-1" onClick={() => handleSave(true)} disabled={setStrategyMutation.isPending}>
                  {setStrategyMutation.isPending ? "保存中..." : "保存并启用"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </UserLayout>
  );
}
