import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Banknote,
  Check,
  Globe,
  Lock,
  Mail,
  Server,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
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
import { cn } from '../../lib/utils';

const METHOD_SHORT: Record<ConfigPaymentMethodId, 'yas' | 'orange' | 'airtel'> = {
  yas: 'yas',
  orange_money: 'orange',
  airtel_money: 'airtel',
};

type SettingsTabId = 'validation' | 'mobile-money' | 'pricing' | 'site' | 'contact' | 'system';

const TABS: { id: SettingsTabId; label: string; short: string; icon: typeof Settings; desc: string }[] = [
  { id: 'validation', label: 'Validation paiements', short: 'Validation', icon: ShieldCheck, desc: 'Qui valide les paiements manuels' },
  { id: 'mobile-money', label: 'Mobile Money', short: 'Mobile Money', icon: Smartphone, desc: 'Numéros marchands YAS · Orange · Airtel' },
  { id: 'pricing', label: 'Tarifs & limites', short: 'Tarifs', icon: Banknote, desc: 'Frais fixes, qui paie, plafonds du panier' },
  { id: 'site', label: 'Site & billetterie', short: 'Site', icon: Globe, desc: 'Devise, expiration, maintenance' },
  { id: 'contact', label: 'Site & contact', short: 'Contact', icon: Mail, desc: 'Nom, logo, contact, numérotation, uploads' },
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
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="p-4 sm:p-6 lg:col-span-3">
        <SectionHeader
          icon={Globe}
          title="Site & billetterie"
          description="Devise affichée, durée de réservation et message du tunnel d'achat."
          tone="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30"
        />
        {settings.isPending || !draft ? (
          <CardSkeleton lines={4} />
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Devise (code ISO)"
                placeholder="MGA"
                maxLength={3}
                value={draft.currency}
                onChange={(e) => patch({ currency: e.target.value.toUpperCase() })}
              />
              <Input
                label="Expiration commande (minutes)"
                type="number"
                min={5}
                max={1440}
                hint="Entre 5 et 1440 minutes"
                value={draft.expiry}
                onChange={(e) => patch({ expiry: e.target.value })}
              />
            </div>
            <Textarea
              label="Instructions affichées dans le tunnel d'achat (vide = masqué)"
              rows={4}
              placeholder="Ex. : Envoyez le montant exact au numéro marchand, puis déclarez la référence…"
              value={draft.instructions}
              onChange={(e) => patch({ instructions: e.target.value })}
            />
            <SaveBar dirty={dirty} saving={saving} onSave={save} idleText="Réglages à jour." />
            {feedback && <FormFeedback tone={feedback.tone} message={feedback.message} />}
          </div>
        )}
      </Card>

      <Card className={cn('p-4 sm:p-6 lg:col-span-2', draft?.maintenance ? 'border-amber-300 bg-amber-50/50' : '')}>
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
              'flex items-center justify-between gap-3 rounded-2xl border p-4',
              draft.maintenance ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-white',
            )}>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  Mode maintenance
                  <Badge tone={draft.maintenance ? 'warning' : 'success'}>
                    {draft.maintenance ? 'Actif' : 'Inactif'}
                  </Badge>
                </p>
                <p className="mt-1 text-xs text-zinc-500">Visible immédiatement après enregistrement.</p>
              </div>
              <Switch checked={draft.maintenance} onChange={(v) => patch({ maintenance: v })} label="Activer le mode maintenance" />
            </div>
            {draft.maintenance && (
              <Textarea
                label="Message de maintenance"
                rows={3}
                value={draft.maintenanceMessage}
                onChange={(e) => patch({ maintenanceMessage: e.target.value })}
              />
            )}
            <SaveBar dirty={dirty} saving={saving} onSave={save} idleText="État à jour." />
            {feedback && <FormFeedback tone={feedback.tone} message={feedback.message} />}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Onglet — Tarifs & limites (P0)                                     */
/* ------------------------------------------------------------------ */

const FEES_PAYER_OPTIONS = [
  { value: 'buyer', title: 'Acheteur', description: 'Les frais s’ajoutent au total payé par le client.' },
  { value: 'organizer', title: 'Organisateur', description: 'Les frais sont déduits côté organisateur.' },
  { value: 'split', title: 'Partagés', description: 'Frais partagés (logique métier à venir).' },
] as const;

function PricingCard() {
  const settings = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [draft, setDraft] = useState<{
    feeFixed: string;
    payer: string;
    maxPerType: string;
    maxLines: string;
    maxTotal: string;
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

  return (
    <Card className="p-4 sm:p-6">
      <SectionHeader
        icon={Banknote}
        title="Tarifs & limites"
        description="Frais fixes par billet (Ar), qui paie, et plafonds anti-scalping du panier."
        tone="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/30"
      />
      {settings.isPending || !draft ? (
        <CardSkeleton lines={4} />
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Frais fixes par billet (Ar)"
              type="number"
              min={0}
              max={100000}
              value={draft.feeFixed}
              onChange={(e) => patch({ feeFixed: e.target.value })}
              hint="0 = sans frais. Appliqué aux prochaines commandes."
            />
            <div>
              <p className="mb-1 block text-xs font-medium text-zinc-600">Qui paie les frais</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Qui paie les frais">
                {FEES_PAYER_OPTIONS.map((o) => {
                  const selected = draft.payer === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      title={o.description}
                      onClick={() => patch({ payer: o.value })}
                      className={cn(
                        'rounded-xl border px-2 py-2.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                        selected ? 'border-zinc-900 bg-zinc-950 text-white shadow' : 'border-zinc-200 bg-white hover:border-zinc-300',
                      )}
                    >
                      {o.title}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-zinc-500">{FEES_PAYER_OPTIONS.find((o) => o.value === draft.payer)?.description}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Max / type de billet"
              type="number"
              min={1}
              max={50}
              value={draft.maxPerType}
              onChange={(e) => patch({ maxPerType: e.target.value })}
            />
            <Input
              label="Max lignes / commande"
              type="number"
              min={1}
              max={50}
              value={draft.maxLines}
              onChange={(e) => patch({ maxLines: e.target.value })}
            />
            <Input
              label="Max billets / commande"
              type="number"
              min={1}
              max={200}
              value={draft.maxTotal}
              onChange={(e) => patch({ maxTotal: e.target.value })}
            />
          </div>
          <SaveBar dirty={dirty} saving={saving} onSave={save} />
          {feedback && <FormFeedback tone={feedback.tone} message={feedback.message} />}
        </div>
      )}
    </Card>
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
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4 sm:p-6">
        <SectionHeader
          icon={Mail}
          title="Branding & contact"
          description="Nom du site, logo et coordonnées affichées (page Contact)."
          tone="bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sky-600/30"
        />
        {settings.isPending || !draft ? (
          <CardSkeleton lines={4} />
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Nom du site" value={draft.siteName} onChange={(e) => patch({ siteName: e.target.value })} />
              <Input label="URL du logo" placeholder="/logo.jpeg" value={draft.logoUrl} onChange={(e) => patch({ logoUrl: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Email de contact" type="email" value={draft.email} onChange={(e) => patch({ email: e.target.value })} />
              <Input label="Téléphone de contact" value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </div>
            <SaveBar dirty={dirty} saving={saving} onSave={save} />
            {feedback && <FormFeedback tone={feedback.tone} message={feedback.message} />}
          </div>
        )}
      </Card>
      <Card className="p-4 sm:p-6">
        <SectionHeader
          icon={Settings}
          title="Numérotation, uploads & auth"
          description="Préfixes billets/commandes, taille max d’upload et durées des liens."
          tone="bg-gradient-to-br from-zinc-700 to-zinc-950 shadow-zinc-900/30"
        />
        {settings.isPending || !draft ? (
          <CardSkeleton lines={4} />
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Préfixe billets" placeholder="GVE-" value={draft.ticketPrefix} onChange={(e) => patch({ ticketPrefix: e.target.value })} hint="Appliqué aux prochains billets" />
              <Input label="Préfixe commandes" placeholder="ORDER-" value={draft.orderPrefix} onChange={(e) => patch({ orderPrefix: e.target.value })} hint="+ année + compteur" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Upload max (Mo)" type="number" min={1} max={50} value={draft.uploadMb} onChange={(e) => patch({ uploadMb: e.target.value })} />
              <Input label="Expiration invitations (jours)" type="number" min={1} max={30} value={draft.inviteDays} onChange={(e) => patch({ inviteDays: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Lien confirmation (min)" type="number" min={5} max={1440} value={draft.confirmExpiry} onChange={(e) => patch({ confirmExpiry: e.target.value })} />
              <Input label="Lien reset password (min)" type="number" min={5} max={1440} value={draft.resetExpiry} onChange={(e) => patch({ resetExpiry: e.target.value })} />
            </div>
            <SaveBar dirty={dirty} saving={saving} onSave={save} />
            {feedback && <FormFeedback tone={feedback.tone} message={feedback.message} />}
          </div>
        )}
      </Card>
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
          {activeTab === 'mobile-money' && <PaymentMethodsCard />}
          {activeTab === 'pricing' && <PricingCard />}
          {activeTab === 'site' && <SiteSettingsCard />}
          {activeTab === 'contact' && <ContactCard />}
          {activeTab === 'system' && <SystemTab />}
        </div>
      </div>
    </div>
  );
}
