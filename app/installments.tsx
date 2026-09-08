"use client";

import { useState, type FormEvent } from 'react';
import { Plus, WalletCards, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import type { InstallmentSummary } from '../lib/installments';

const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const monthLabel = (month: string) => `${month.slice(5)}/${month.slice(0, 4)}`;

export function Installments({ plans, month, categories, saving, runAction }: {
  plans: InstallmentSummary[];
  month: string;
  categories: { id: number; name: string }[];
  saving: boolean;
  runAction: (payload: Record<string, unknown>, message: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('12');
  const [paid, setPaid] = useState('0');
  const [firstMonth, setFirstMonth] = useState(month);
  const [payment, setPayment] = useState<InstallmentSummary | null>(null);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const outstanding = plans.reduce((sum, plan) => sum + plan.remainingCents, 0);
  const due = plans.reduce((sum, plan) => sum + plan.pendingThroughMonthCents, 0);

  function openNew() {
    setName(''); setAmount(''); setTotal('12'); setPaid('0'); setFirstMonth(month); setOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const normalized = amount.trim().replace(/\./g, '').replace(',', '.');
    const amountCents = Math.round(Number(normalized) * 100);
    if (!/^\d+(\.\d{1,2})?$/.test(normalized) || !Number.isSafeInteger(amountCents) || amountCents <= 0) {
      toast.error('Informe um valor de parcela válido, como 300,00.'); return;
    }
    if (await runAction({ action: 'add-installment', name, amountCents, totalInstallments: Number(total), initialPaid: Number(paid), firstPendingMonth: firstMonth }, 'Parcelamento adicionado.')) setOpen(false);
  }
  function openPayment(plan: InstallmentSummary) {
    setPayment(plan); setCategory(categories[0] ? String(categories[0].id) : '');
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setDate(today.startsWith(month) ? today : `${month}-01`);
  }
  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!payment) return;
    if (await runAction({ action: 'pay-installment', planId: payment.id, installmentNumber: payment.nextNumber, categoryId: Number(category), purchasedAt: date }, 'Parcela paga e registrada nas compras.')) setPayment(null);
  }

  return <>
    <Card className="rounded-[1.75rem] border-[#dfdbcf] bg-[#fffdf8]">
      <CardHeader className="px-5 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-xl"><WalletCards className="size-5" /> Compras parceladas</CardTitle>
        <CardDescription>Acompanhe o que falta pagar. Só parcelas marcadas como pagas entram nos gastos do mês.</CardDescription>
        <CardAction><Button variant="outline" size="sm" onClick={openNew}><Plus /> Adicionar</Button></CardAction>
      </CardHeader>
      <CardContent className="space-y-5 px-5 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#f4f1e9] p-4"><p className="text-sm text-[#69726d]">Total que ainda falta pagar</p><p className="mt-1 text-2xl font-semibold">{money(outstanding)}</p></div>
          <div className="rounded-2xl bg-[#f8ece3] p-4"><p className="text-sm text-[#69726d]">Pendente até {monthLabel(month)}</p><p className="mt-1 text-2xl font-semibold">{money(due)}</p><p className="mt-1 text-sm text-[#69726d]">Inclui parcelas anteriores em aberto; ainda não descontado do saldo livre.</p></div>
        </div>
        {plans.length ? <div className="grid gap-4 md:grid-cols-2">{plans.map(plan => <article key={plan.id} className="min-w-0 space-y-3 rounded-2xl border border-[#dfdbcf] p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><h3 className="break-words font-semibold">{plan.name}</h3><p className="text-sm text-[#69726d]">{plan.paidInstallments} de {plan.totalInstallments} pagas · {money(plan.amountCents)} por parcela</p></div>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="icon-sm" disabled={saving || plan.recordedPayments > 0} aria-label={`Excluir parcelamento ${plan.name}`}><Trash2 /></Button></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir {plan.name}?</AlertDialogTitle><AlertDialogDescription>Este parcelamento será removido do acompanhamento. Nenhum saldo será alterado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={() => void runAction({ action: 'delete-installment', planId: plan.id }, 'Parcelamento removido.')}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          </div>
          <Progress value={plan.paidInstallments / plan.totalInstallments * 100} aria-label={`${plan.paidInstallments} de ${plan.totalInstallments} parcelas pagas`} />
          <p className="text-sm">{plan.remainingInstallments ? `Faltam ${plan.remainingInstallments} parcelas · ${money(plan.remainingCents)}` : 'Quitado! Todas as parcelas foram pagas.'}</p>
          {plan.nextMonth && <p className="text-sm text-[#69726d]">Próxima pendente: parcela {plan.nextNumber} · {monthLabel(plan.nextMonth)}</p>}
          {plan.recordedPayments > 0 && <p className="text-sm text-[#69726d]">Para desfazer um pagamento, remova a compra correspondente. Para excluir o parcelamento, desfaça todos os pagamentos registrados aqui.</p>}
          {plan.nextNumber && <Button className="w-full" variant="outline" disabled={saving || !categories.length || (plan.nextMonth ?? '') > month} onClick={() => openPayment(plan)}>Marcar parcela {plan.nextNumber} como paga</Button>}
          {plan.nextNumber && !categories.length && <p className="text-sm text-[#69726d]">Crie uma categoria neste mês para registrar o pagamento.</p>}
          {plan.nextMonth && plan.nextMonth > month && <p className="text-sm text-[#69726d]">Selecione {monthLabel(plan.nextMonth)} ou um mês posterior para pagar.</p>}
        </article>)}</div> : <p className="py-4 text-center text-[#69726d]">Adicione o celular, um eletrodoméstico ou outra compra que você ainda está pagando.</p>}
      </CardContent>
    </Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto"><form onSubmit={save}>
      <DialogHeader><DialogTitle>Adicionar compra parcelada</DialogTitle><DialogDescription>Informe parcelas de valor fixo. As que já foram pagas servem apenas como histórico inicial e não alteram os gastos.</DialogDescription></DialogHeader>
      <div className="my-5 grid gap-4">
        <div className="space-y-2"><Label htmlFor="installment-name">Nome da compra</Label><Input id="installment-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Ex.: Celular" required autoFocus /></div>
        <div className="space-y-2"><Label htmlFor="installment-amount">Valor de cada parcela (R$)</Label><Input id="installment-amount" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="300,00" required /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="installment-total">Total de parcelas</Label><Input id="installment-total" type="number" min="1" max="600" step="1" value={total} onChange={e => setTotal(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="installment-paid">Já pagas</Label><Input id="installment-paid" type="number" min="0" max={Math.max(Number(total) - 1, 0)} step="1" value={paid} onChange={e => setPaid(e.target.value)} required /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="installment-month">Mês da primeira parcela que falta pagar</Label><Input id="installment-month" type="month" min="1000-01" max="9949-12" value={firstMonth} onChange={e => setFirstMonth(e.target.value)} required /></div>
      </div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Adicionar</Button></DialogFooter>
    </form></DialogContent></Dialog>
    <Dialog open={!!payment} onOpenChange={value => { if (!value) setPayment(null); }}><DialogContent><form onSubmit={pay}>
      <DialogHeader><DialogTitle>Pagar parcela {payment?.nextNumber} de {payment?.totalInstallments}</DialogTitle><DialogDescription>{payment?.name} · {money(payment?.amountCents ?? 0)}. Será criada uma compra no dinheiro livre. Não registre o mesmo pagamento manualmente.</DialogDescription></DialogHeader>
      <div className="my-5 grid gap-4">
        <div className="space-y-2"><Label htmlFor="installment-category">Categoria do gasto</Label><Select value={category} onValueChange={value => value && setCategory(value)}><SelectTrigger id="installment-category" className="w-full"><SelectValue placeholder="Escolha a categoria" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="installment-date">Data do pagamento</Label><Input id="installment-date" type="date" value={date} min={`${month}-01`} max={`${month}-${new Date(Number(month.slice(0,4)), Number(month.slice(5)), 0).getDate()}`} onChange={e => setDate(e.target.value)} required /></div>
      </div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setPayment(null)}>Cancelar</Button><Button type="submit" disabled={saving || !category}>{saving && <Loader2 className="animate-spin" />} Confirmar pagamento</Button></DialogFooter>
    </form></DialogContent></Dialog>
  </>;
}
