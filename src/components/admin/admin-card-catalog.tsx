"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CircleAlert,
  Layers3,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { saveCardDeck, saveCardTemplate } from "@/app/actions/card-admin";
import type {
  AdminCardTemplateView,
  AdminDeckView,
  CatalogIssue,
} from "@/lib/admin-card-catalog";
import { DEFAULT_DECK_BACK } from "@/lib/card-deck-style";
import {
  CARD_RARITIES,
  CARD_RARITY_LABELS,
  type CollectibleCardViewModel,
} from "@/lib/card-catalog";
import { getCodedCardDefinitionsForDeck } from "@/lib/card-definitions";
import { deckBackStyles, type CardRendererType } from "@/lib/db/schema";
import CardBack from "@/components/card/CardBack";
import { CollectibleCard } from "@/components/card/collectible-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type GameTitleOption = {
  id: string;
  title: string;
  normalizedTitle: string;
  rewardDeckName: string | null;
};

type CatalogFilter = "all" | "errors" | "warnings" | "inactive";

const rarityColor: Record<(typeof CARD_RARITIES)[number], string> = {
  common: "bg-slate-400",
  uncommon: "bg-emerald-500",
  rare: "bg-violet-500",
  legendary: "bg-amber-400",
};

const rendererLabels: Record<CardRendererType, string> = {
  game_piece: "Game piece",
  skyjo_number: "Skyjo number",
  friend_profile: "Friend profile",
  played_title: "Played title",
};

export function AdminCardCatalog({
  decks,
  gameTitles,
  globalIssues,
}: {
  decks: AdminDeckView[];
  gameTitles: GameTitleOption[];
  globalIssues: CatalogIssue[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CatalogFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editingDeckName, setEditingDeckName] = useState<string | "new" | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{ deckName: string; templateId: string | null } | null>(null);

  const allIssues = [...globalIssues, ...decks.flatMap((deck) => deck.issues)];
  const errorCount = allIssues.filter((issue) => issue.severity === "error").length;
  const warningCount = allIssues.filter((issue) => issue.severity === "warning").length;
  const activeCardCount = decks.reduce(
    (total, deck) => total + deck.templates.filter((template) => template.isActive).length,
    0,
  );
  const mappedGameCount = gameTitles.filter((title) => title.rewardDeckName).length;
  const fallbackCount = gameTitles.length - mappedGameCount;

  const visibleDecks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return decks.filter((deck) => {
      const matchesQuery =
        !normalized ||
        [deck.label, deck.name, deck.description, ...deck.templates.flatMap((template) => [template.name, template.slug])]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesFilter =
        filter === "all" ||
        (filter === "errors" && deck.issues.some((issue) => issue.severity === "error")) ||
        (filter === "warnings" && deck.issues.some((issue) => issue.severity === "warning")) ||
        (filter === "inactive" && !deck.isActive);
      return matchesQuery && matchesFilter;
    });
  }, [decks, filter, query]);

  const editingDeck = editingDeckName && editingDeckName !== "new"
    ? decks.find((deck) => deck.name === editingDeckName) ?? null
    : null;
  const editingTemplateValue = editingTemplate?.templateId
    ? decks
        .find((deck) => deck.name === editingTemplate.deckName)
        ?.templates.find((template) => template.id === editingTemplate.templateId) ?? null
    : null;

  function toggleDeck(name: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-4xl font-black"><Layers3 /> Card catalog</h1>
            <p className="mt-1 text-sm text-muted-foreground">Preview every deck, audit its setup, and manage cards without losing context.</p>
          </div>
          <Button onClick={() => setEditingDeckName("new")}><Plus /> Create deck</Button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Catalog summary">
          <SummaryCard label="Decks" value={decks.length} icon={<Layers3 />} />
          <SummaryCard label="Active cards" value={activeCardCount} icon={<Sparkles />} />
          <SummaryCard label="Mapped games" value={mappedGameCount} detail={`${fallbackCount} Standard fallback`} icon={<ShieldCheck />} />
          <SummaryCard label="Errors" value={errorCount} tone={errorCount ? "error" : "ok"} icon={<AlertCircle />} />
          <SummaryCard label="Warnings" value={warningCount} tone={warningCount ? "warning" : "ok"} icon={<CircleAlert />} />
        </section>

        {errorCount > 0 ? (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/5 px-4 py-3">
            <AlertCircle />
            <AlertTitle>{errorCount} catalog {errorCount === 1 ? "error needs" : "errors need"} attention</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {allIssues.filter((issue) => issue.severity === "error").slice(0, 6).map((issue) => (
                  <li key={issue.code}>{issue.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck />
            <AlertTitle>Catalog configuration looks healthy</AlertTitle>
            <AlertDescription>Every active deck has valid artwork, odds, and usable cards.</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search decks or cards"
              className="pl-10"
            />
          </label>
          <select
            aria-label="Filter catalog status"
            value={filter}
            onChange={(event) => setFilter(event.target.value as CatalogFilter)}
            className="h-14 rounded-xl border border-input bg-background px-4 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="errors">Has errors</option>
            <option value="warnings">Has warnings</option>
            <option value="inactive">Inactive decks</option>
          </select>
          <Button
            variant="outline"
            onClick={() => setExpanded(new Set(visibleDecks.map((deck) => deck.name)))}
          >
            Expand visible
          </Button>
        </div>

        <section className="space-y-4" aria-label="Deck catalog">
          {visibleDecks.map((deck) => (
            <DeckCatalogCard
              key={deck.name}
              deck={deck}
              expanded={expanded.has(deck.name)}
              onToggle={() => toggleDeck(deck.name)}
              onEdit={() => setEditingDeckName(deck.name)}
              onAddCard={() => setEditingTemplate({ deckName: deck.name, templateId: null })}
              onEditCard={(templateId) => setEditingTemplate({ deckName: deck.name, templateId })}
            />
          ))}
          {visibleDecks.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No decks match this search and status filter.</CardContent></Card>
          ) : null}
        </section>
      </div>

      <DeckEditorDialog
        key={editingDeckName ?? "closed-deck"}
        open={editingDeckName !== null}
        deck={editingDeck}
        gameTitles={gameTitles}
        onOpenChange={(open) => !open && setEditingDeckName(null)}
      />
      <TemplateEditorDialog
        key={editingTemplate ? `${editingTemplate.deckName}:${editingTemplate.templateId ?? "new"}` : "closed-template"}
        open={editingTemplate !== null}
        deck={editingTemplate ? decks.find((deck) => deck.name === editingTemplate.deckName) ?? null : null}
        template={editingTemplateValue}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  detail?: string;
  icon: React.ReactNode;
  tone?: "default" | "error" | "warning" | "ok";
}) {
  return (
    <Card className={cn(
      tone === "error" && "border-destructive/50 bg-destructive/5",
      tone === "warning" && "border-amber-500/50 bg-amber-500/5",
      tone === "ok" && "border-emerald-500/30",
    )}>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-3xl font-black">{value}</p>{detail ? <p className="text-[11px] text-muted-foreground">{detail}</p> : null}</div>
        <span className="text-muted-foreground">{icon}</span>
      </CardContent>
    </Card>
  );
}

function DeckCatalogCard({
  deck,
  expanded,
  onToggle,
  onEdit,
  onAddCard,
  onEditCard,
}: {
  deck: AdminDeckView;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onAddCard: () => void;
  onEditCard: (id: string) => void;
}) {
  const errors = deck.issues.filter((issue) => issue.severity === "error");
  const warnings = deck.issues.filter((issue) => issue.severity === "warning");
  const odds = CARD_RARITIES.map((rarity) => ({ rarity, value: deck[`${rarity}Odds`] }));

  return (
    <Card id={`deck-${deck.name}`} className={cn(errors.length && "border-destructive/60 shadow-destructive/10", !errors.length && warnings.length && "border-amber-500/40")}>
      <CardContent className="p-4 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[8rem_1fr_auto] lg:items-start">
          <CardBack
            className="mx-auto h-44 w-32 lg:mx-0"
            label={deck.label}
            backStyle={deck.backStyle}
            primaryColor={deck.backPrimaryColor}
            secondaryColor={deck.backSecondaryColor}
            accentColor={deck.backAccentColor}
          />
          <div className="min-w-0 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black">{deck.label}</h2>
                <Badge variant={deck.isActive ? "secondary" : "outline"}>{deck.isActive ? "Active" : "Inactive"}</Badge>
                {errors.length ? <Badge variant="destructive">{errors.length} error{errors.length === 1 ? "" : "s"}</Badge> : null}
                {!errors.length && warnings.length ? <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">{warnings.length} warning{warnings.length === 1 ? "" : "s"}</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{deck.description || "No deck description"}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{deck.name}</p>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <Metric label="Pack size" value={`${deck.packSize} cards`} />
              <Metric label="Templates" value={`${deck.templates.length} total · ${deck.templates.filter((template) => template.isActive).length} active`} />
              <Metric label="Games" value={deck.rewardGameTitles.length ? `${deck.rewardGameTitles.length} explicitly mapped` : "Standard fallback only"} />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs font-bold"><span>Rarity odds</span><span>{odds.reduce((sum, item) => sum + item.value, 0)}%</span></div>
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                {odds.map(({ rarity, value }) => <span key={rarity} className={rarityColor[rarity]} style={{ width: `${Math.max(0, value)}%` }} title={`${CARD_RARITY_LABELS[rarity]} ${value}%`} />)}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {odds.map(({ rarity, value }) => <span key={rarity}>{CARD_RARITY_LABELS[rarity]} {value}%</span>)}
              </div>
            </div>

            {deck.rewardGameTitles.length ? (
              <div className="flex flex-wrap gap-1.5">
                {deck.rewardGameTitles.slice(0, 5).map((title) => <Badge key={title.id} variant="outline">{title.title}</Badge>)}
                {deck.rewardGameTitles.length > 5 ? <Badge variant="outline">+{deck.rewardGameTitles.length - 5} more</Badge> : null}
              </div>
            ) : null}

            {deck.issues.length ? (
              <div className="space-y-1.5">
                {deck.issues.map((issue) => (
                  <div key={issue.code} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium", issue.severity === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300")}>
                    {issue.severity === "error" ? <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> : <CircleAlert className="mt-0.5 size-3.5 shrink-0" />}
                    {issue.message}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex gap-2 lg:flex-col">
            <Button variant="outline" onClick={onEdit}><Pencil /> Edit deck</Button>
            <Button variant="ghost" onClick={onToggle} aria-expanded={expanded} aria-controls={`deck-cards-${deck.name}`}>
              {expanded ? <ChevronDown /> : <ChevronRight />} {expanded ? "Hide cards" : "Show cards"}
            </Button>
          </div>
        </div>

        {expanded ? (
          <div id={`deck-cards-${deck.name}`} className="mt-6 border-t pt-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h3 className="text-lg font-black">Card templates</h3><p className="text-xs text-muted-foreground">These are the faces players can pull from this deck.</p></div>
              <Button size="sm" onClick={onAddCard}><Plus /> Add card</Button>
            </div>
            {deck.templates.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {deck.templates.map((template) => <TemplateCatalogCard key={template.id} template={template} onEdit={() => onEditCard(template.id)} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-8 text-center">
                <p className="font-black text-destructive">No cards configured</p>
                <p className="mt-1 text-sm text-muted-foreground">Add the first card to make this deck usable.</p>
                <Button className="mt-4" onClick={onAddCard}><Plus /> Add card</Button>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted/60 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="font-bold">{value}</p></div>;
}

function TemplateCatalogCard({ template, onEdit }: { template: AdminCardTemplateView; onEdit: () => void }) {
  const hasError = template.issues.some((issue) => issue.severity === "error");
  return (
    <article className={cn("flex gap-3 rounded-xl border p-3", hasError && "border-destructive/50 bg-destructive/5", !template.isActive && "opacity-70")}>
      <div className="w-24 shrink-0"><CollectibleCard card={template.preview} compact /></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          <h4 className="truncate font-black">{template.name}</h4>
          <Badge variant={template.isActive ? "secondary" : "outline"}>{template.isActive ? "Active" : "Inactive"}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{CARD_RARITY_LABELS[template.rarity]} · {rendererLabels[template.renderer]}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.description || "No description"}</p>
        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{template.slug}</p>
        {hasError ? <p className="mt-1 text-xs font-bold text-destructive">Invalid renderer configuration</p> : null}
        <Button size="sm" variant="outline" className="mt-auto self-start" onClick={onEdit}><Pencil /> Edit</Button>
      </div>
    </article>
  );
}

function DeckEditorDialog({
  open,
  deck,
  gameTitles,
  onOpenChange,
}: {
  open: boolean;
  deck: AdminDeckView | null;
  gameTitles: GameTitleOption[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState(deck?.label ?? "");
  const [description, setDescription] = useState(deck?.description ?? "");
  const [isActive, setIsActive] = useState(deck?.isActive ?? true);
  const [packSize, setPackSize] = useState(deck?.packSize ?? 5);
  const [odds, setOdds] = useState({
    common: deck?.commonOdds ?? 70,
    uncommon: deck?.uncommonOdds ?? 20,
    rare: deck?.rareOdds ?? 8,
    legendary: deck?.legendaryOdds ?? 2,
  });
  const [backStyle, setBackStyle] = useState(deck?.backStyle ?? DEFAULT_DECK_BACK.backStyle);
  const [primary, setPrimary] = useState(deck?.backPrimaryColor ?? DEFAULT_DECK_BACK.backPrimaryColor);
  const [secondary, setSecondary] = useState(deck?.backSecondaryColor ?? DEFAULT_DECK_BACK.backSecondaryColor);
  const [accent, setAccent] = useState(deck?.backAccentColor ?? DEFAULT_DECK_BACK.backAccentColor);
  const [selectedGames, setSelectedGames] = useState<string[]>(deck?.rewardGameTitles.map((title) => title.id) ?? []);
  const oddsTotal = Object.values(odds).reduce((sum, value) => sum + value, 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (oddsTotal !== 100) {
      setError("Rarity odds must total 100% before saving");
      return;
    }
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await saveCardDeck(formData);
        toast.success(deck ? "Deck updated" : "Deck created");
        onOpenChange(false);
        router.refresh();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Unable to save deck";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-xl font-black">{deck ? `Edit ${deck.label}` : "Create deck"}</DialogTitle>
          <DialogDescription>Configure how the deck looks, draws cards, and connects to games.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          {error ? <Alert variant="destructive" className="border-destructive/40 bg-destructive/5"><AlertCircle /><AlertTitle>Deck was not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <div className="grid gap-6 lg:grid-cols-[1fr_15rem]">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Deck slug"><Input name="name" required readOnly={Boolean(deck)} defaultValue={deck?.name ?? ""} placeholder="deck-slug" /></Field>
                <Field label="Display name"><Input name="label" required value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Deck name" /></Field>
                <Field label="Description" className="sm:col-span-2"><Textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What players collect from this deck" /></Field>
                <Field label="Pack size"><Input name="packSize" type="number" min={1} max={10} value={packSize} onChange={(event) => setPackSize(Number(event.target.value))} /></Field>
                <label className="flex items-center gap-2 self-end rounded-xl border px-4 py-4 text-sm font-bold">
                  <input
                    name="isActive"
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => {
                      setIsActive(event.target.checked);
                      if (!event.target.checked) setSelectedGames([]);
                    }}
                    disabled={deck?.name === "standard"}
                  /> Active
                  {deck?.name === "standard" ? <input type="hidden" name="isActive" value="on" /> : null}
                  {deck?.name === "standard" ? <span className="text-xs font-normal text-muted-foreground">Required fallback</span> : null}
                </label>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between"><h3 className="font-black">Rarity odds</h3><span className={cn("text-sm font-black", oddsTotal === 100 ? "text-emerald-600" : "text-destructive")}>{oddsTotal}% / 100%</span></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {CARD_RARITIES.map((rarity) => (
                    <Field key={rarity} label={`${CARD_RARITY_LABELS[rarity]} %`}>
                      <Input name={`${rarity}Odds`} type="number" min={0} max={100} value={odds[rarity]} aria-invalid={oddsTotal !== 100} onChange={(event) => setOdds((current) => ({ ...current, [rarity]: Number(event.target.value) }))} />
                    </Field>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-black">Deck-back artwork</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Pattern">
                    <select name="backStyle" value={backStyle} onChange={(event) => setBackStyle(event.target.value as typeof backStyle)} className="h-14 w-full rounded-xl border border-input bg-background px-4 text-sm">
                      {deckBackStyles.map((style) => <option key={style} value={style}>{style[0].toUpperCase() + style.slice(1)}</option>)}
                    </select>
                  </Field>
                  <ColorField name="backPrimaryColor" label="Primary" value={primary} onChange={setPrimary} />
                  <ColorField name="backSecondaryColor" label="Secondary" value={secondary} onChange={setSecondary} />
                  <ColorField name="backAccentColor" label="Accent" value={accent} onChange={setAccent} />
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-black">Connected games</h3>
                <GameTitleMultiSelect options={gameTitles} value={selectedGames} onChange={setSelectedGames} currentDeckName={deck?.name ?? null} disabled={!isActive} />
                {selectedGames.map((id) => <input key={id} type="hidden" name="gameTitleIds" value={id} />)}
                {!isActive ? <p className="mt-2 text-xs text-muted-foreground">Inactive decks cannot be assigned to games. Saving will return previous assignments to Standard fallback.</p> : null}
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">Live deck preview</p>
              <CardBack className="mx-auto" label={label || "New deck"} backStyle={backStyle} primaryColor={primary} secondaryColor={secondary} accentColor={accent} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || oddsTotal !== 100}>{isPending ? "Saving…" : deck ? "Save deck" : "Create deck"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GameTitleMultiSelect({
  options,
  value,
  onChange,
  currentDeckName,
  disabled,
}: {
  options: GameTitleOption[];
  value: string[];
  onChange: (value: string[]) => void;
  currentDeckName: string | null;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value);
  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button type="button" variant="outline" role="combobox" disabled={disabled} className="h-14 w-full justify-between" />} aria-expanded={open}>
          <span>{value.length ? `${value.length} game${value.length === 1 ? "" : "s"} selected` : "Search and select games"}</span><ChevronsUpDown className="size-4 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-(--anchor-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Search game titles" />
            <CommandList className="max-h-72">
              <CommandEmpty>No game titles found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.title} ${option.normalizedTitle}`}
                    onSelect={() => onChange(selected.has(option.id) ? value.filter((id) => id !== option.id) : [...value, option.id])}
                  >
                    <Check className={cn("size-4", selected.has(option.id) ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1 truncate">{option.title}</span>
                    {option.rewardDeckName && option.rewardDeckName !== currentDeckName ? <span className="text-[10px] text-muted-foreground">currently {option.rewardDeckName}</span> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length ? (
        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {options.filter((option) => selected.has(option.id)).map((option) => (
            <button key={option.id} type="button" onClick={() => onChange(value.filter((id) => id !== option.id))} className="rounded-full border bg-muted px-2 py-1 text-xs hover:bg-destructive/10 hover:text-destructive" title={`Remove ${option.title}`}>{option.title} ×</button>
          ))}
        </div>
      ) : <p className="text-xs text-muted-foreground">Unselected games continue to use the healthy Standard fallback.</p>}
    </div>
  );
}

function TemplateEditorDialog({
  open,
  deck,
  template,
  onOpenChange,
}: {
  open: boolean;
  deck: AdminDeckView | null;
  template: AdminCardTemplateView | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const definitions = deck ? getCodedCardDefinitionsForDeck(deck.name) : [];
  const availableDefinitions = template
    ? definitions
    : definitions.filter(
        (definition) => !deck?.templates.some((existing) => existing.slug === definition.slug),
      );
  const initialDefinition = template
    ? definitions.find((definition) => definition.slug === template.slug)
    : availableDefinitions[0];
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [definitionSlug, setDefinitionSlug] = useState(initialDefinition?.slug ?? template?.slug ?? "");
  const definition = definitions.find((item) => item.slug === definitionSlug);
  const [name, setName] = useState(template?.name ?? initialDefinition?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? initialDefinition?.description ?? "");
  const [rarity, setRarity] = useState(template?.rarity ?? initialDefinition?.rarity ?? "common");
  const [sortOrder, setSortOrder] = useState(template?.sortOrder ?? initialDefinition?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(template?.isActive ?? true);

  const preview: CollectibleCardViewModel = {
    instanceId: null,
    identityKey: "admin:live-preview",
    deckName: deck?.name ?? "preview",
    deckLabel: deck?.label ?? "Preview",
    templateId: template?.id ?? "preview",
    templateSlug: definition?.slug ?? template?.slug ?? "preview",
    name: name || "Card preview",
    description,
    rarity,
    renderer: definition?.renderer ?? template?.renderer ?? "game_piece",
    config: (definition?.config ?? template?.config ?? {}) as CollectibleCardViewModel["config"],
    subjectType: null,
    subjectId: null,
    subject: null,
    unavailable: false,
    collected: false,
    quantity: 0,
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await saveCardTemplate(formData);
        toast.success(template ? "Card updated" : "Card added");
        onOpenChange(false);
        router.refresh();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Unable to save card";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-xl font-black">{template ? `Edit ${template.name}` : `Add card to ${deck?.label ?? "deck"}`}</DialogTitle>
          <DialogDescription>Choose a card built in code, then manage its catalog metadata and rarity.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <input type="hidden" name="id" value={template?.id ?? ""} />
          <input type="hidden" name="deckName" value={deck?.name ?? ""} />
          <input type="hidden" name="slug" value={definitionSlug} />
          <Alert><ShieldCheck /><AlertTitle>Artwork is owned by code</AlertTitle><AlertDescription>Renderer, colors, values, and number artwork come from <code>src/lib/card-definitions.ts</code>. This screen only manages the card record and pull rarity.</AlertDescription></Alert>
          {!definition ? <Alert variant="destructive"><AlertCircle /><AlertTitle>No coded card definition available</AlertTitle><AlertDescription>Add this deck&apos;s card artwork to <code>src/lib/card-definitions.ts</code>, then return here to add it to the catalog.</AlertDescription></Alert> : null}
          {error ? <Alert variant="destructive" className="border-destructive/40 bg-destructive/5"><AlertCircle /><AlertTitle>Card was not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <div className="grid gap-6 md:grid-cols-[1fr_13rem]">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Coded card">
                {template ? (
                  <Input readOnly value={definition ? `${definition.name} (${definition.slug})` : template.slug} />
                ) : (
                  <select
                    value={definitionSlug}
                    onChange={(event) => {
                      const next = definitions.find((item) => item.slug === event.target.value);
                      setDefinitionSlug(event.target.value);
                      if (next) {
                        setName(next.name);
                        setDescription(next.description);
                        setRarity(next.rarity);
                        setSortOrder(next.sortOrder);
                      }
                    }}
                    className="h-14 w-full rounded-xl border border-input bg-background px-4 text-sm"
                  >
                    {availableDefinitions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Card name"><Input name="templateName" required value={name} onChange={(event) => setName(event.target.value)} /></Field>
              <Field label="Description" className="sm:col-span-2"><Textarea name="templateDescription" value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
              <Field label="Rarity">
                <select name="rarity" value={rarity} onChange={(event) => setRarity(event.target.value as typeof rarity)} className="h-14 w-full rounded-xl border border-input bg-background px-4 text-sm">
                  {CARD_RARITIES.map((item) => <option key={item} value={item}>{CARD_RARITY_LABELS[item]}</option>)}
                </select>
              </Field>
              <Field label="Sort order"><Input name="sortOrder" type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} /></Field>
              <label className="flex items-center gap-2 self-end rounded-xl border px-4 py-4 text-sm font-bold"><input name="templateIsActive" type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> Active</label>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">Live card preview</p>
              <CollectibleCard card={preview} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !definition}>{isPending ? "Saving…" : template ? "Save card" : "Add card"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={cn("space-y-1 text-xs font-bold", className)}><span>{label}</span>{children}</label>;
}

function ColorField({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2"><Input name={name} value={value} onChange={(event) => onChange(event.target.value)} pattern="#[0-9a-fA-F]{6}" /><Input type="color" aria-label={`${label} color picker`} value={value} onChange={(event) => onChange(event.target.value)} className="w-16 p-2" /></div>
    </Field>
  );
}
