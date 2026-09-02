"use client";

import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  Loader2,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  ShoppingBag,
  Tags,
  Target,
  Trash2,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";

type Category = {
  id: number;
  name: string;
  budgetCents: number;
  color: string;
  spentCents: number;
  purchaseCount: number;
  remainingCents: number;
};

type Purchase = {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  description: string;
  amountCents: number;
  purchasedAt: string;
};

type Goal = {
  id: number;
  name: string;
  targetCents: number;
  initialSavedCents: number;
  dueDate: string | null;
  contributionCents: number;
  savedThisMonthCents: number;
  contributionCount: number;
  savedCents: number;
  remainingCents: number;
  color: string;
};

type BudgetData = {
  month: string;
  incomeCents: number;
  totalBudgetCents: number;
  totalSpentCents: number;
  balanceCents: number;
  unallocatedCents: number;
  totalSavedCents: number;
  savedThisMonthCents: number;
  categories: Category[];
  purchases: Purchase[];
  goals: Goal[];
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function defaultDate(month: string) {
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return todayValue.startsWith(month) ? todayValue : `${month}-01`;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatMoneyInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function moneyToCents(value: string) {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : null;
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default function Home() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [incomeOpen, setIncomeOpen] = useState(false);
  const [incomeValue, setIncomeValue] = useState("");

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryBudget, setCategoryBudget] = useState("");

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseDescription, setPurchaseDescription] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseCategoryId, setPurchaseCategoryId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => defaultDate(currentMonth()));

  const [goalOpen, setGoalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalInitialSaved, setGoalInitialSaved] = useState("");
  const [goalDueDate, setGoalDueDate] = useState("");

  const [contributionOpen, setContributionOpen] = useState(false);
  const [contributionGoalId, setContributionGoalId] = useState<number | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionDate, setContributionDate] = useState(() =>
    defaultDate(currentMonth())
  );

  const loadBudget = useCallback(async (selectedMonth: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/budget?month=${selectedMonth}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as BudgetData & { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Não foi possível carregar seus dados.");
      }
      setData(body);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar seus dados."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadBudget(month), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBudget, month]);

  const runAction = async (
    payload: Record<string, unknown>,
    successMessage: string
  ) => {
    setSaving(true);
    try {
      const response = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, month }),
      });
      const body = (await response.json()) as BudgetData & { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível salvar.");
      setData(body);
      toast.success(successMessage);
      return true;
    } catch (actionError) {
      toast.error(
        actionError instanceof Error ? actionError.message : "Não foi possível salvar."
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const categoryMap = useMemo(
    () =>
      new Map(data?.categories.map((category) => [category.id, category]) ?? []),
    [data?.categories]
  );

  const openIncomeDialog = () => {
    setIncomeValue(formatMoneyInput(data?.incomeCents ?? 0));
    setIncomeOpen(true);
  };

  const changeMonth = (selectedMonth: string) => {
    setMonth(selectedMonth);
    setPurchaseDate(defaultDate(selectedMonth));
    setContributionDate(defaultDate(selectedMonth));
  };

  const openCategoryDialog = (category?: Category) => {
    setEditingCategoryId(category?.id ?? null);
    setCategoryName(category?.name ?? "");
    setCategoryBudget(category ? formatMoneyInput(category.budgetCents) : "");
    setCategoryOpen(true);
  };

  const openPurchaseDialog = (categoryId?: number) => {
    setPurchaseDescription("");
    setPurchaseAmount("");
    setPurchaseCategoryId(
      categoryId
        ? String(categoryId)
        : data?.categories[0]
          ? String(data.categories[0].id)
          : ""
    );
    setPurchaseDate(defaultDate(month));
    setPurchaseOpen(true);
  };

  const openGoalDialog = (goal?: Goal) => {
    setEditingGoalId(goal?.id ?? null);
    setGoalName(goal?.name ?? "");
    setGoalTarget(goal ? formatMoneyInput(goal.targetCents) : "");
    setGoalInitialSaved(goal ? formatMoneyInput(goal.initialSavedCents) : "");
    setGoalDueDate(goal?.dueDate ?? "");
    setGoalOpen(true);
  };

  const openContributionDialog = (goalId: number) => {
    setContributionGoalId(goalId);
    setContributionAmount("");
    setContributionDate(defaultDate(month));
    setContributionOpen(true);
  };

  const saveIncome = async (event: FormEvent) => {
    event.preventDefault();
    const incomeCents = moneyToCents(incomeValue);
    if (incomeCents === null) {
      toast.error("Digite uma renda válida.");
      return;
    }
    if (await runAction({ action: "set-income", incomeCents }, "Renda atualizada.")) {
      setIncomeOpen(false);
    }
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    const budgetCents = moneyToCents(categoryBudget);
    if (!categoryName.trim() || budgetCents === null) {
      toast.error("Preencha o nome e o limite da categoria.");
      return;
    }
    const saved = await runAction(
      {
        action: "save-category",
        categoryId: editingCategoryId ?? undefined,
        name: categoryName,
        budgetCents,
      },
      editingCategoryId ? "Categoria atualizada." : "Categoria adicionada."
    );
    if (saved) setCategoryOpen(false);
  };

  const savePurchase = async (event: FormEvent) => {
    event.preventDefault();
    const amountCents = moneyToCents(purchaseAmount);
    if (!purchaseDescription.trim() || !purchaseCategoryId || !amountCents) {
      toast.error("Preencha a compra, o valor e a categoria.");
      return;
    }
    const saved = await runAction(
      {
        action: "add-purchase",
        description: purchaseDescription,
        amountCents,
        categoryId: Number(purchaseCategoryId),
        purchasedAt: purchaseDate,
      },
      "Compra registrada."
    );
    if (saved) setPurchaseOpen(false);
  };

  const deletePurchase = async (purchaseId: number) => {
    await runAction({ action: "delete-purchase", purchaseId }, "Compra removida.");
  };

  const deleteCategory = async (categoryId: number) => {
    await runAction(
      { action: "delete-category", categoryId },
      "Categoria removida."
    );
  };

  const saveGoal = async (event: FormEvent) => {
    event.preventDefault();
    const targetCents = moneyToCents(goalTarget);
    const initialSavedCents = moneyToCents(goalInitialSaved);
    if (!goalName.trim() || !targetCents || initialSavedCents === null) {
      toast.error("Preencha o nome, a meta e o valor já guardado.");
      return;
    }
    const saved = await runAction(
      {
        action: "save-goal",
        goalId: editingGoalId ?? undefined,
        name: goalName,
        targetCents,
        initialSavedCents,
        dueDate: goalDueDate || null,
      },
      editingGoalId ? "Objetivo atualizado." : "Objetivo criado."
    );
    if (saved) setGoalOpen(false);
  };

  const saveContribution = async (event: FormEvent) => {
    event.preventDefault();
    const amountCents = moneyToCents(contributionAmount);
    if (!contributionGoalId || !amountCents) {
      toast.error("Informe quanto deseja guardar.");
      return;
    }
    const saved = await runAction(
      {
        action: "add-goal-contribution",
        goalId: contributionGoalId,
        amountCents,
        contributedAt: contributionDate,
      },
      "Dinheiro separado para o objetivo."
    );
    if (saved) setContributionOpen(false);
  };

  const deleteGoal = async (goalId: number) => {
    await runAction({ action: "delete-goal", goalId }, "Objetivo removido.");
  };

  return (
    <main className="min-h-screen bg-[#f4f1e9] text-[#18231f]">
      <Toaster position="top-center" richColors />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <header className="budget-hero relative overflow-hidden rounded-[2rem] bg-[#173d35] p-5 text-white shadow-[0_24px_70px_-38px_rgba(12,43,35,0.8)] sm:p-7 lg:p-9">
          <div className="budget-grid absolute inset-0 opacity-20" aria-hidden="true" />
          <div className="relative z-10 flex flex-col gap-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[#d8ef74] text-[#173d35]">
                  <WalletCards className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c9ddd7]">
                    Meu orçamento
                  </p>
                  <p className="text-sm text-white/60">Finanças do mês, sem confusão.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur-sm">
                <CalendarDays className="ml-2 size-4 text-[#d8ef74]" />
                <Input
                  type="month"
                  value={month}
                  onChange={(event) => changeMonth(event.target.value)}
                  aria-label="Selecionar mês"
                  className="month-input h-9 w-[148px] border-0 bg-transparent px-2 text-sm font-medium text-white shadow-none focus-visible:ring-white/25"
                />
              </div>
            </div>

            <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="mb-2 text-sm font-medium text-[#d8ef74]">
                  {formatMonthLabel(month)}
                </p>
                <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                  Seu dinheiro, sem adivinhação.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#c9ddd7] sm:text-base">
                  Defina quanto entra, distribua por categoria, separe dinheiro para seus objetivos e saiba exatamente quanto ainda pode gastar.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                <Button
                  onClick={() => openPurchaseDialog()}
                  disabled={!data?.categories.length}
                  className="h-11 rounded-xl bg-[#d8ef74] px-4 text-[#173d35] hover:bg-[#e5f69a] sm:px-5"
                >
                  <ShoppingBag /> Registrar compra
                </Button>
                <Button
                  onClick={() => openCategoryDialog()}
                  variant="outline"
                  className="h-11 rounded-xl border-white/20 bg-white/10 px-4 text-white shadow-none hover:bg-white/20 hover:text-white sm:px-5"
                >
                  <Plus /> Categoria
                </Button>
                <Button
                  onClick={openIncomeDialog}
                  variant="ghost"
                  className="col-span-2 h-10 rounded-xl text-[#c9ddd7] hover:bg-white/10 hover:text-white sm:h-11"
                >
                  <Landmark /> Definir renda
                </Button>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <Card className="border-[#d8b8ae] bg-[#fff8f4]">
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <AlertCircle className="size-8 text-[#b44b38]" />
              <div>
                <p className="font-semibold">Não consegui abrir seu orçamento.</p>
                <p className="mt-1 text-sm text-[#6c746f]">{error}</p>
              </div>
              <Button onClick={() => void loadBudget(month)}>Tentar novamente</Button>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <section
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Resumo do mês"
            >
              <SummaryCard
                label="Livre para gastar agora"
                value={formatMoney(data.balanceCents)}
                detail="Depois das compras e do que foi guardado neste mês"
                icon={<CircleDollarSign />}
                tone="green"
              />
              <SummaryCard
                label="Gasto até agora"
                value={formatMoney(data.totalSpentCents)}
                detail={`${data.purchases.length} ${data.purchases.length === 1 ? "compra registrada" : "compras registradas"}`}
                icon={<ReceiptText />}
                tone="orange"
              />
              <SummaryCard
                label="Guardado nos objetivos"
                value={formatMoney(data.totalSavedCents)}
                detail={`${formatMoney(data.savedThisMonthCents)} separados em ${formatMonthLabel(month).toLowerCase()}`}
                icon={<Target />}
                tone="blue"
              />
              <SummaryCard
                label={data.unallocatedCents >= 0 ? "Ainda sem destino" : "Acima da renda"}
                value={formatMoney(Math.abs(data.unallocatedCents))}
                detail={
                  data.unallocatedCents >= 0
                    ? "Você ainda pode distribuir esse valor"
                    : "Reduza os limites das categorias"
                }
                icon={<PiggyBank />}
                tone={data.unallocatedCents >= 0 ? "blue" : "red"}
              />
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
              <Card className="rounded-[1.75rem] border-[#dfdbcf] bg-[#fffdf8] shadow-[0_16px_50px_-42px_rgba(23,61,53,0.8)]">
                <CardHeader className="gap-1 px-5 sm:px-6">
                  <CardTitle className="text-xl tracking-[-0.025em]">Categorias</CardTitle>
                  <CardDescription>
                    Veja quanto já foi usado e quanto ainda está livre.
                  </CardDescription>
                  <CardAction>
                    <Button variant="outline" size="sm" onClick={() => openCategoryDialog()}>
                      <Plus /> Nova
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {data.categories.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {data.categories.map((category) => {
                        const percentage = category.budgetCents
                          ? Math.min(
                              100,
                              Math.round(
                                (category.spentCents / category.budgetCents) * 100
                              )
                            )
                          : category.spentCents
                            ? 100
                            : 0;
                        const overBudget = category.remainingCents < 0;
                        return (
                          <article
                            key={category.id}
                            className="group rounded-2xl border border-[#e5e0d5] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#c9c4b7] hover:shadow-lg hover:shadow-[#173d35]/5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <span
                                  className="size-3 shrink-0 rounded-full shadow-[0_0_0_5px_currentColor] opacity-80"
                                  style={{ color: category.color }}
                                  aria-hidden="true"
                                />
                                <div className="min-w-0">
                                  <h3 className="truncate font-semibold">{category.name}</h3>
                                  <p className="mt-0.5 text-xs text-[#768079]">
                                    {category.purchaseCount}{" "}
                                    {category.purchaseCount === 1 ? "compra" : "compras"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center text-[#6f7772] opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openCategoryDialog(category)}
                                  aria-label={`Editar categoria ${category.name}`}
                                >
                                  <Pencil />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`Remover categoria ${category.name}`}
                                    >
                                      <Trash2 />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent size="sm">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Remover a categoria {category.name}?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {category.purchaseCount > 0
                                          ? `${category.purchaseCount} ${category.purchaseCount === 1 ? "compra registrada será apagada" : "compras registradas serão apagadas"} junto com a categoria. O saldo do mês será recalculado.`
                                          : "A categoria será apagada deste mês. Seus objetivos e as outras categorias não serão alterados."}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        variant="destructive"
                                        onClick={() => void deleteCategory(category.id)}
                                      >
                                        Remover categoria
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            <div className="mt-5 flex items-end justify-between gap-3">
                              <div>
                                <p
                                  className={`text-lg font-semibold tracking-tight ${
                                    overBudget ? "text-[#b64136]" : "text-[#173d35]"
                                  }`}
                                >
                                  {formatMoney(Math.abs(category.remainingCents))}
                                </p>
                                <p className="text-xs text-[#768079]">
                                  {overBudget ? "acima do limite" : "ainda disponível"}
                                </p>
                              </div>
                              <p className="text-right text-xs leading-5 text-[#768079]">
                                {formatMoney(category.spentCents)} usados
                                <br />de {formatMoney(category.budgetCents)}
                              </p>
                            </div>
                            <Progress
                              value={percentage}
                              aria-label={`${percentage}% do limite de ${category.name} utilizado`}
                              className="mt-4 h-2 bg-[#ece9df] [&_[data-slot=progress-indicator]]:bg-[var(--category-color)]"
                              style={
                                {
                                  "--category-color": overBudget
                                    ? "#b64136"
                                    : category.color,
                                } as CSSProperties
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-3 w-full justify-center text-[#335f54] hover:bg-[#edf4ef]"
                              onClick={() => openPurchaseDialog(category.id)}
                            >
                              <Plus /> Adicionar compra
                            </Button>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty className="min-h-72 border border-[#ded9cc] bg-[#faf8f2]">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Tags />
                        </EmptyMedia>
                        <EmptyTitle>Crie sua primeira categoria</EmptyTitle>
                        <EmptyDescription>
                          Exemplos: alimentação, lazer, transporte ou estudos. Você escolhe o limite de cada uma.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button onClick={() => openCategoryDialog()}>
                          <Plus /> Criar categoria
                        </Button>
                      </EmptyContent>
                    </Empty>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] border-0 bg-[#dfece7] shadow-none">
                <CardHeader className="px-5 sm:px-6">
                  <CardTitle className="text-xl tracking-[-0.025em]">
                    Como está seu mês?
                  </CardTitle>
                  <CardDescription className="text-[#577067]">
                    Um resumo simples do que foi planejado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-5 sm:px-6">
                  <div className="rounded-2xl bg-[#173d35] p-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b8d1c8]">
                      Depois de compras e objetivos
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                      {formatMoney(data.balanceCents)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#c9ddd7]">
                      Esse é o que sobra da renda após as compras e o dinheiro separado para objetivos neste mês.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <BudgetLine label="Renda do mês" value={data.incomeCents} />
                    <BudgetLine
                      label="Limites definidos"
                      value={data.totalBudgetCents}
                    />
                    <BudgetLine
                      label="Compras registradas"
                      value={data.totalSpentCents}
                      negative
                    />
                    <BudgetLine
                      label="Guardado nos objetivos"
                      value={data.savedThisMonthCents}
                      negative
                    />
                  </div>
                  {data.incomeCents === 0 && (
                    <Button className="w-full" onClick={openIncomeDialog}>
                      <Landmark /> Informar minha renda
                    </Button>
                  )}
                </CardContent>
              </Card>
            </section>

            <Card className="rounded-[1.75rem] border-[#d5d9e4] bg-[#fbfcff] shadow-[0_16px_50px_-42px_rgba(47,64,103,0.65)]">
              <CardHeader className="gap-1 px-5 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-xl tracking-[-0.025em]">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#e4e9f5] text-[#53649a]">
                    <Target className="size-4" />
                  </span>
                  Objetivos
                </CardTitle>
                <CardDescription>
                  Separe dinheiro para planos maiores e acompanhe o progresso de cada um.
                </CardDescription>
                <CardAction>
                  <Button size="sm" onClick={() => openGoalDialog()}>
                    <Plus /> Novo objetivo
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {data.goals.length ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {data.goals.map((goal) => {
                      const percentage = Math.min(
                        100,
                        Math.round((goal.savedCents / goal.targetCents) * 100)
                      );
                      const completed = goal.savedCents >= goal.targetCents;

                      return (
                        <article
                          key={goal.id}
                          className="rounded-2xl border border-[#dde1ec] bg-white p-4 shadow-sm shadow-[#40517d]/5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white"
                                style={{ backgroundColor: goal.color }}
                              >
                                <Target className="size-4" />
                              </span>
                              <div className="min-w-0">
                                <h3 className="truncate font-semibold">{goal.name}</h3>
                                <p className="mt-0.5 text-xs text-[#727a8a]">
                                  {completed
                                    ? "Objetivo alcançado"
                                    : `${percentage}% concluído`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openGoalDialog(goal)}
                                aria-label={`Editar objetivo ${goal.name}`}
                              >
                                <Pencil />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Remover objetivo ${goal.name}`}
                                  >
                                    <Trash2 />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent size="sm">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover este objetivo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      O objetivo e o histórico de valores guardados nele serão apagados. Suas compras e categorias não serão alteradas.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      variant="destructive"
                                      onClick={() => void deleteGoal(goal.id)}
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          <div className="mt-5">
                            <div className="flex items-end justify-between gap-3">
                              <div>
                                <p className="text-xl font-semibold tracking-[-0.03em] text-[#26385f]">
                                  {formatMoney(goal.savedCents)}
                                </p>
                                <p className="text-xs text-[#727a8a]">
                                  de {formatMoney(goal.targetCents)}
                                </p>
                              </div>
                              <p className="text-right text-xs leading-5 text-[#727a8a]">
                                {completed
                                  ? "Meta completa"
                                  : `${formatMoney(goal.remainingCents)} faltando`}
                                <br />
                                {formatMoney(goal.savedThisMonthCents)} neste mês
                              </p>
                            </div>
                            <Progress
                              value={percentage}
                              aria-label={`${percentage}% do objetivo ${goal.name} concluído`}
                              className="mt-4 h-2 bg-[#e9ebf1] [&_[data-slot=progress-indicator]]:bg-[var(--goal-color)]"
                              style={
                                { "--goal-color": goal.color } as CSSProperties
                              }
                            />
                            {goal.dueDate && (
                              <p className="mt-3 flex items-center gap-1.5 text-xs text-[#657089]">
                                <CalendarDays className="size-3.5" />
                                Data limite: {formatDate(goal.dueDate)}
                              </p>
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 w-full border-[#ccd3e3] text-[#3d527f] hover:bg-[#eef1f8]"
                            onClick={() => openContributionDialog(goal.id)}
                          >
                            <Plus /> Guardar dinheiro
                          </Button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <Empty className="min-h-56 border border-[#dde1ec] bg-[#f5f7fb]">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Target />
                      </EmptyMedia>
                      <EmptyTitle>Crie seu primeiro objetivo</EmptyTitle>
                      <EmptyDescription>
                        Pode ser um tablet, uma viagem, a reserva de emergência ou qualquer plano para o qual você queira guardar dinheiro.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button onClick={() => openGoalDialog()}>
                        <Plus /> Adicionar objetivo
                      </Button>
                    </EmptyContent>
                  </Empty>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border-[#dfdbcf] bg-[#fffdf8] shadow-[0_16px_50px_-42px_rgba(23,61,53,0.8)]">
              <CardHeader className="gap-1 px-5 sm:px-6">
                <CardTitle className="text-xl tracking-[-0.025em]">
                  Compras do mês
                </CardTitle>
                <CardDescription>As compras mais recentes aparecem primeiro.</CardDescription>
                <CardAction>
                  <Button
                    size="sm"
                    onClick={() => openPurchaseDialog()}
                    disabled={!data.categories.length}
                  >
                    <Plus /> Registrar
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {data.purchases.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Compra</TableHead>
                        <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                        <TableHead className="hidden md:table-cell">Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-10">
                          <span className="sr-only">Ações</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.purchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell>
                            <p className="max-w-[150px] truncate font-medium sm:max-w-none">
                              {purchase.description}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 sm:hidden">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: purchase.categoryColor }}
                              />
                              <span className="text-xs text-[#768079]">
                                {purchase.categoryName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="font-normal">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: purchase.categoryColor }}
                              />
                              {purchase.categoryName}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden text-[#6f7772] md:table-cell">
                            {formatDate(purchase.purchasedAt)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-[#a44437]">
                            − {formatMoney(purchase.amountCents)}
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Remover ${purchase.description}`}
                                >
                                  <Trash2 />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent size="sm">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover esta compra?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O valor voltará a ficar disponível em {purchase.categoryName}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    variant="destructive"
                                    onClick={() => void deletePurchase(purchase.id)}
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Empty className="min-h-56 border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ReceiptText />
                      </EmptyMedia>
                      <EmptyTitle>Nenhuma compra registrada</EmptyTitle>
                      <EmptyDescription>
                        Quando você adicionar uma compra, o saldo total e o valor da categoria serão atualizados automaticamente.
                      </EmptyDescription>
                    </EmptyHeader>
                    {data.categories.length > 0 && (
                      <EmptyContent>
                        <Button onClick={() => openPurchaseDialog()}>
                          <Plus /> Registrar primeira compra
                        </Button>
                      </EmptyContent>
                    )}
                  </Empty>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
        <DialogContent>
          <form onSubmit={saveIncome}>
            <DialogHeader>
              <DialogTitle>Renda de {formatMonthLabel(month)}</DialogTitle>
              <DialogDescription>
                Informe quanto você terá disponível no mês. Use o valor líquido que realmente pode gastar.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-2">
              <Label htmlFor="income">Valor da renda</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#747b77]">
                  R$
                </span>
                <Input
                  id="income"
                  autoFocus
                  inputMode="decimal"
                  placeholder="0,00"
                  value={incomeValue}
                  onChange={(event) => setIncomeValue(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIncomeOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Salvar renda
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent>
          <form onSubmit={saveCategory}>
            <DialogHeader>
              <DialogTitle>
                {editingCategoryId ? "Editar categoria" : "Nova categoria"}
              </DialogTitle>
              <DialogDescription>
                Dê um nome e defina o máximo que deseja gastar nessa categoria durante o mês.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nome</Label>
                <Input
                  id="category-name"
                  autoFocus
                  maxLength={40}
                  placeholder="Ex.: Alimentação"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-budget">Limite para o mês</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#747b77]">
                    R$
                  </span>
                  <Input
                    id="category-budget"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={categoryBudget}
                    onChange={(event) => setCategoryBudget(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                {editingCategoryId ? "Salvar alterações" : "Adicionar categoria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent>
          <form onSubmit={savePurchase}>
            <DialogHeader>
              <DialogTitle>Registrar compra</DialogTitle>
              <DialogDescription>
                O valor será descontado automaticamente do saldo geral e da categoria escolhida.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase-description">O que você comprou?</Label>
                <Input
                  id="purchase-description"
                  autoFocus
                  maxLength={80}
                  placeholder="Ex.: Mercado da semana"
                  value={purchaseDescription}
                  onChange={(event) => setPurchaseDescription(event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchase-amount">Valor</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#747b77]">
                      R$
                    </span>
                    <Input
                      id="purchase-amount"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={purchaseAmount}
                      onChange={(event) => setPurchaseAmount(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase-date">Data</Label>
                  <Input
                    id="purchase-date"
                    type="date"
                    min={`${month}-01`}
                    max={`${month}-31`}
                    value={purchaseDate}
                    onChange={(event) => setPurchaseDate(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-category">Categoria</Label>
                <Select
                  value={purchaseCategoryId}
                  onValueChange={(value) => value && setPurchaseCategoryId(value)}
                >
                  <SelectTrigger id="purchase-category" className="w-full">
                    <SelectValue placeholder="Escolha uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name} · {formatMoney(category.remainingCents)} livre
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {purchaseCategoryId && categoryMap.get(Number(purchaseCategoryId)) && (
                  <p className="text-xs text-[#69726d]">
                    Disponível agora:{" "}
                    {formatMoney(
                      categoryMap.get(Number(purchaseCategoryId))!.remainingCents
                    )}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPurchaseOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Registrar compra
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent>
          <form onSubmit={saveGoal}>
            <DialogHeader>
              <DialogTitle>
                {editingGoalId ? "Editar objetivo" : "Novo objetivo"}
              </DialogTitle>
              <DialogDescription>
                Defina a meta e informe quanto você já tinha guardado antes de acompanhar o objetivo por aqui.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-name">Nome do objetivo</Label>
                <Input
                  id="goal-name"
                  autoFocus
                  maxLength={40}
                  placeholder="Ex.: Tablet novo"
                  value={goalName}
                  onChange={(event) => setGoalName(event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="goal-target">Quanto deseja juntar?</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#747b77]">
                      R$
                    </span>
                    <Input
                      id="goal-target"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={goalTarget}
                      onChange={(event) => setGoalTarget(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-initial">Quanto já estava guardado?</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#747b77]">
                      R$
                    </span>
                    <Input
                      id="goal-initial"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={goalInitialSaved}
                      onChange={(event) => setGoalInitialSaved(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-due-date">Data limite (opcional)</Label>
                <Input
                  id="goal-due-date"
                  type="date"
                  value={goalDueDate}
                  onChange={(event) => setGoalDueDate(event.target.value)}
                />
                <p className="text-xs leading-5 text-[#69726d]">
                  Deixe em branco se esse objetivo não tiver prazo.
                </p>
              </div>
              <p className="text-xs leading-5 text-[#69726d]">
                O valor inicial serve apenas para começar o progresso correto e não será descontado da renda deste mês.
              </p>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGoalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                {editingGoalId ? "Salvar alterações" : "Criar objetivo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={contributionOpen} onOpenChange={setContributionOpen}>
        <DialogContent>
          <form onSubmit={saveContribution}>
            <DialogHeader>
              <DialogTitle>Guardar dinheiro</DialogTitle>
              <DialogDescription>
                O valor será somado ao objetivo
                {contributionGoalId
                  ? ` “${data?.goals.find((goal) => goal.id === contributionGoalId)?.name ?? "selecionado"}”`
                  : " selecionado"}{" "}
                e descontado do livre para gastar em {formatMonthLabel(month)}.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contribution-amount">Valor para guardar</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#747b77]">
                    R$
                  </span>
                  <Input
                    id="contribution-amount"
                    autoFocus
                    inputMode="decimal"
                    placeholder="0,00"
                    value={contributionAmount}
                    onChange={(event) => setContributionAmount(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contribution-date">Data</Label>
                <Input
                  id="contribution-date"
                  type="date"
                  min={`${month}-01`}
                  max={`${month}-31`}
                  value={contributionDate}
                  onChange={(event) => setContributionDate(event.target.value)}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-[#69726d]">
              Livre antes de guardar: {formatMoney(data?.balanceCents ?? 0)}
            </p>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContributionOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Guardar valor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: "green" | "orange" | "purple" | "blue" | "red";
}) {
  const toneClass = {
    green: "bg-[#dcebe5] text-[#285c4f]",
    orange: "bg-[#f5e3d6] text-[#a3532b]",
    purple: "bg-[#e7e5f2] text-[#5e629d]",
    blue: "bg-[#dce9f1] text-[#326a8f]",
    red: "bg-[#f2deda] text-[#a44237]",
  }[tone];

  return (
    <Card className="gap-4 rounded-2xl border-[#dfdbcf] bg-[#fffdf8] py-5 shadow-none">
      <CardContent className="px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#717b75]">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#173d35]">
              {value}
            </p>
          </div>
          <span
            className={`flex size-9 items-center justify-center rounded-xl [&_svg]:size-4 ${toneClass}`}
          >
            {icon}
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#7a817d]">{detail}</p>
      </CardContent>
    </Card>
  );
}

function BudgetLine({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#bfd3cc] pb-3 text-sm last:border-0 last:pb-0">
      <span className="text-[#577067]">{label}</span>
      <span className={`font-semibold ${negative ? "text-[#a44437]" : "text-[#234b41]"}`}>
        {negative ? "− " : ""}
        {formatMoney(value)}
      </span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-label="Carregando orçamento">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl bg-[#e4e0d5]" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <Skeleton className="h-96 rounded-[1.75rem] bg-[#e4e0d5]" />
        <Skeleton className="h-96 rounded-[1.75rem] bg-[#dce6e1]" />
      </div>
    </div>
  );
}
