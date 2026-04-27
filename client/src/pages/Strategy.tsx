import { useState } from "react";
import UserLayout from "@/components/UserLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Zap, Settings, AlertCircle, AlertTriangle, Crown, Star, Lock, Info
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const QUICK_MULTIPLIERS = [1, 2, 5, 10, 20, 50, 100];

export default function Strategy() {
  const utils = trpc.useUtils();
  // 获取所有信号源（含 tier 字段和 canUse 权限字段）
  const { data: availableSources } = trpc.strategy.listForUser.useQuery();
  const { data: myStrategies } = trpc.strategy.myStrategies.useQuery();
  const { data: subStatus } = trpc.subscription.myStatus.useQuery();
  const { data: apis } = trpc.exchange.list.useQuery();

  const [selectedSource, setSelectedSource] = useState<number | null>(null);
  const [selectedApi, setSelectedApi] = useState<string>("");
  const [multiplier, setMultiplier] = useState(1);
  const [multiplierInput, setMultiplierInput] = useState("1");
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
  const activeTier = subStatus?.activeTier ?? null;
  const basicActive = subStatus?.basicActive ?? false;
  const advancedActive = subStatus?.advancedActive ?? false;

  // 所有信号源按档次分组
  const sources = availableSources ?? [];
  const basicSources = sources.filter((s: any) => s.tier === "basic" || !s.tier);
  const advancedSources = sources.filter((s: any) => s.tier === "advanced");

  // 判断某个信号源是否可运行（使用后端返回的 canUse 字段）
  const canRunSource = (source: any) => {
    return source.canUse === true;
  };

  const openDialog = (sourceId: number) => {
    const existing = myStrategies?.find((s) => s.signalSourceId === sourceId);
    setSelectedSource(sourceId);
    const existingApiStillValid = existing?.exchangeApi && activeApis.some(a => a.id === existing.exchangeApiId);
    setSelectedApi(existingApiStillValid ? existing.exchangeApiId.toString() : (activeApis[0]?.id?.toString() ?? ""));
    const m = parseFloat(existing?.multiplier || "1");
    setMultiplier(m);
    setMultiplierInput(m.toString());
    setDialogOpen(true);
  };

  const handleMultiplierChange = (val: number) => {
    const clamped = Math.max(1, Math.min(100, Math.round(val)));
    setMultiplier(clamped);
    setMultiplierInput(clamped.toString());
  };

  const handleMultiplierInput = (val: string) => {
    setMultiplierInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 100) setMultiplier(num);
  };

  const handleSave = (isEnabled: boolean) => {
    if (!selectedApi) { toast.error("请先绑定并选择交易所API"); return; }
    if (!selectedSource) { toast.error("请选择策略"); return; }
    if (multiplier < 1 || multiplier > 100) { toast.error("数量倍数范围为 1-100"); return; }
    setStrategyMutation.mutate({ signalSourceId: selectedSource, exchangeApiId: parseInt(selectedApi), multiplier, isEnabled });
  };

  const selectedSourceInfo = sources?.find((s: any) => s.id === selectedSource);

  // 当前激活档次标签
  const ActiveTierBadge = () => {
    if (!activeTier) return null;
    if (activeTier === "advanced") {
      return (
        <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs gap-1">
          <Crown className="w-3 h-3" />进阶档激活中
        </Badge>
      );
    }
    return (
      <Badge className="bg-primary/15 text-primary border-primary/30 text-xs gap-1">
        <Star className="w-3 h-3" />基础档激活中
      </Badge>
    );
  };

  // 渲染单个信号源卡片
  const SourceCard = ({ source }: { source: any }) => {
    const myStrategy = myStrategies?.find((s) => s.signalSourceId === source.id);
    const apiMissing = myStrategy && !myStrategy.exchangeApi;
    const canRun = canRunSource(source);
    const isLocked = !canRun;

    return (
      <Card
        key={source.id}
        className={`bg-card border-border transition-colors ${
          isLocked ? "opacity-60" : "hover:border-primary/40"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                isLocked ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
              }`}>
                {isLocked ? <Lock className="w-4 h-4" /> : source.symbol.slice(0, 3)}
              </div>
              <div>
                <CardTitle className="text-base">{source.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{source.tradingPair}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {apiMissing ? (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />API失效
                </Badge>
              ) : myStrategy?.isEnabled ? (
                <Badge className="bg-primary/15 text-primary border-0 text-xs">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1 animate-pulse" />运行中
                </Badge>
              ) : myStrategy ? (
                <Badge variant="secondary" className="text-xs">已配置</Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {source.description && (
            <p className="text-sm text-muted-foreground">{source.description}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">参考仓位</p>
              <p className="text-sm font-semibold mt-0.5">
                {parseFloat(source.referencePosition).toFixed(0)} USDT
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">预期月化</p>
              <p className="text-sm font-semibold mt-0.5 text-profit">
                {source.expectedMonthlyReturnMin}~{source.expectedMonthlyReturnMax}%
              </p>
            </div>
          </div>

          {isLocked ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              {!activeTier
                ? "请先订阅后使用此策略"
                : source.tier === "advanced"
                  ? "需激活进阶档才能使用此策略"
                  : "请在订阅中心切换至对应档次"}
            </div>
          ) : (
            <Button className="w-full" size="sm" onClick={() => openDialog(source.id)}>
              <Zap className="w-4 h-4 mr-1" />
              {apiMissing ? "重新配置" : myStrategy ? "修改设置" : "开启策略"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">策略中心</h1>
            <p className="text-muted-foreground text-sm mt-1">
              选择策略并设置开仓数量倍数，系统将自动执行交易
            </p>
          </div>
          <ActiveTierBadge />
        </div>

        {/* 未订阅提示 */}
        {!activeTier && (
          <Card className="border-dashed border-primary/30 bg-primary/3">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">您尚未激活任何订阅档次</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    订阅并激活基础档或进阶档后，才能开启策略跟单
                  </p>
                </div>
                <Button asChild size="sm" className="flex-shrink-0">
                  <Link href="/subscription">前往订阅</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 档次说明 */}
        {activeTier && (
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-3.5">
              <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  {activeTier === "advanced"
                    ? "当前激活进阶档，可使用进阶档和基础档的全部策略。"
                    : "当前激活基础档，只能使用基础档策略。如需使用进阶档策略，请在订阅中心切换至进阶档。"}
                  {" "}
                  <Link href="/subscription" className="text-primary underline-offset-2 hover:underline">
                    管理订阅
                  </Link>
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 我的策略 */}
        {myStrategies && myStrategies.length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-3">我的策略</h2>
            <div className="space-y-3">
              {myStrategies.map((s: any) => {
                const apiMissing = !s.exchangeApi;
        const sourceTier = s.signalSource?.tier ?? "basic";
        const canRun = activeTier === "advanced" ? true : (activeTier === "basic" && sourceTier === "basic");
                return (
                  <Card
                    key={s.id}
                    className={`bg-card border-border ${apiMissing ? "border-destructive/40" : ""} ${!canRun ? "opacity-60" : ""}`}
                  >
                    <CardContent className="p-4">
                      {apiMissing && (
                        <div className="flex items-start gap-2 p-2.5 mb-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium">API已失效，策略已停止运行</p>
                            <p className="text-xs mt-0.5 opacity-80">请重新绑定API并在下方重新配置策略</p>
                          </div>
                        </div>
                      )}
                      {!canRun && !apiMissing && (
                        <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600">
                          <Lock className="w-4 h-4 flex-shrink-0" />
                          <p className="text-xs">
                            {sourceTier === "advanced"
                              ? "当前未激活进阶档，此策略已暂停"
                              : "当前档次不匹配，此策略已暂停"}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                            apiMissing ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                          }`}>
                            {s.signalSource?.symbol?.slice(0, 3) || "?"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm">{s.signalSource?.name}</p>
                              {sourceTier === "advanced" ? (
                                <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0 h-4">
                                  进阶
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-[10px] px-1.5 py-0 h-4">
                                  基础
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {s.signalSource?.tradingPair} ·{" "}
                              {apiMissing ? (
                                <span className="text-destructive">API已删除</span>
                              ) : (
                                s.exchangeApi?.exchange
                              )}{" "}
                              · 数量 {s.multiplier}x
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {!apiMissing && canRun && (
                            <Switch
                              checked={s.isEnabled}
                              onCheckedChange={(v) => {
                                setStrategyMutation.mutate({
                                  signalSourceId: s.signalSourceId,
                                  exchangeApiId: s.exchangeApiId,
                                  multiplier: parseFloat(s.multiplier),
                                  isEnabled: v,
                                });
                              }}
                            />
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openDialog(s.signalSourceId)}>
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* 基础档信号源 */}
        {basicSources.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <h2 className="text-base font-semibold">基础档策略</h2>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                基础档 / 进阶档均可使用
              </Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {basicSources.map((source: any) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>
          </div>
        )}

        {/* 进阶档信号源 */}
        {advancedSources.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <h2 className="text-base font-semibold">进阶档策略</h2>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                仅进阶档可使用
              </Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {advancedSources.map((source: any) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>
          </div>
        )}

        {/* 无信号源 */}
        {sources.length === 0 && (
          <Card className="bg-card border-border border-dashed">
            <CardContent className="py-10 text-center">
              <Zap className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">暂无可用信号源，请联系管理员配置</p>
            </CardContent>
          </Card>
        )}

        {/* Config Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedSourceInfo && (
                  <span className="w-7 h-7 bg-primary/15 rounded-lg flex items-center justify-center text-primary text-xs font-bold">
                    {(selectedSourceInfo as any).symbol.slice(0, 3)}
                  </span>
                )}
                策略设置 — {(selectedSourceInfo as any)?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              {activeApis.length === 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">请先绑定交易所API</p>
                    <p className="text-xs mt-1 opacity-80">您可以先预设倍数，绑定API后即可启用策略</p>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="mt-2 bg-transparent border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <Link href="/exchange-api">去绑定API</Link>
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">选择交易所API</label>
                {activeApis.length > 0 ? (
                  <Select value={selectedApi} onValueChange={setSelectedApi}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="选择API" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {activeApis.map((a) => (
                        <SelectItem key={a.id} value={a.id.toString()}>
                          {a.label || a.exchange} ({a.exchange})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
                    暂无可用API，请先前往 API绑定 页面添加
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">开仓数量倍数</label>
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-20 h-8 text-center bg-input border-border text-sm"
                      value={multiplierInput}
                      onChange={(e) => handleMultiplierInput(e.target.value)}
                      onBlur={() => {
                        const n = parseInt(multiplierInput);
                        if (isNaN(n) || n < 1) { setMultiplierInput("1"); setMultiplier(1); }
                        else if (n > 100) { setMultiplierInput("100"); setMultiplier(100); }
                      }}
                    />
                    <span className="text-sm text-muted-foreground">x</span>
                  </div>
                </div>
                <Slider
                  min={1} max={100} step={1}
                  value={[multiplier]}
                  onValueChange={([v]) => handleMultiplierChange(v)}
                  className="w-full"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {QUICK_MULTIPLIERS.map((m) => (
                    <button
                      key={m}
                      onClick={() => handleMultiplierChange(m)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        multiplier === m
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {m}x
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  参考仓位 {parseFloat((selectedSourceInfo as any)?.referencePosition || "0").toFixed(0)} USDT × {multiplier}x ={" "}
                  <span className="text-foreground font-medium">
                    {(parseFloat((selectedSourceInfo as any)?.referencePosition || "0") * multiplier).toFixed(0)} USDT
                  </span>
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-border"
                  onClick={() => handleSave(false)}
                  disabled={setStrategyMutation.isPending}
                >
                  仅保存
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleSave(true)}
                  disabled={setStrategyMutation.isPending || activeApis.length === 0}
                >
                  <Zap className="w-4 h-4 mr-1" />保存并启用
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </UserLayout>
  );
}
