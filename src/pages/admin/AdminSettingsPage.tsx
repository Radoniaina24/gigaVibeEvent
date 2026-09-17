import { useEffect, useState } from 'react';
import {
  Check,
  Lock,
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
import { OperatorLogo } from '../../components/orders/OperatorLogo';
import { PaymentMethodBadge } from '../../components/orders/PaymentMethodBadge';
import { cn } from '../../lib/utils';

const METHOD_SHORT: Record<ConfigPaymentMethodId, 'yas' | 'orange' | 'airtel'> = {
  yas: 'yas',
  orange_money: 'orange',
  airtel_money: 'airtel',
};

/** Interrupteur pro (rôle switch, clavier + lecteur d'écran). */
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

/**
 * Numéros marchands YAS / Orange / Airtel (migration 0010).
 * Affichés aux acheteurs dans les instructions — jamais hardcodés en React.
 */
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
        await updateSetting.mutateAsync({
          key: `payment_${short}_enabled`,
          value: JSON.stringify(d.enabled),
        });
        await updateSetting.mutateAsync({
          key: `payment_${short}_number`,
          value: JSON.stringify(d.number.trim()),
        });
        await updateSetting.mutateAsync({
          key: `payment_${short}_name`,
          value: JSON.stringify(d.name.trim() || 'Giga Vibe Event'),
        });
      }
      setDirty(false);
      setFeedback({ tone: 'ok', message: 'Numéros marchands enregistrés.' });
    } catch (err) {
      setFeedback({
        tone: 'ko',
        message: err instanceof Error ? err.message : 'Enregistrement impossible.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <SectionHeader
        icon={Smartphone}
        title="Numéros marchands Mobile Money"
        description="Numéros et bénéficiaires affichés aux acheteurs. Désactivez un moyen pour le retirer du tunnel d'achat."
        tone="bg-gradient-to-br from-brand-600 to-brand-800 shadow-brand-600/30"
      />
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
                    <Switch
                      checked={d.enabled}
                      onChange={(v) => patch(meta.id, { enabled: v })}
                      label={`Activer ${meta.label}`}
                    />
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
          <div className="flex flex-col gap-2 rounded-2xl bg-zinc-950 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-400">
              {dirty ? 'Modifications non enregistrées.' : 'Configuration à jour.'}
            </p>
            <Button size="sm" loading={saving} disabled={!dirty} onClick={save} className="shrink-0">
              Enregistrer
            </Button>
          </div>
          {feedback && (
            <p
              role={feedback.tone === 'ko' ? 'alert' : 'status'}
              className={cn(
                'flex items-center gap-2 rounded-xl border p-3 text-sm font-medium',
                feedback.tone === 'ok'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-700',
              )}
            >
              {feedback.tone === 'ok' && <Check className="size-4 shrink-0" aria-hidden />}
              {feedback.message}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

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

/** Paramètres : état de la configuration (les secrets restent côté serveur). */
export function AdminSettingsPage() {
  const settings = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  // Surcharge locale (null = suit la valeur serveur).
  const [validationMode, setValidationMode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [settingError, setSettingError] = useState<string | null>(null);

  const currentMode = validationMode ?? settings.data?.paymentValidation ?? 'gve';
  const modeDirty = settings.data != null && currentMode !== settings.data.paymentValidation;
  const rows: { label: string; value: string; ok: boolean }[] = [
    {
      label: 'Nom de l’application',
      value: env.appName,
      ok: true,
    },
    {
      label: 'URL publique',
      value: env.appUrl,
      ok: true,
    },
    {
      label: 'Supabase configuré',
      value: env.supabaseUrl ?? 'manquant (.env)',
      ok: Boolean(env.supabaseUrl && env.supabaseAnonKey),
    },
    {
      label: 'Simulation de paiement (DEV)',
      value: env.enablePaymentSimulation ? 'activée' : 'désactivée',
      ok: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-zinc-900 text-white shadow-sm">
          <Settings className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Validation des paiements, moyens Mobile Money et état de la configuration.
          </p>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <SectionHeader
          icon={ShieldCheck}
          title="Validation des paiements manuels"
          description="Qui vérifie les transferts déclarés par les clients avant génération des billets."
          tone="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/30"
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Responsable de validation">
          {VALIDATION_OPTIONS.map((opt) => {
            const selected = currentMode === opt.value;
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
                  'flex items-start gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                  selected
                    ? 'border-zinc-900 bg-zinc-950 text-white shadow-lg'
                    : 'border-zinc-200 bg-white hover:-translate-y-px hover:border-zinc-300 hover:shadow-md',
                )}
              >
                <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm', opt.tile)}>
                  <opt.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('flex items-center gap-2 text-sm font-bold', selected ? 'text-white' : 'text-zinc-900')}>
                    {opt.title}
                    {settings.data?.paymentValidation === opt.value && (
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        selected ? 'bg-emerald-400/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800',
                      )}>
                        Actif
                      </span>
                    )}
                  </span>
                  <span className={cn('mt-0.5 block text-xs leading-relaxed', selected ? 'text-zinc-300' : 'text-zinc-500')}>
                    {opt.description}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full border-2 transition',
                    selected ? 'border-emerald-400 bg-emerald-400 text-zinc-950' : 'border-zinc-300 bg-white text-transparent',
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            size="sm"
            loading={updateSetting.isPending}
            disabled={!modeDirty}
            onClick={async () => {
              setSettingError(null);
              try {
                await updateSetting.mutateAsync({ key: 'payment_validation', value: currentMode });
                setValidationMode(null);
                setSaved(true);
              } catch (err) {
                setSettingError(err instanceof Error ? err.message : 'Enregistrement impossible.');
              }
            }}
          >
            Enregistrer
          </Button>
          {!modeDirty && !saved && (
            <p className="text-xs text-zinc-400">Configuration à jour.</p>
          )}
        </div>
        {settingError && (
          <p role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {settingError}
          </p>
        )}
        {saved && (
          <p role="status" className="mt-2 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">
            <Check className="size-4 shrink-0" aria-hidden />
            Réglage enregistré.
          </p>
        )}
      </Card>

      <PaymentMethodsCard />

      <Card className="p-4 sm:p-5">
        <SectionHeader
          icon={Server}
          title="Configuration"
          description="État des réglages lus depuis l'environnement."
          tone="bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sky-600/30"
        />
        <dl className="mt-4 divide-y divide-zinc-100 rounded-2xl border border-zinc-200">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
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
      </Card>

      <Card className="border-amber-200 bg-amber-50/60 p-4 sm:p-5">
        <SectionHeader
          icon={Lock}
          title="Rappels de sécurité"
          description="Règles non négociables de la plateforme."
          tone="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30"
        />
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          {[
            'Un billet n’est généré qu’après validation manuelle du paiement.',
            'Les clés secrètes (service_role, Mobile Money) restent dans les Edge Functions.',
            'Toute action sensible est auditée (triggers + audit_logs).',
            'La vérification des billets par scan arrive en Phase 6.',
          ].map((rule) => (
            <li key={rule} className="flex items-start gap-2.5 rounded-xl bg-white/70 px-3 py-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-amber-600" strokeWidth={3} aria-hidden />
              {rule}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
