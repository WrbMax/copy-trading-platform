import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [editRatio, setEditRatio] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editNote, setEditNote] = useState("");

  const { data } = trpc.user.adminList.useQuery({ page, limit: 20 });
  const allItems = data?.items ?? [];
  const items = search ? allItems.filter((u: any) => (u.name || "").includes(search) || (u.email || "").includes(search)) : allItems;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const updateRatioMutation = trpc.user.adminSetRevenueShareRatio.useMutation({
    onSuccess: () => { toast.success("收益分成比例已更新"); utils.user.adminList.invalidate(); setEditUser(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (u: any) => {
    setEditUser(u);
    setEditRatio(u.revenueShareRatio || "0");
    setEditBalance("");
    setEditNote("");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">用户管理</h1>
            <p className="text-muted-foreground text-sm mt-1">管理平台所有用户，设置收益分成比例</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索用户名或邮箱..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-input border-border" />
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["ID", "用户名", "邮箱", "角色", "余额", "积分", "分成比例", "邀请人", "注册时间", "操作"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((u: any) => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="px-4 py-3 text-muted-foreground">#{u.id}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{u.name || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">{parseFloat(u.balance || "0").toFixed(2)}</td>
                      <td className="px-4 py-3 text-foreground">{u.points ?? 0}</td>
                      <td className="px-4 py-3 text-foreground">{parseFloat(u.revenueShareRatio || "0").toFixed(1)}%</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.invitedById ? `#${u.invitedById}` : "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                          <Settings className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && <p className="text-center py-12 text-muted-foreground">暂无用户数据</p>}
            </div>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}

        <Dialog open={!!editUser} onOpenChange={(v) => !v && setEditUser(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>编辑用户 #{editUser?.id} - {editUser?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>收益分成比例 (%)</Label>
                <Input type="number" step="0.1" min="0" max="100" value={editRatio} onChange={(e) => setEditRatio(e.target.value)} className="bg-input border-border" />
                <p className="text-xs text-muted-foreground">设置该用户盈利时被扣除的分成比例</p>
              </div>
              <div className="space-y-2">
                <Label>调整余额 (USDT，正数增加，负数减少)</Label>
                <Input type="number" placeholder="0" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label>操作备注</Label>
                <Input placeholder="备注原因" value={editNote} onChange={(e) => setEditNote(e.target.value)} className="bg-input border-border" />
              </div>
              <Button className="w-full" onClick={() => updateRatioMutation.mutate({ userId: editUser.id, ratio: parseFloat(editRatio) })} disabled={updateRatioMutation.isPending}>
                {updateRatioMutation.isPending ? "保存中..." : "保存修改"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
