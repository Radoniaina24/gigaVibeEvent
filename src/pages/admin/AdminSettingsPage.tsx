import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AtSign,
  Banknote,
  Bell,
  Building2,
  Calculator,
  Check,
  Coins,
  FileText,
  Globe,
  Hash,
  Image as ImageIcon,
  Info,
  KeyRound,
  Lock,
  Mail,
  Megaphone,
  MessageSquare,
  Phone,
  Search,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  Smartphone,
  Timer,
  Upload,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { env } from '../../app/config/env';
import {
  usePlatformSettings,
  type ConfigPaymentMethodId,
} from '../../hooks/usePlatformSettings';
import { useUpdatePlatformSetting } from '../../features/admin/hooks';
import { PAYMENT_METHODS } from '../../features/payments/providers';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Fields';
import { OperatorLogo } from '../../components/orders/OperatorLogo';
import { PaymentMethodBadge } from '../../components/orders/PaymentMethodBadge';
import { cn, formatAr } from '../../lib/utils';

const METHOD_SHORT: Record<ConfigPaymentMethodId, 'yas' | 'orange' | 'airtel'> = {
  yas: 'yas',
  orange_money: 'orange',
  airtel_money: 'airtel',
};

type SettingsTabId = 'validation' | 'mobile-money' | 'pricing' | 'site' | 'contact' | 'content' | 'system';

const TABS: { id: SettingsTabId; label: string; short: string; icon: typeof Settings; desc: string }[] = [
  { id: 'validation', label: 'Validation paiements', short: 'Validation', icon: ShieldCheck, desc: 'Qui valide les paiements manuels' },
  { id: 'mobile-money', label: 'Mobile Money', short: 'Mobile Money', icon: Smartphone, desc: 'Numéros marchands, préfixes et instructions YAS · Orange · Airtel' },
  { id: 'pricing', label: 'Tarifs & limites', short: 'Tarifs', icon: Banknote, desc: 'Frais fixes, qui paie, plafonds du panier' },
  { id: 'site', label: 'Site & billetterie', short: 'Site', icon: Globe, desc: 'Devise, expiration, maintenance' },
  { id: 'contact', label: 'Site & contact', short: 'Contact', icon: Mail, desc: 'Nom, logo, contact, numérotation, uploads' },
  { id: 'content', label: 'Contenu & SEO', short: 'Contenu', icon: Megaphone, desc: 'Remboursement, CGU, SEO, réseaux sociaux, emails' },
  { id: 'system', label: 'Système & sécurité', short: 'Système', icon: Server, desc: 'Environnement & rappels' },
];

/* ------------------------------------------------------------------ */
/*  Primitifs UI                                                       */
/* ------------------------------------------------------------------ */

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        checked ? 'bg-emerald-500' : 'bg-zinc-300 hover:bg-zinc-400',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: typeof Settings;
  title: string;
  description: string;
  tone: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm', tone)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 className="font-bold leading-tight">{title}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function SaveBar({
  dirty,
  saving,
  onSave,
  idleText = 'Configuration à jour.',
  dirtyText = 'Modifications non enregistrées.',
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  idleText?: string;
  dirtyText?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-zinc-950 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-xs text-zinc-400">
        <span aria-hidden className={cn('size-2 rounded-full', dirty ? 'animate-pulse bg-amber-400' : 'bg-emerald-400')} />
        {dirty ? dirtyText : idleText}
      </p>
      <Button size="sm" loading={saving} disabled={!dirty} onClick={onSave} className="shrink-0">
        Enregistrer
      </Button>
    </div>
  );
}

function FormFeedback({ tone, message }: { tone: 'ok' | 'ko'; message: string }) {
  return (
    <p
      role={tone === 'ko' ? 'alert' : 'status'}
      className={cn(
        'flex items-center gap-2 rounded-xl border p-3 text-sm font-medium',
        tone === 'ok'
          ? 'border-green-200 bg-green-50 text-green-800'
          : 'border-red-200 bg-red-50 text-red-700',
      )}
    >
      {tone === 'ok' && <Check className="size-4 shrink-0" aria-hidden />}
      {message}
    </p>
  );
}

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-label="Chargement" className="mt-4 space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} aria-hidden className="skeleton h-14 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Onglet 1 — Validation des paiements                                */
/* ------------------------------------------------------------------ */

const VALIDATION_OPTIONS = [
  {
    value: 'gve',
    title: 'Giga Vibe Event',
    description: 'Contrôle centralisé par le backoffice admin avant génération des billets.',
    icon: ShieldCheck,
    tile: 'bg-gradient-to-br from-brand-600 to-brand-800 shadow-brand-600/30',
  },
  {
    value: 'partner',
    title: 'Chaque partenaire',
    description: 'Chaque organisateur vérifie les transferts de ses propres événements.',
    icon: Users,
    tile: 'bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sky-600/30',
  },
] as const;

function ValidationCard() {
  const settings = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [validationMode, setValidationMode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [settingError, setSettingError] = useState<string | null>(null);

  const currentMode = validationMode ?? settings.data?.paymentValidation ?? 'gve';
  const modeDirty = settings.data != null && currentMode !== settings.data.paymentValidation;

  return (
    <Card className="p-4 sm:p-6">
      <SectionHeader
        icon={ShieldCheck}
        title="Validation des paiements manuels"
        description="Qui vérifie les transferts déclarés par les clients avant génération des billets."
        tone="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/30"
      />
      {settings.isPending ? (
        <CardSkeleton lines={2} />
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Responsable de validation">
            {VALIDATION_OPTIONS.map((opt) => {
              const selected = currentMode === opt.value;
              const isActive = settings.data?.paymentValidation === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setValidationMode(opt.value);
                    setSaved(false);
                    setSettingError(null);
                  }}
                  className={cn(
                    'group flex items-start gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                    selected
                      ? 'border-zinc-900 bg-zinc-950 text-white shadow-lg'
                      : 'border-zinc-200 bg-white hover:-translate-y-px hover:border-zinc-300 hover:shadow-md',
                  )}
                >
                  <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm', opt.tile)}>
                    <opt.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('flex flex-wrap items-center gap-2 text-sm font-bold', selected ? 'text-white' : 'text-zinc-900')}>
                      {opt.title}
                      {isActive && (
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          selected ? 'bg-emerald-400/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800',
                        )}>
                          Actif
                        </span>
                      )}
                    </span>
                    <span className={cn('mt-1 block text-xs leading-relaxed', selected ? 'text-zinc-300' : 'text-zinc-500')}>
                      {opt.description}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full border-2 transition',
                      selected ? 'border-emerald-400 bg-emerald-400 text-zinc-950' : 'border-zinc-300 bg-white text-transparent group-hover:border-zinc-400',
                    )}
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <SaveBar
              dirty={modeDirty}
              saving={updateSetting.isPending}
              idleText={saved ? 'Réglage enregistré.' : 'Configuration à jour.'}
              onSave={async () => {
                setSettingError(null);
                try {
                  await updateSetting.mutateAsync({ key: 'payment_validation', value: currentMode });
                  setValidationMode(null);
                  setSaved(true);
                } catch (err) {
                  setSettingError(err instanceof Error ? err.message : 'Enregistrement impossible.');
                }
              }}
            />
          </div>
          {settingError && (
            <div className="mt-3"><FormFeedback tone="ko" message={settingError} /></div>
          )}
          {saved && !modeDirty && (
            <div className="mt-3"><FormFeedback tone="ok" message="Réglage enregistré." /></div>
          )}
          <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-xs leading-relaxed text-zinc-500">
            Un billet n’est généré qu’après validation manuelle. Le mode <strong>GVE</strong> centralise le contrôle côté admin,
            le mode <strong>partenaire</strong> délègue la vérification à chaque organisateur.
          </p>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Onglet 2 — Numéros marchands                                       */
/* ------------------------------------------------------------------ */

function PaymentMethodsCard() {
  const settings = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [draft, setDraft] = useState<Record<
    string,
    { number: string; name: string; enabled: boolean }
  > | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'ko'; message: string } | null>(null);

  useEffect(() => {
    if (settings.data && draft === null) {
      const next: Record<string, { number: string; name: string; enabled: boolean }> = {};
      for (const m of settings.data.paymentMethods) {
        next[m.id] = { number: m.number, name: m.name, enabled: m.enabled };
      }
      setDraft(next);
    }
  }, [settings.data, draft]);

  const patch = (id: string, p: Partial<{ number: string; name: string; enabled: boolean }>) => {
    setDraft((d) => (d ? { ...d, [id]: { ...d[id], ...p } } : d));
    setDirty(true);
    setFeedback(null);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setFeedback(null);
    try {
      for (const id of Object.keys(draft) as ConfigPaymentMethodId[]) {
        const d = draft[id];
        const short = METHOD_SHORT[id];
        await updateSetting.mutateAsync({ key: `payment_${short}_enabled`, value: JSON.stringify(d.enabled) });
        await updateSetting.mutateAsync({ key: `payment_${short}_number`, value: JSON.stringify(d.number.trim()) });
        await updateSetting.mutateAsync({ key: `payment_${short}_name`, value: JSON.stringify(d.name.trim() || 'Giga Vibe Event') });
      }
      setDirty(false);
      setFeedback({ tone: 'ok', message: 'Numéros marchands enregistrés.' });
    } catch (err) {
      setFeedback({ tone: 'ko', message: err instanceof Error ? err.message : 'Enregistrement impossible.' });
    } finally {
      setSaving(false);
    }
  };

  const activeCount = draft ? Object.values(draft).filter((d) => d.enabled).length : 0;

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader
          icon={Smartphone}
          title="Numéros marchands Mobile Money"
          description="Numéros et bénéficiaires affichés aux acheteurs. Désactivez un moyen pour le retirer du tunnel d'achat."
          tone="bg-gradient-to-br from-brand-600 to-brand-800 shadow-brand-600/30"
        />
        {draft && (
          <Badge tone={activeCount > 0 ? 'success' : 'warning'}>{activeCount}/3 actifs</Badge>
        )}
      </div>
      {settings.isPending || !draft ? (
        <div role="status" aria-label="Chargement des moyens de paiement" className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} aria-hidden className="rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="skeleton h-10 w-14 rounded-xl" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
                <div className="skeleton h-6 w-11 rounded-full" />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="skeleton h-10 w-full rounded-lg" />
                <div className="skeleton h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {PAYMENT_METHODS.map((meta) => {
            const d = draft[meta.id];
            if (!d) return null;
            return (
              <div
                key={meta.id}
                className={cn(
                  'rounded-2xl border p-4 transition',
                  d.enabled ? 'border-zinc-200 bg-white' : 'border-dashed border-zinc-300 bg-zinc-50/60',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden
                      className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-white px-2 shadow-sm ring-1 ring-zinc-200"
                    >
                      <OperatorLogo
                        src={meta.logo}
                        label={meta.label}
                        initial={meta.brandInitial}
                        bg={meta.brandBg}
                        imgClassName="max-h-7 w-auto max-w-14 object-contain"
                        className="size-7 rounded-lg text-sm"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{meta.label}</span>
                      <span className="mt-0.5 block">
                        <PaymentMethodBadge method={meta.id} />
                      </span>
                    </span>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={cn('text-xs font-semibold', d.enabled ? 'text-emerald-700' : 'text-zinc-400')}>
                      {d.enabled ? 'Activé' : 'Coupé'}
                    </span>
                    <Switch checked={d.enabled} onChange={(v) => patch(meta.id, { enabled: v })} label={`Activer ${meta.label}`} />
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Input
                    label="Numéro marchand"
                    placeholder="+261 …"
                    value={d.number}
                    onChange={(e) => patch(meta.id, { number: e.target.value })}
                  />
                  <Input
                    label="Bénéficiaire"
                    placeholder="Giga Vibe Event"
                    value={d.name}
                    onChange={(e) => patch(meta.id, { name: e.target.value })}
                  />
                </div>
                <p className="mt-2 text-[11px] text-zinc-400">{meta.hint} · {meta.prefixHint}</p>
              </div>
            );
          })}
          <SaveBar dirty={dirty} saving={saving} onSave={save} />
          {feedback && <FormFeedback tone={feedback.tone} message={feedback.message} />}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Money — préfixes + instructions par opérateur (P1)          */
/* ------------------------------------------------------------------ */

function OperatorPrefsCard() {
  const settings = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [draft, setDraft] = useState<Record<ConfigPaymentMethodId, { prefixes: string; instructions: string }> | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'ko'; message: string } | null>(null);

  useEffect(() => {
    if (settings.data && draft === null) {
      setDraft({
        yas: { prefixes: settings.data.paymentPrefixes.yas, instructions: settings.data.paymentInstructions.yas },
        orange_money: { prefixes: settings.data.paymentPrefixes.orange_money, instructions: settings.data.paymentInstructions.orange_money },
        airtel_money: { prefixes: settings.data.paymentPrefixes.airtel_money, instructions: settings.data.paymentInstructions.airtel_money },
      });
    }
  }, [settings.data, draft]);

  const patch = (id: ConfigPaymentMethodId, p: Partial<{ prefixes: string; instructions: string }>) => {
    setDraft((d) => (d ? { ...d, [id]: { ...d[id], ...p } } : d));
    setDirty(true);
    setFeedback(null);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setFeedback(null);
    try {
      const map: [ConfigPaymentMethodId, 'yas' | 'orange' | 'airtel'][] = [
        ['yas', 'yas'],
        ['orange_money', 'orange'],
        ['airtel_money', 'airtel'],
      ];
      for (const [id, short] of map) {
        await updateSetting.mutateAsync({ key: `payment_${short}_prefixes`, value: JSON.stringify(draft[id].prefixes.trim() || '0') });
        await updateSetting.mutateAsync({ key: `payment_instructions_${short}`, value: JSON.stringify(draft[id].instructions.trim()) });
      }
      setDirty(false);
      setFeedback({ tone: 'ok', message: 'Préfixes & instructions enregistrés.' });
    } catch (err) {
      setFeedback({ tone: 'ko', message: err instanceof Error ? err.message : 'Enregistrement impossible.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <SectionHeader
        icon={Smartphone}
        title="Préfixes & instructions opérateurs"
        description="Préfixes nationaux (contrôle doux) et aide USSD affichée dans le tunnel d’achat."
        tone="bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sky-600/30"
      />
      {settings.isPending || !draft ? (
        <CardSkeleton lines={3} />
      ) : (
        <div className="mt-4 space-y-3">
          {PAYMENT_METHODS.map((meta) => {
            const d = draft[meta.id];
            return (
              <div key={meta.id} className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-sm font-bold">{meta.label}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Input label="Préfixes (séparés par virgule)" placeholder="034,038" value={d.prefixes} onChange={(e) => patch(meta.id, { prefixes: e.target.value })} />
                  <Input label="Instruction USSD / aide" placeholder="Ex. : composez *144#…" value={d.instructions} onChange={(e) => patch(meta.id, { instructions: e.target.value })} />
                </div>
              </div>
            );
          })}
          <SaveBar dirty={dirty} saving={saving} onSave={save} />
          {feedback && <FormFeedback tone={feedback.tone} message={feedback.message} />}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Onglet 3 — Site & billetterie                                      */
/* ------------------------------------------------------------------ */

function SiteSettingsCard() {
  const settings = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [draft, setDraft] = useState<{
    currency: string;
    expiry: string;
    instructions: string;
    maintenance: boolean;
    maintenanceMessage: string;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'ko'; message: string } | null>(null);

  useEffect(() => {
    if (settings.data && draft === null) {
      setDraft({
        currency: settings.data.currency,
        expiry: String(settings.data.orderExpiryMinutes),
        instructions: settings.data.checkoutInstructions,
        maintenance: settings.data.maintenanceMode,
        maintenanceMessage: settings.data.maintenanceMessage,
      });
    }
  }, [settings.data, draft]);

  const patch = (p: Partial<NonNullable<typeof draft>>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
    setFeedback(null);
  };

  const save = async () => {
    if (!draft) return;
    const currency = draft.currency.trim().toUpperCase();
    const expiry = Math.min(1440, Math.max(5, Number(draft.expiry) || 30));
    if (!/^[A-Z]{3}$/.test(currency)) {
      setFeedback({ tone: 'ko', message: 'Devise invalide : code ISO à 3 lettres (ex. MGA).' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const entries: [string, string][] = [
        ['currency', JSON.stringify(currency)],
        ['order_expiry_minutes', String(expiry)],
        ['checkout_instructions', JSON.stringify(draft.instructions.trim())],
        ['maintenance_mode', JSON.stringify(draft.maintenance)],
        ['maintenance_message', JSON.stringify(draft.maintenanceMessage.trim() || 'Site en maintenance.')],
      ];
      for (const [key, value] of entries) {
        await updateSetting.mutateAsync({ key, value });
      }
      setDirty(false);
      setFeedback({ tone: 'ok', message: 'Réglages du site enregistrés.' });
    } catch (err) {
      setFeedback({ tone: 'ko', message: err instanceof Error ? err.message : 'Enregistrement impossible.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-5">
      {/* ---- Colonne billetterie ---- */}
      <Card className="p-4 sm:p-6 xl:col-span-3">
        <SectionHeader
          icon={Coins}
          title="Billetterie"
          description="Devise affichée, durée de réservation et message du tunnel d'achat."
          tone="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30"
        />
        {settings.isPending || !draft ? (
          <CardSkeleton lines={4} />
        ) : (
          <div className="mt-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-end justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Devise</p>
                  <p className="font-display text-2xl font-black tracking-tight">
                    {draft.currency || '—'}
                    <span className="ml-1 align-middle text-xs font-semibold text-zinc-400">
                      {draft.currency === 'MGA' ? 'Ariary' : 'ISO'}
                    </span>
                  </p>
                </div>
                <Input
                  label="Devise (code ISO)"
                  placeholder="MGA"
                  maxLength={3}
                  value={draft.currency}
                  onChange={(e) => patch({ currency: e.target.value.toUpperCase() })}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['MGA', 'EUR', 'USD'].map((c) => {
                    const active = draft.currency === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => patch({ currency: c })}
                        aria-pressed={active}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                          active
                            ? 'border-zinc-900 bg-zinc-950 text-white shadow'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
                        )}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="flex items-end justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Réservation</p>
                  <p className="font-display text-2xl font-black tabular-nums tracking-tight">
                    {(() => {
                      const m = Math.round(Number(draft.expiry) || 0);
                      if (m >= 60) {
                        const h = Math.floor(m / 60);
                        const r = m % 60;
                        return `${h}h${r === 0 ? '00' : String(r).padStart(2, '0')}`;
                      }
                      return `${m} min`;
                    })()}
                  </p>
                </div>
                <Input
                  label="Expiration commande (minutes)"
                  type="number"
                  min={5}
                  max={1440}
                  value={draft.expiry}
                  onChange={(e) => patch({ expiry: e.target.value })}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[15, 30, 60, 120, 240].map((m) => {
                    const active = Number(draft.expiry) === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => patch({ expiry: String(m) })}
                        aria-pressed={active}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-bold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                          active
                            ? 'border-zinc-900 bg-zinc-950 text-white shadow'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
                        )}
                      >
                        {m >= 60 ? `${m / 60}h` : `${m} min`}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-400">
                  <Timer className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Entre 5 et 1440 minutes. Lue par create_checkout_order à chaque commande.
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <MessageSquare className="size-3.5" aria-hidden /> Instructions du tunnel
                </p>
                <span className="text-[11px] tabular-nums text-zinc-400">{draft.instructions.trim().length} caractères</span>
              </div>
              <Textarea
                label="Instructions affichées dans le tunnel d'achat (vide = masqué)"
                rows={4}
                placeholder="Ex. : Envoyez le montant exact au numéro marchand, puis déclarez la référence…"
                value={draft.instructions}
                onChange={(e) => patch({ instructions: e.target.value })}
              />
              <div className={cn(
                'mt-2 rounded-2xl border p-3 text-xs leading-relaxed',
                draft.instructions.trim()
                  ? 'border-blue-200 bg-blue-50/70 text-blue-900'
                  : 'border-dashed border-zinc-300 bg-zinc-50 text-zinc-400',
              )}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-70">Aperçu acheteur</p>
                {draft.instructions.trim() || 'Masqué (champ vide = aucune consigne affichée).'}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ---- Colonne maintenance + aperçu ---- */}
      <div className="space-y-4 xl:col-span-2">
        <Card className={cn('p-4 sm:p-6', draft?.maintenance ? 'border-amber-300 bg-amber-50/50' : '')}>
          <SectionHeader
            icon={Lock}
            title="Maintenance"
            description="Masque le site public. /login reste ouvert, les admins passent toujours."
            tone="bg-gradient-to-br from-zinc-700 to-zinc-950 shadow-zinc-900/30"
          />
          {settings.isPending || !draft ? (
            <CardSkeleton lines={2} />
          ) : (
            <div className="mt-4 space-y-3">
              <div className={cn(
                'flex items-center justify-between gap-3 rounded-2xl border p-4 transition',
                draft.maintenance ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-white',
              )}>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                    Mode maintenance
                    <Badge tone={draft.maintenance ? 'warning' : 'success'}>
                      {draft.maintenance ? 'Actif' : 'En ligne'}
                    </Badge>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Visible immédiatement après enregistrement.</p>
                </div>
                <Switch checked={draft.maintenance} onChange={(v) => patch({ maintenance: v })} label="Activer le mode maintenance" />
              </div>
              {draft.maintenance ? (
                <Textarea
                  label="Message de maintenance"
                  rows={3}
                  value={draft.maintenanceMessage}
                  onChange={(e) => patch({ maintenanceMessage: e.target.value })}
                />
              ) : (
                <p className="rounded-xl bg-zinc-50 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                  Activez pour afficher une page de maintenance publique avec votre message personnalisé.
                </p>
              )}
            </div>
          )}
        </Card>

        <div className="relative overflow-hidden rounded-2xl bg-zinc-950 p-5 text-white shadow-lg">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-amber-500/20 blur-3xl" />
          </div>
          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">
              <Globe className="size-3.5" aria-hidden /> Aperçu tunnel
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-300">
                <dt>Devise</dt>
                <dd className="font-bold">{draft?.currency || '—'}</dd>
              </div>
              <div className="flex justify-between text-zinc-300">
                <dt>Réservation</dt>
                <dd className="font-bold tabular-nums">{draft?.expiry || '—'} min</dd>
              </div>
              <div className="flex justify-between text-zinc-300">
                <dt>Consignes</dt>
                <dd className="font-bold">{draft?.instructions.trim() ? 'Visibles' : 'Masquées'}</dd>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-zinc-300">
                <dt>État du site</dt>
                <dd className={cn('font-bold', draft?.maintenance ? 'text-amber-300' : 'text-emerald-300')}>
                  {draft?.maintenance ? 'Maintenance' : 'En ligne'}
                </dd>
              </div>
            </dl>
            {draft?.maintenance && draft.maintenanceMessage.trim() && (
              <p className="mt-3 rounded-xl bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
                « {draft.maintenanceMessage.trim().slice(0, 120)}{draft.maintenanceMessage.trim().length > 120 ? '…' : ''} »
              </p>
            )}
          </div>
        </div>

        <SaveBar dirty={dirty} saving={saving} onSave={save} idleText="Réglages à jour." dirtyText="Aperçu non enregistré." />
        {feedback && <FormFeedback tone={feedback.tone} message={feedback.message} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Onglet — Tarifs & limites (P0)                                     */
/* ------------------------------------------------------------------ */

const FEES_PAYER_OPTIONS = [
  { value: 'buyer', title: 'Acheteur', description: 'Frais ajoutés au total client.', icon: User },
  { value: 'organizer', title: 'Organisateur', description: 'Frais déduits côté organisateur.', icon: Building2 },
  { value: 'split', title: 'Partagés', description: 'Moitié / moitié (indicatif).', icon: Users },
] as const;

const FEE_PRESETS = [0, 500, 1000, 2000, 5000];

function PricingCard() {
  const settings = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [draft, setDraft] = useState<{
    feeFixed: string;
    payer: string;
    maxPerType: string;
    maxLines: string;
    maxTotal: string;
    minAmount: string;
    feeCap: string;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'ko'; message: string } | null>(null);

  useEffect(() => {
    if (settings.data && draft === null) {
      setDraft({
        feeFixed: String(settings.data.serviceFeeFixed),
        payer: settings.data.feesPayer,
        maxPerType: String(settings.data.maxTicketsPerType),
        maxLines: String(settings.data.maxLinesPerOrder),
        maxTotal: String(settings.data.maxTicketsPerOrder),
        minAmount: String(settings.data.minOrderAmount),
        feeCap: String(settings.data.serviceFeeCap),
      });
    }
  }, [settings.data, draft]);

  const patch = (p: Partial<NonNullable<typeof draft>>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
    setFeedback(null);
  };

  const save = async () => {
    if (!draft) return;
    const feeFixed = Math.min(100000, Math.max(0, Math.round(Number(draft.feeFixed) || 0)));
    const maxPerType = Math.min(50, Math.max(1, Math.round(Number(draft.maxPerType) || 10)));
    const maxLines = Math.min(50, Math.max(1, Math.round(Number(draft.maxLines) || 10)));
    const maxTotal = Math.min(200, Math.max(1, Math.round(Number(draft.maxTotal) || 20)));
    const minAmount = Math.min(1000000, Math.max(0, Math.round(Number(draft.minAmount) || 0)));
    const feeCap = Math.min(1000000, Math.max(0, Math.round(Number(draft.feeCap) || 0)));
    if (!['buyer', 'organizer', 'split'].includes(draft.payer)) {
      setFeedback({ tone: 'ko', message: 'Qui paie invalide.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const entries: [string, string][] = [
        ['service_fee_fixed', String(feeFixed)],
        ['fees_payer', JSON.stringify(draft.payer)],
        ['max_tickets_per_type', String(maxPerType)],
        ['max_lines_per_order', String(maxLines)],
        ['max_tickets_per_order', String(maxTotal)],
        ['min_order_amount', String(minAmount)],
        ['service_fee_cap', String(feeCap)],
      ];
      for (const [key, value] of entries) {
        await updateSetting.mutateAsync({ key, value });
      }
      setDirty(false);
      setFeedback({ tone: 'ok', message: 'Tarifs & limites enregistrés. Appliqués aux prochaines commandes.' });
    } catch (err) {
      setFeedback({ tone: 'ko', message: err instanceof Error ? err.message : 'Enregistrement impossible.' });
    } finally {
      setSaving(false);
    }
  };

  const preview = useMemo(() => {
    if (!draft) return null;
    const fee = Math.min(100000, Math.max(0, Math.round(Number(draft.feeFixed) || 0)));
    const cap = Math.min(1000000, Math.max(0, Math.round(Number(draft.feeCap) || 0)));
    const min = Math.min(1000000, Math.max(0, Math.round(Number(draft.minAmount) || 0)));
    const qty = 2;
    const price = 15000;
    const subtotal = qty * price;
    const rawFees = fee * qty;
    const fees = cap > 0 ? Math.min(rawFees, cap) : rawFees;
    const total = subtotal + fees;
    return { qty, price, subtotal, rawFees, fees, total, min, capped: cap > 0 && rawFees > cap };
  }, [draft]);

  return (
    <div className="grid items-start gap-4 xl:grid-cols-5">
      {/* ---- Colonne frais ---- */}
      <Card className="p-4 sm:p-6 xl:col-span-3">
        <SectionHeader
          icon={Wallet}
          title="Frais de service"
          description="Montant prélevé par billet et qui le supporte. Appliqué aux prochaines commandes."
          tone="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/30"
        />
        {settings.isPending || !draft ? (
          <CardSkeleton lines={4} />
        ) : (
          <div className="mt-4 space-y-5">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Frais par billet</p>
                <p className="font-display text-3xl font-black tabular-nums tracking-tight">
                  {formatAr(Math.max(0, Math.round(Number(draft.feeFixed) || 0)))}
                </p>
              </div>
              <Input
                label="Frais fixes par billet (Ar)"
                type="number"
                min={0}
                max={100000}
                value={draft.feeFixed}
                onChange={(e) => patch({ feeFixed: e.target.value })}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FEE_PRESETS.map((p) => {
                  const active = Number(draft.feeFixed) === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => patch({ feeFixed: String(p) })}
                      aria-pressed={active}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-bold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                        active
                          ? 'border-zinc-900 bg-zinc-950 text-white shadow'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
                      )}
                    >
                      {p === 0 ? 'Gratuit' : formatAr(p)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Qui paie les frais</p>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Qui paie les frais">
                {FEES_PAYER_OPTIONS.map((o) => {
                  const selected = draft.payer === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => patch({ payer: o.value })}
                      className={cn(
                        'group rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                        selected
                          ? 'border-zinc-900 bg-zinc-950 text-white shadow-lg'
                          : 'border-zinc-200 bg-white hover:-translate-y-px hover:border-zinc-300 hover:shadow-md',
                      )}
                    >
                      <span className={cn(
                        'grid size-9 place-items-center rounded-xl transition',
                        selected ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200',
                      )}>
                        <o.icon className="size-4" aria-hidden />
                      </span>
                      <span className={cn('mt-2 block text-sm font-bold', selected ? 'text-white' : 'text-zinc-900')}>
                        {o.title}
                      </span>
                      <span className={cn('mt-0.5 block text-[11px] leading-snug', selected ? 'text-zinc-300' : 'text-zinc-500')}>
                        {o.description}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'mt-2 grid size-5 place-items-center rounded-full border-2 transition',
                          selected ? 'border-emerald-400 bg-emerald-400 text-zinc-950' : 'border-zinc-300 text-transparent',
                        )}
                      >
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl bg-zinc-50 p-4 sm:grid-cols-2">
              <Input
                label="Panier minimum (Ar)"
                type="number"
                min={0}
                max={1000000}
                value={draft.minAmount}
                onChange={(e) => patch({ minAmount: e.target.value })}
                hint="0 = pas de minimum"
              />
              <Input
                label="Plafond frais / commande (Ar)"
                type="number"
                min={0}
                max={1000000}
                value={draft.feeCap}
                onChange={(e) => patch({ feeCap: e.target.value })}
                hint="0 = pas de plafond"
              />
            </div>
          </div>
        )}
      </Card>

      {/* ---- Colonne limites + simulation ---- */}
      <div className="space-y-4 xl:col-span-2">
        <Card className="p-4 sm:p-6">
          <SectionHeader
            icon={ShieldCheck}
            title="Limites anti-scalping"
            description="Plafonds du panier, lus par create_checkout_order."
            tone="bg-gradient-to-br from-brand-600 to-brand-800 shadow-brand-600/30"
          />
          {settings.isPending || !draft ? (
            <CardSkeleton lines={3} />
          ) : (
            <div className="mt-4 space-y-2">
              {([
                ['maxPerType', 'Par type de billet', '1 – 50', '10 max / VIP par ex.'],
                ['maxLines', 'Lignes par commande', '1 – 50', '10 types différents max'],
                ['maxTotal', 'Billets par commande', '1 – 200', '20 billets max au total'],
              ] as const).map(([key, label, range, hint]) => (
                <div key={key} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{label}</p>
                    <p className="text-[11px] text-zinc-400">{hint} · {range}</p>
                  </div>
                  <input
                    type="number"
                    aria-label={label}
                    min={key === 'maxTotal' ? 1 : 1}
                    max={key === 'maxTotal' ? 200 : 50}
                    value={draft[key]}
                    onChange={(e) => patch({ [key]: e.target.value } as Partial<NonNullable<typeof draft>>)}
                    className="h-10 w-20 rounded-xl border border-zinc-300 bg-white px-2 text-center text-sm font-bold tabular-nums outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
              ))}
              <p className="flex items-start gap-1.5 rounded-xl bg-blue-50 px-3 py-2.5 text-[11px] leading-relaxed text-blue-800">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Le backend refuse tout panier hors limites avec un message explicite (ex. « max 10 par type »).
              </p>
            </div>
          )}
        </Card>

        <div className="relative overflow-hidden rounded-2xl bg-zinc-950 p-5 text-white shadow-lg">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-brand-600/30 blur-3xl" />
          </div>
          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">
              <Calculator className="size-3.5" aria-hidden /> Simulation live · 2 × 15 000 Ar
            </p>
            {preview ? (
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-zinc-300">
                  <dt>Sous-total</dt>
                  <dd className="tabular-nums">{formatAr(preview.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <dt>
                    Frais {preview.capped ? '(plafonnés)' : ''}
                  </dt>
                  <dd className="tabular-nums">{formatAr(preview.fees)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-white/10 pt-2">
                  <dt className="font-bold">Total client</dt>
                  <dd className="font-display text-2xl font-black tabular-nums">{formatAr(preview.total)}</dd>
                </div>
              </dl>
            ) : (
              <div aria-hidden className="skeleton mt-3 h-20 w-full rounded-xl" />
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
              {draft?.payer === 'organizer'
                ? 'Le client paie le sous-total, les frais sont absorbés par l’organisateur.'
                : draft?.payer === 'split'
                  ? 'Frais partagés entre client et organisateur (indicatif).'
                  : 'Les frais s’ajoutent au total payé par le client.'}
              {preview && preview.min > 0 && ` · Minimum ${formatAr(preview.min)}.`}
            </p>
          </div>
        </div>

        <SaveBar dirty={dirty} saving={saving} onSave={save} idleText="Tarifs à jour." dirtyText="Simulation non enregistrée." />
        {feedback && <FormFeedback tone={feedback.tone} message={feedback.message} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Onglet — Site & contact (P0)                                       */
/* ------------------------------------------------------------------ */

function ContactCard() {
  const settings = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [draft, setDraft] = useState<{
    siteName: string;
    logoUrl: string;
    email: string;
    phone: string;
    ticketPrefix: string;
    orderPrefix: string;
    uploadMb: string;
    confirmExpiry: string;
    resetExpiry: string;
    inviteDays: string;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'ko'; message: string } | null>(null);

  useEffect(() => {
    if (settings.data && draft === null) {
      setDraft({
        siteName: settings.data.siteName,
        logoUrl: settings.data.siteLogoUrl,
        email: settings.data.contactEmail,
        phone: settings.data.contactPhone,
        ticketPrefix: settings.data.ticketNumberPrefix,
        orderPrefix: settings.data.orderNumberPrefix,
        uploadMb: String(settings.data.uploadMaxSizeMb),
        confirmExpiry: String(settings.data.authConfirmExpiryMinutes),
        resetExpiry: String(settings.data.authResetExpiryMinutes),
        inviteDays: String(settings.data.invitationExpiryDays),
      });
    }
  }, [settings.data, draft]);

  const patch = (p: Partial<NonNullable<typeof draft>>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
    setFeedback(null);
  };

  const save = async () => {
    if (!draft) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) {
      setFeedback({ tone: 'ko', message: 'Email de contact invalide.' });
      return;
    }
    if (draft.phone.trim().length < 8) {
      setFeedback({ tone: 'ko', message: 'Téléphone de contact invalide.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const entries: [string, string][] = [
        ['site_name', JSON.stringify(draft.siteName.trim() || 'Giga Vibe Event')],
        ['site_logo_url', JSON.stringify(draft.logoUrl.trim() || '/logo.jpeg')],
        ['contact_email', JSON.stringify(draft.email.trim())],
        ['contact_phone', JSON.stringify(draft.phone.trim())],
        ['ticket_number_prefix', JSON.stringify(draft.ticketPrefix || 'GVE-')],
        ['order_number_prefix', JSON.stringify(draft.orderPrefix || 'ORDER-')],
        ['upload_max_size_mb', String(Math.min(50, Math.max(1, Math.round(Number(draft.uploadMb) || 5))))],
        ['auth_confirm_expiry_minutes', String(Math.min(1440, Math.max(5, Math.round(Number(draft.confirmExpiry) || 60))))],
        ['auth_reset_expiry_minutes', String(Math.min(1440, Math.max(5, Math.round(Number(draft.resetExpiry) || 30))))],
        ['invitation_expiry_days', String(Math.min(30, Math.max(1, Math.round(Number(draft.inviteDays) || 7))))],
      ];
      for (const [key, value] of entries) {
        await updateSetting.mutateAsync({ key, value });
      }
      setDirty(false);
      setFeedback({ tone: 'ok', message: 'Site & contact enregistrés.' });
    } catch (err) {
      setFeedback({ tone: 'ko', message: err instanceof Error ? err.message : 'Enregistrement impossible.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-5">
      {/* ---- Colonne identité ---- */}
      <Card className="p-4 sm:p-6 xl:col-span-3">
        <SectionHeader
          icon={ImageIcon}
          title="Identité & contact"
          description="Nom du site, logo et coordonnées reprises sur la page Contact et le footer."
          tone="bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sky-600/30"
        />
        {settings.isPending || !draft ? (
          <CardSkeleton lines={4} />
        ) : (
          <div className="mt-4 space-y-5">
            <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
                {draft.logoUrl.trim() ? (
                  <img src={draft.logoUrl.trim()} alt="Aperçu du logo" className="max-h-12 w-auto max-w-16 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <ImageIcon className="size-6 text-zinc-300" aria-hidden />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-black tracking-tight">{draft.siteName.trim() || 'Nom du site'}</p>
                <p className="truncate text-xs text-zinc-500">{draft.logoUrl.trim() || 'Aucun logo configuré'}</p>
              </div>
              <Badge tone="info">Aperçu</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Nom du site" value={draft.siteName} onChange={(e) => patch({ siteName: e.target.value })} placeholder="Giga Vibe Event" />
              <Input label="URL du logo" placeholder="/logo.jpeg" value={draft.logoUrl} onChange={(e) => patch({ logoUrl: e.target.value })} hint="Public : /logo.jpeg ou https://…" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Input label="Email de contact" type="email" value={draft.email} onChange={(e) => patch({ email: e.target.value })} placeholder="contact@ticket.mg" />
                {draft.email.trim() && (
                  <a href={`mailto:${draft.email.trim()}`} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline">
                    <AtSign className="size-3" aria-hidden /> Tester le mailto
                  </a>
                )}
              </div>
              <div>
                <Input label="Téléphone de contact" value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="+261 34 …" />
                {draft.phone.trim().length >= 8 && (
                  <a href={`tel:${draft.phone.replace(/[\s-]/g, '')}`} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline">
                    <Phone className="size-3" aria-hidden /> {draft.phone.trim()}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ---- Colonne numérotation + accès ---- */}
      <div className="space-y-4 xl:col-span-2">
        <Card className="p-4 sm:p-6">
          <SectionHeader
            icon={Hash}
            title="Numérotation"
            description="Préfixes des billets et commandes à venir."
            tone="bg-gradient-to-br from-zinc-700 to-zinc-950 shadow-zinc-900/30"
          />
          {settings.isPending || !draft ? (
            <CardSkeleton lines={2} />
          ) : (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Préfixe billets" placeholder="GVE-" value={draft.ticketPrefix} onChange={(e) => patch({ ticketPrefix: e.target.value })} />
                <Input label="Préfixe commandes" placeholder="ORDER-" value={draft.orderPrefix} onChange={(e) => patch({ orderPrefix: e.target.value })} />
              </div>
              <div className="grid gap-2 rounded-2xl bg-zinc-950 p-4 font-mono text-xs text-white">
                <p className="flex justify-between gap-2">
                  <span className="text-zinc-400">Billet</span>
                  <strong className="tabular-nums">{(draft.ticketPrefix || 'GVE-') + '000123'}</strong>
                </p>
                <p className="flex justify-between gap-2 border-t border-white/10 pt-2">
                  <span className="text-zinc-400">Commande</span>
                  <strong className="tabular-nums">{(draft.orderPrefix || 'ORDER-') + new Date().getFullYear() + '-000123'}</strong>
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-6">
          <SectionHeader
            icon={KeyRound}
            title="Uploads & liens"
            description="Taille max des images et durée de vie des liens."
            tone="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30"
          />
          {settings.isPending || !draft ? (
            <CardSkeleton lines={3} />
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <Input label="Upload max (Mo)" type="number" min={1} max={50} value={draft.uploadMb} onChange={(e) => patch({ uploadMb: e.target.value })} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[2, 5, 10, 20].map((m) => {
                    const active = Number(draft.uploadMb) === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => patch({ uploadMb: String(m) })}
                        aria-pressed={active}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-bold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                          active
                            ? 'border-zinc-900 bg-zinc-950 text-white shadow'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
                        )}
                      >
                        {m} Mo
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Invitations (j)" type="number" min={1} max={30} value={draft.inviteDays} onChange={(e) => patch({ inviteDays: e.target.value })} />
                <Input label="Confirm. (min)" type="number" min={5} max={1440} value={draft.confirmExpiry} onChange={(e) => patch({ confirmExpiry: e.target.value })} />
                <Input label="Reset (min)" type="number" min={5} max={1440} value={draft.resetExpiry} onChange={(e) => patch({ resetExpiry: e.target.value })} />
              </div>
              <p className="flex items-start gap-1.5 rounded-xl bg-zinc-50 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-500">
                <Upload className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Reçus Mobile Money, logos et affiches : JPEG / PNG / WebP uniquement.
              </p>
            </div>
          )}
        </Card>

        <SaveBar dirty={dirty} saving={saving} onSave={save} idleText="Site & contact à jour." dirtyText="Aperçu non enregistré." />
        {feedback && <FormFeedback tone={feedback.tone} message={feedback.message} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Onglet — Contenu & SEO (P1)                                        */
/* ------------------------------------------------------------------ */

function ContentSeoTab() {
  const settings = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [draft, setDraft] = useState<{
    refund: string;
    terms: string;
    seoTitle: string;
    seoDesc: string;
    seoOg: string;
    seoKw: string;
    fb: string;
    ig: string;
    tiktok: string;
    wa: string;
    yt: string;
    brand: string;
    footer: string;
    support: string;
    nVal: boolean;
    nRej: boolean;
    nPub: boolean;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'ko'; message: string } | null>(null);

  useEffect(() => {
    if (settings.data && draft === null) {
      setDraft({
        refund: settings.data.refundPolicyText,
        terms: settings.data.termsUrl,
        seoTitle: settings.data.seoSiteTitle,
        seoDesc: settings.data.seoSiteDescription,
        seoOg: settings.data.seoOgImageUrl,
        seoKw: settings.data.seoKeywords,
        fb: settings.data.socialFacebookUrl,
        ig: settings.data.socialInstagramUrl,
        tiktok: settings.data.socialTiktokUrl,
        wa: settings.data.socialWhatsapp,
        yt: settings.data.socialYoutubeUrl,
        brand: settings.data.emailBrandName,
        footer: settings.data.emailFooterText,
        support: settings.data.emailSupportUrl,
        nVal: settings.data.notifyPaymentValidated,
        nRej: settings.data.notifyPaymentRejected,
        nPub: settings.data.notifyEventPublished,
      });
    }
  }, [settings.data, draft]);

  const patch = (p: Partial<NonNullable<typeof draft>>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
    setFeedback(null);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setFeedback(null);
    try {
      const entries: [string, string][] = [
        ['refund_policy_text', JSON.stringify(draft.refund.trim() || 'En cas d’annulation, remboursement automatique.')],
        ['terms_url', JSON.stringify(draft.terms.trim() || '/cgu')],
        ['seo_site_title', JSON.stringify(draft.seoTitle.trim())],
        ['seo_site_description', JSON.stringify(draft.seoDesc.trim())],
        ['seo_og_image_url', JSON.stringify(draft.seoOg.trim() || '/logo.jpeg')],
        ['seo_keywords', JSON.stringify(draft.seoKw.trim())],
        ['social_facebook_url', JSON.stringify(draft.fb.trim())],
        ['social_instagram_url', JSON.stringify(draft.ig.trim())],
        ['social_tiktok_url', JSON.stringify(draft.tiktok.trim())],
        ['social_whatsapp', JSON.stringify(draft.wa.trim())],
        ['social_youtube_url', JSON.stringify(draft.yt.trim())],
        ['email_brand_name', JSON.stringify(draft.brand.trim() || 'Giga Vibe Event')],
        ['email_footer_text', JSON.stringify(draft.footer.trim())],
        ['email_support_url', JSON.stringify(draft.support.trim() || '/contact')],
        ['notify_payment_validated', JSON.stringify(draft.nVal)],
        ['notify_payment_rejected', JSON.stringify(draft.nRej)],
        ['notify_event_published', JSON.stringify(draft.nPub)],
      ];
      for (const [key, value] of entries) {
        await updateSetting.mutateAsync({ key, value });
      }
      setDirty(false);
      setFeedback({ tone: 'ok', message: 'Contenu & SEO enregistrés.' });
    } catch (err) {
      setFeedback({ tone: 'ko', message: err instanceof Error ? err.message : 'Enregistrement impossible.' });
    } finally {
      setSaving(false);
    }
  };

  if (settings.isPending || !draft) {
    return (
      <Card className="p-4 sm:p-6">
        <SectionHeader icon={Megaphone} title="Contenu & SEO" description="Remboursement, CGU, SEO, réseaux sociaux, emails." tone="bg-gradient-to-br from-brand-600 to-brand-800 shadow-brand-600/30" />
        <CardSkeleton lines={6} />
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-5">
      {/* ---- Colonne SEO + contenu ---- */}
      <div className="space-y-4 xl:col-span-3">
        <Card className="p-4 sm:p-6">
          <SectionHeader icon={Search} title="SEO & partages" description="Titre, description, image Open Graph et mots-clés." tone="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30" />
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Titre · idéal ≤ 60</p>
                <span className={cn('text-[11px] font-bold tabular-nums', draft.seoTitle.trim().length > 60 ? 'text-amber-600' : 'text-zinc-400')}>
                  {draft.seoTitle.trim().length}/60
                </span>
              </div>
              <Input label="Titre SEO" value={draft.seoTitle} onChange={(e) => patch({ seoTitle: e.target.value })} />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Description · idéal ≤ 160</p>
                <span className={cn('text-[11px] font-bold tabular-nums', draft.seoDesc.trim().length > 160 ? 'text-amber-600' : 'text-zinc-400')}>
                  {draft.seoDesc.trim().length}/160
                </span>
              </div>
              <Textarea label="Description SEO" rows={3} value={draft.seoDesc} onChange={(e) => patch({ seoDesc: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Image OG (URL)" value={draft.seoOg} onChange={(e) => patch({ seoOg: e.target.value })} placeholder="/logo.jpeg" />
              <Input label="Mots-clés (virgules)" value={draft.seoKw} onChange={(e) => patch({ seoKw: e.target.value })} />
            </div>
            {/* Aperçu Google */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Aperçu Google</p>
              <div className="flex items-start gap-3">
                {draft.seoOg.trim() && (
                  <img src={draft.seoOg.trim()} alt="" aria-hidden className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-zinc-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-zinc-500">{new URL(draft.support.startsWith('http') ? draft.support : 'https://giga-vibe-event.vercel.app').hostname || 'giga-vibe-event.vercel.app'}</p>
                  <p className="truncate text-base font-medium text-[#1a0dab]">{draft.seoTitle.trim() || 'Titre SEO'}</p>
                  <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-zinc-600">{draft.seoDesc.trim() || 'Description SEO…'}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <SectionHeader icon={FileText} title="Contenu billetterie" description="Texte de remboursement et lien CGU dans le tunnel." tone="bg-gradient-to-br from-brand-600 to-brand-800 shadow-brand-600/30" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input label="Politique de remboursement" value={draft.refund} onChange={(e) => patch({ refund: e.target.value })} hint="Affichée page événement" />
            <Input label="URL des CGU" placeholder="/cgu" value={draft.terms} onChange={(e) => patch({ terms: e.target.value })} hint="Lien footer + tunnel" />
          </div>
          <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-500">
            « {draft.refund.trim().slice(0, 90) || '…'} » · CGU : <span className="font-mono">{draft.terms.trim() || '/cgu'}</span>
          </p>
        </Card>
      </div>

      {/* ---- Colonne social + emails ---- */}
      <div className="space-y-4 xl:col-span-2">
        <Card className="p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <SectionHeader icon={Share2} title="Réseaux sociaux" description="Vide = lien masqué dans le footer." tone="bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sky-600/30" />
            <Badge tone={(draft.fb || draft.ig || draft.tiktok || draft.wa || draft.yt) ? 'success' : 'neutral'}>
              {[draft.fb, draft.ig, draft.tiktok, draft.wa, draft.yt].filter((v) => v.trim()).length}/5 actifs
            </Badge>
          </div>
          <div className="mt-4 space-y-2">
            {([
              ['fb', 'Facebook', 'https://facebook.com/…'],
              ['ig', 'Instagram', 'https://instagram.com/…'],
              ['tiktok', 'TikTok', 'https://tiktok.com/…'],
              ['yt', 'YouTube', 'https://youtube.com/…'],
              ['wa', 'WhatsApp', '+261 …'],
            ] as const).map(([key, label, ph]) => {
              const val = draft[key];
              const on = val.trim().length > 0;
              return (
                <div key={key} className={cn('flex items-center gap-2 rounded-2xl border p-2.5 transition', on ? 'border-zinc-200 bg-white' : 'border-dashed border-zinc-300 bg-zinc-50/60')}>
                  <span aria-hidden className={cn('size-2 shrink-0 rounded-full', on ? 'bg-emerald-500' : 'bg-zinc-300')} />
                  <div className="min-w-0 flex-1">
                    <Input label={label} placeholder={ph} value={val} onChange={(e) => patch({ [key]: e.target.value } as Partial<NonNullable<typeof draft>>)} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <SectionHeader icon={Bell} title="Emails & notifications" description="Textes non sensibles + toggles (clés API côté serveur)." tone="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/30" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input label="Marque (emails)" value={draft.brand} onChange={(e) => patch({ brand: e.target.value })} />
            <Input label="URL support" value={draft.support} onChange={(e) => patch({ support: e.target.value })} />
          </div>
          <div className="mt-3">
            <Input label="Pied de page (emails)" value={draft.footer} onChange={(e) => patch({ footer: e.target.value })} />
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200">
            <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
              <p className="text-sm font-bold">{draft.brand.trim() || 'Marque'}</p>
              <p className="truncate text-[11px] text-zinc-400">{draft.footer.trim() || 'Pied de page…'}</p>
            </div>
            <div className="divide-y divide-zinc-100">
              {([
                ['nVal', 'Paiement validé', 'Billet envoyé après validation', draft.nVal],
                ['nRej', 'Paiement refusé', 'Motif envoyé au client', draft.nRej],
                ['nPub', 'Événement publié', 'Annonce aux abonnés', draft.nPub],
              ] as const).map(([key, label, hint, val]) => (
                <div key={key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold">{label}</p>
                    <p className="truncate text-[11px] text-zinc-400">{hint}</p>
                  </div>
                  <Switch checked={val} onChange={(v) => patch({ [key]: v } as Partial<NonNullable<typeof draft>>)} label={label} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <SaveBar dirty={dirty} saving={saving} onSave={save} idleText="Contenu à jour." dirtyText="Aperçu non enregistré." />
            {feedback && <div className="mt-3"><FormFeedback tone={feedback.tone} message={feedback.message} /></div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Onglet 4 — Système & sécurité                                      */
/* ------------------------------------------------------------------ */

function SystemTab() {
  const rows: { label: string; value: string; ok: boolean }[] = [
    { label: 'Nom de l’application', value: env.appName, ok: true },
    { label: 'URL publique', value: env.appUrl, ok: true },
    { label: 'Supabase configuré', value: env.supabaseUrl ?? 'manquant (.env)', ok: Boolean(env.supabaseUrl && env.supabaseAnonKey) },
    { label: 'Simulation de paiement (DEV)', value: env.enablePaymentSimulation ? 'activée' : 'désactivée', ok: true },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4 sm:p-6">
        <SectionHeader
          icon={Server}
          title="Configuration"
          description="État des réglages lus depuis l'environnement."
          tone="bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sky-600/30"
        />
        <dl className="mt-4 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 bg-white px-4 py-3">
              <dt className="flex min-w-0 items-center gap-2 text-sm text-zinc-600">
                <span aria-hidden className={cn('size-2 shrink-0 rounded-full', r.ok ? 'bg-emerald-500' : 'bg-red-500')} />
                <span className="truncate">{r.label}</span>
              </dt>
              <dd className="flex min-w-0 shrink-0 items-center gap-2">
                <span className="max-w-60 truncate font-mono text-xs" title={r.value}>{r.value}</span>
                <Badge tone={r.ok ? 'success' : 'danger'}>{r.ok ? 'OK' : 'KO'}</Badge>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Les secrets (service_role, clés Mobile Money) restent dans les Edge Functions et ne sont jamais exposés ici.
        </p>
      </Card>

      <Card className="border-amber-200 bg-amber-50/60 p-4 sm:p-6">
        <SectionHeader
          icon={Lock}
          title="Rappels de sécurité"
          description="Règles non négociables de la plateforme."
          tone="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30"
        />
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          {[
            'Un billet n’est généré qu’après validation manuelle du paiement.',
            'Les clés secrètes (service_role, Mobile Money) restent dans les Edge Functions.',
            'Toute action sensible est auditée (triggers + audit_logs).',
            'La vérification des billets par scan arrive en Phase 6.',
          ].map((rule) => (
            <li key={rule} className="flex items-start gap-2.5 rounded-xl bg-white/80 px-3 py-2.5 shadow-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-amber-600" strokeWidth={3} aria-hidden />
              {rule}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function AdminSettingsPage() {
  const settings = usePlatformSettings();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab') as SettingsTabId | null;
  const activeTab: SettingsTabId = TABS.some((t) => t.id === rawTab) ? (rawTab as SettingsTabId) : 'validation';

  const setTab = (id: SettingsTabId) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    }, { replace: true });
  };

  const headerChips = useMemo(() => {
    const d = settings.data;
    if (!d) return null;
    const activeMethods = d.paymentMethods.filter((m) => m.enabled).length;
    return [
      { label: `Validation : ${d.paymentValidation === 'partner' ? 'Partenaires' : 'GVE'}`, tone: 'bg-white/10 text-white' },
      { label: `${activeMethods}/3 Mobile Money`, tone: activeMethods > 0 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/20 text-red-200' },
      { label: d.serviceFeeFixed > 0 ? `Frais ${d.serviceFeeFixed} Ar` : 'Sans frais', tone: 'bg-white/10 text-white' },
      { label: `${d.currency} · ${d.orderExpiryMinutes} min`, tone: 'bg-white/10 text-white' },
      { label: d.maintenanceMode ? 'Maintenance ON' : 'En ligne', tone: d.maintenanceMode ? 'bg-amber-400/20 text-amber-200' : 'bg-emerald-400/20 text-emerald-200' },
    ];
  }, [settings.data]);

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = TABS.findIndex((t) => t.id === activeTab);
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const next = TABS[(idx + delta + TABS.length) % TABS.length];
    setTab(next.id);
    document.getElementById(`settings-tab-${next.id}`)?.focus();
  };

  const activeMeta = TABS.find((t) => t.id === activeTab);

  return (
    <div className="w-full max-w-none space-y-4">
      {/* Hero pro */}
      <section className="relative overflow-hidden rounded-3xl bg-zinc-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-24 size-72 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="absolute -bottom-28 -left-16 size-72 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:22px_22px]" />
        </div>
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
              <Settings className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Administration</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">Paramètres</h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-300">
                Validation, Mobile Money, tarifs & limites, site, contact, système. Chaque section est isolée dans son onglet.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.isPending ? (
              <>
                <div aria-hidden className="skeleton h-7 w-28 rounded-full" />
                <div aria-hidden className="skeleton h-7 w-28 rounded-full" />
              </>
            ) : (
              headerChips?.map((c) => (
                <span key={c.label} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10', c.tone)}>
                  {c.label}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Onglets */}
      <div className="sticky top-16 z-20 -mx-1 bg-zinc-100/85 px-1 backdrop-blur">
        <div
          role="tablist"
          aria-label="Sections des paramètres"
          onKeyDown={onTabKeyDown}
          className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-sm sm:gap-2"
        >
          {TABS.map((t) => {
            const selected = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`settings-tab-${t.id}`}
                role="tab"
                aria-selected={selected}
                aria-controls={`settings-panel-${t.id}`}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex min-w-0 flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 sm:flex-none sm:px-4',
                  selected
                    ? 'bg-zinc-950 text-white shadow'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900',
                )}
              >
                <t.icon className={cn('size-4 shrink-0', selected ? 'text-white' : 'text-zinc-400')} aria-hidden />
                <span className="hidden md:inline">{t.label}</span>
                <span className="md:hidden">{t.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panneaux */}
      <div className="pb-2">
        <p className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
          {activeMeta && <activeMeta.icon className="size-4 text-zinc-400" aria-hidden />}
          {activeMeta?.desc}
        </p>
        <div
          key={activeTab}
          id={`settings-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`settings-tab-${activeTab}`}
          className="rise"
        >
          {activeTab === 'validation' && <ValidationCard />}
          {activeTab === 'mobile-money' && (
            <div className="space-y-4">
              <PaymentMethodsCard />
              <OperatorPrefsCard />
            </div>
          )}
          {activeTab === 'pricing' && <PricingCard />}
          {activeTab === 'site' && <SiteSettingsCard />}
          {activeTab === 'contact' && <ContactCard />}
          {activeTab === 'content' && <ContentSeoTab />}
          {activeTab === 'system' && <SystemTab />}
        </div>
      </div>
    </div>
  );
}
