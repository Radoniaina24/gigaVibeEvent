import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Clock,
  Plus,
  Ticket,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import {
  useMyPartner,
  usePartnerStats,
  useRemovePartnerLogo,
  useUpdatePartnerLogo,
} from '../../features/partner/hooks';
import { useAuth } from '../../features/auth/AuthContext';
import type { Partner } from '../../types/database';
import { PartnerStatusBanner } from '../../components/layout/PartnerLayout';
import { PartnerStatusBadge } from '../../components/admin/StatusBadges';
import { OrganizedBy } from '../../components/brand/CoBrand';
import { StatsCard } from '../../components/admin/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import { PartnerHomeSkeleton } from './PartnerSkeletons';
import { formatAr } from '../../lib/utils';

/** Logo + aperçu co-branding (§9-10) : [logo] présente … — Billetterie officielle GVE. */
function PartnerLogoCard({ partner }: { partner: Partner }) {
  const updateLogo = useUpdatePartnerLogo();
  const removeLogo = useRemovePartnerLogo();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const busy = updateLogo.isPending || removeLogo.isPending;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      await updateLogo.mutateAsync(file);
      setSuccess('Logo mis à jour. Il apparaît sur vos événements et confirmations.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload impossible.');
    }
  };

  const handleRemove = async () => {
    setError(null);
    setSuccess(null);
    try {
      await removeLogo.mutateAsync();
      setSuccess('Logo retiré.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo et co-branding</CardTitle>
        <CardDescription>
          Votre logo apparaît sur vos pages de vente et confirmations, toujours
          accompagné de la mention officielle Giga Vibe Event (non modifiable).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={`Logo ${partner.name}`}
                className="size-16 shrink-0 rounded-2xl border border-zinc-200 bg-white object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-bold text-white"
              >
                {partner.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-700">
                <Upload className="size-4" aria-hidden />
                {busy ? 'Envoi…' : partner.logo_url ? 'Remplacer' : 'Ajouter un logo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
              {partner.logo_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={removeLogo.isPending}
                  disabled={busy}
                  onClick={handleRemove}
                >
                  <Trash2 className="size-4" aria-hidden /> Retirer
                </Button>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Aperçu public
            </p>
            <div className="mt-1.5">
              <OrganizedBy
                partner={{ name: partner.name, logo_url: partner.logo_url }}
              />
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">JPEG, PNG ou WebP · max 5 Mo.</p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mt-2 text-sm text-green-700">
            {success}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function PartnerDashboardPage() {
  const { profile } = useAuth();
  const partner = useMyPartner();
  const stats = usePartnerStats();

  if (!profile?.partner_id) {
    return (
      <ErrorState
        title="Aucun espace organisateur."
        description="Votre compte n'est rattaché à aucun partenaire. Contactez Giga Vibe Event."
      />
    );
  }

  const isPending = partner.isPending || stats.isPending;
  const isError = partner.isError || stats.isError;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mon espace organisateur</h1>
          <p className="text-sm text-zinc-500">
            {partner.data ? (
              <>
                {partner.data.name} · <PartnerStatusBadge status={partner.data.status} />
              </>
            ) : (
              'Chargement…'
            )}
          </p>
        </div>
        {partner.data?.status === 'active' && (
          <Link to="/partner/events/new">
            <Button size="sm">
              <Plus className="size-4" aria-hidden /> Créer un événement
            </Button>
          </Link>
        )}
      </div>

      {partner.data && <PartnerStatusBanner status={partner.data.status} />}
      {partner.data && <PartnerLogoCard partner={partner.data} />}

      {isPending ? (
        <PartnerHomeSkeleton />
      ) : isError || !stats.data ? (
        <ErrorState
          description="Impossible de charger vos données."
          onRetry={() => {
            partner.refetch();
            stats.refetch();
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              label="Mes événements"
              value={String(stats.data.eventsTotal)}
              hint={`${stats.data.published} publiés`}
              icon={CalendarDays}
            />
            <StatsCard
              label="En validation"
              value={String(stats.data.pendingReview)}
              hint="chez Giga Vibe Event"
              icon={Clock}
            />
            <StatsCard
              label="Billets vendus"
              value={String(stats.data.ticketsSold)}
              hint={`${stats.data.ticketsAvailable} disponibles`}
              icon={Ticket}
            />
            <StatsCard
              label="Chiffre d’affaires"
              value={formatAr(stats.data.revenue)}
              hint="commandes payées"
              icon={Wallet}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Modifications demandées */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CircleAlert className="size-4 text-amber-600" aria-hidden />
                    Suivi des validations
                  </CardTitle>
                  <CardDescription>
                    {stats.data.draft} brouillon{stats.data.draft > 1 ? 's' : ''} ·{' '}
                    {stats.data.changesRequested} modification{stats.data.changesRequested > 1 ? 's' : ''} demandée{stats.data.changesRequested > 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Link
                  to="/partner/events"
                  className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
                >
                  Mes événements <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Créez vos événements en brouillon, ajoutez catégories et prix, puis{' '}
                  <strong>soumettez pour validation</strong>. Giga Vibe Event approuve
                  avant publication — vous êtes notifié en cas de modification demandée.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/partner/events/new">
                    <Button size="sm" variant="secondary">
                      <Plus className="size-4" aria-hidden /> Nouvel événement
                    </Button>
                  </Link>
                  <Link to="/partner/events">
                    <Button size="sm" variant="secondary">
                      Voir mes événements
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Paiements */}
            <Card>
              <CardHeader>
                <CardTitle>Paiements en attente</CardTitle>
                <CardDescription>Commandes clients non encore confirmées.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{stats.data.pendingPayments}</div>
                <p className="mt-1 text-xs text-zinc-500">
                  Selon le réglage de la plateforme, la validation est effectuée par
                  Giga Vibe Event, par vous, ou automatiquement.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
