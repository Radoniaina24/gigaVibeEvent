import { useEffect, useState } from 'react';
import { env } from '../../app/config/env';
import {
  usePlatformSettings,
  type ConfigPaymentMethodId,
} from '../../hooks/usePlatformSettings';
import { useUpdatePlatformSetting } from '../../features/admin/hooks';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Fields';

const METHOD_LABEL: Record<ConfigPaymentMethodId, string> = {
  yas: 'YAS',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
};

const METHOD_SHORT: Record<ConfigPaymentMethodId, 'yas' | 'orange' | 'airtel'> = {
  yas: 'yas',
  orange_money: 'orange',
  airtel_money: 'airtel',
};

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
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data && draft === null) {
      const next: Record<string, { number: string; name: string; enabled: boolean }> = {};
      for (const m of settings.data.paymentMethods) {
        next[m.id] = { number: m.number, name: m.name, enabled: m.enabled };
      }
      setDraft(next);
    }
  }, [settings.data, draft]);

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
      setFeedback('Numéros marchands enregistrés.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-bold">Numéros marchands Mobile Money</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Numéros et bénéficiaires affichés aux acheteurs. Désactivez un moyen pour
        le retirer du tunnel d'achat.
      </p>
      {settings.isPending || !draft ? (
        <p className="mt-3 text-sm text-zinc-500">Chargement…</p>
      ) : (
        <div className="mt-3 space-y-4">
          {(Object.keys(draft) as ConfigPaymentMethodId[]).map((id) => (
            <div key={id} className="rounded-xl border border-zinc-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{METHOD_LABEL[id]}</p>
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                  <input
                    type="checkbox"
                    checked={draft[id].enabled}
                    onChange={(e) =>
                      setDraft({ ...draft, [id]: { ...draft[id], enabled: e.target.checked } })
                    }
                    className="size-4 accent-zinc-900"
                  />
                  Activé
                </label>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Input
                  label="Numéro marchand"
                  placeholder="+261 …"
                  value={draft[id].number}
                  onChange={(e) =>
                    setDraft({ ...draft, [id]: { ...draft[id], number: e.target.value } })
                  }
                />
                <Input
                  label="Bénéficiaire"
                  placeholder="Giga Vibe Event"
                  value={draft[id].name}
                  onChange={(e) =>
                    setDraft({ ...draft, [id]: { ...draft[id], name: e.target.value } })
                  }
                />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <Button size="sm" loading={saving} onClick={save}>
              Enregistrer
            </Button>
            {feedback && <p role="status" className="text-sm text-zinc-600">{feedback}</p>}
          </div>
        </div>
      )}
    </Card>
  );
}

/** Paramètres : état de la configuration (les secrets restent côté serveur). */
export function AdminSettingsPage() {
  const settings = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  // Surcharge locale (null = suit la valeur serveur).
  const [validationMode, setValidationMode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [settingError, setSettingError] = useState<string | null>(null);

  const currentMode = validationMode ?? settings.data?.paymentValidation ?? 'gve';
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
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <Card className="p-5">
        <h2 className="font-bold">Validation des paiements manuels</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Qui vérifie les transferts déclarés par les clients avant génération des billets.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Select
            label="Responsable de validation"
            value={currentMode}
            onChange={(e) => {
              setValidationMode(e.target.value);
              setSaved(false);
            }}
          >
            <option value="gve">Giga Vibe Event (backoffice admin)</option>
            <option value="partner">Chaque partenaire (ses événements)</option>
          </Select>
          <Button
            size="sm"
            className="h-10"
            loading={updateSetting.isPending}
            disabled={settings.data?.paymentValidation === currentMode}
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
        </div>
        {settingError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {settingError}
          </p>
        )}
        {saved && (
          <p role="status" className="mt-2 text-sm text-green-700">
            Réglage enregistré.
          </p>
        )}
      </Card>

      <PaymentMethodsCard />

      <Card className="p-5">
        <h2 className="font-bold">Configuration</h2>
        <dl className="mt-3 space-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-2">
              <dt className="text-zinc-500">{r.label}</dt>
              <dd className="flex items-center gap-2">
                <span className="max-w-60 truncate font-mono text-xs">{r.value}</span>
                <Badge tone={r.ok ? 'success' : 'danger'}>{r.ok ? 'OK' : 'KO'}</Badge>
              </dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card className="p-5">
        <h2 className="font-bold">Rappels de sécurité</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
          <li>Un billet n'est généré qu'après validation manuelle du paiement.</li>
          <li>Les clés secrètes (service_role, Mobile Money) restent dans les Edge Functions.</li>
          <li>Toute action sensible est auditée (triggers + audit_logs).</li>
          <li>La vérification des billets par scan arrive en Phase 6.</li>
        </ul>
      </Card>
    </div>
  );
}
