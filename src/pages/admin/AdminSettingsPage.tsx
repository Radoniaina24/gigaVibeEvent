import { useState } from 'react';
import { env } from '../../app/config/env';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { useUpdatePlatformSetting } from '../../features/admin/hooks';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Fields';

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
            <option value="auto">Automatique (API Mobile Money — à venir)</option>
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
          <li>Ne jamais déclarer un paiement « payé » manuellement : seul le webhook fait foi.</li>
          <li>Les clés secrètes (service_role, Mobile Money) restent dans les Edge Functions.</li>
          <li>Toute action sensible est auditée (triggers + audit_logs).</li>
          <li>La vérification des billets par scan arrive en Phase 6.</li>
        </ul>
      </Card>
    </div>
  );
}
