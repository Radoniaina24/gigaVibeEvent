import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  CONTACT_SUBJECT_LABELS,
  contactSchema,
  type ContactInput,
  type ContactSubject,
} from '../../schemas/contact';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Fields';
import { SelectField, type SelectOption } from '../../components/ui/Select';
import { cn } from '../../lib/utils';

const CONTACT_EMAIL = 'contact@ticket.mg';
const CONTACT_PHONE = '+261 34 12 345 67';
const CONTACT_PHONE_HREF = 'tel:+261341234567';

const SUBJECT_OPTIONS: SelectOption<ContactSubject>[] = (
  Object.entries(CONTACT_SUBJECT_LABELS) as [ContactSubject, string][]
).map(([value, label]) => ({ value, label }));

const HERO_CHIPS = [
  { icon: Clock, label: 'Réponse sous 24h ouvrées' },
  { icon: MessageCircle, label: 'Support en français & malagasy' },
  { icon: MapPin, label: 'Basés à Antananarivo' },
];

const INFO_ROWS = [
  {
    icon: Mail,
    title: 'Email',
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    action: 'copy-email' as const,
    linkLabel: 'Écrire un email',
  },
  {
    icon: Phone,
    title: 'Téléphone',
    value: CONTACT_PHONE,
    href: CONTACT_PHONE_HREF,
    action: 'call' as const,
    linkLabel: 'Appeler',
  },
  {
    icon: MapPin,
    title: 'Adresse',
    value: 'Lot II M 45, Ankorondrano, Antananarivo 101',
    action: 'none' as const,
    linkLabel: '',
  },
  {
    icon: Clock,
    title: 'Horaires',
    value: 'Lun – Sam · 8h à 18h',
    action: 'none' as const,
    linkLabel: '',
  },
];

const FAQS = [
  {
    q: 'Je n’ai pas reçu mes billets après paiement, que faire ?',
    a: 'Vérifiez d’abord votre boîte spam puis la rubrique « Mes billets » de votre tableau de bord. Si le paiement a été débité sans billet, écrivez-nous via ce formulaire (sujet « Support technique ») avec votre numéro de commande : régularisation sous 24h ouvrées.',
  },
  {
    q: 'Quels moyens de paiement acceptez-vous ?',
    a: 'MVola, Orange Money et Airtel Money via un parcours sécurisé côté serveur. Le QR Code de vos billets est généré dès la confirmation du paiement.',
  },
  {
    q: 'Puis-je me faire rembourser ou transférer un billet ?',
    a: 'Les billets sont nominatifs et vérifiés par QR Code unique. En cas d’annulation d’événement, le remboursement est automatique. Pour les autres cas, contactez-nous et nous étudierons votre demande avec l’organisateur.',
  },
  {
    q: 'Je suis organisateur, comment publier mon événement ?',
    a: 'Créez un compte, puis écrivez-nous avec le sujet « Organiser un événement » en précisant date, lieu et jauge attendue. Notre équipe vous accompagne de la mise en vente au contrôle d’accès le jour J.',
  },
  {
    q: 'Mes données sont-elles protégées ?',
    a: 'Oui : seules les informations nécessaires à la commande et au support sont utilisées, jamais revendues. Vous pouvez demander leur suppression à tout moment par email.',
  },
];

function saveToOutbox(values: ContactInput) {
  try {
    const raw = localStorage.getItem('ticket:contact-outbox');
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push({ ...values, sentAt: new Date().toISOString() });
    localStorage.setItem('ticket:contact-outbox', JSON.stringify(list));
  } catch {
    /* stockage indisponible : l'envoi reste confirmé à l'écran */
  }
}

export function ContactPage() {
  usePageMeta(
    'Contact',
    'Contactez l’équipe Ticket Madagascar : billetterie, organisation d’événements, partenariats et support.',
  );
  const [sent, setSent] = useState<ContactInput | null>(null);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', subject: 'billetterie', message: '' },
  });

  const onSubmit = async (values: ContactInput) => {
    await new Promise((r) => window.setTimeout(r, 800));
    saveToOutbox(values);
    setSent(values);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  const sendAnother = () => {
    setSent(null);
    reset();
  };

  return (
    <div className="space-y-10 md:space-y-14">
      {/* ===== Hero pleine largeur ===== */}
      <section aria-label="Contact" className="bleed grain hero-glow relative overflow-hidden border-b border-white/10 bg-night-950 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 size-96 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="absolute -bottom-32 right-0 size-80 rounded-full bg-gold-500/15 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-2 md:py-14">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold text-gold-300">
            <MessageCircle className="size-3.5" aria-hidden />
            Contact · Réponse sous 24h ouvrées
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            Une question ?<br />
            <span className="text-spotlight">Écrivez-nous.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300 md:text-base">
            Billet introuvable, paiement, organisation d’événement ou partenariat :
            l’équipe vous répond vite, en français ou en malagasy.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {HERO_CHIPS.map((c) => (
              <li
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200"
              >
                <c.icon className="size-3.5 text-gold-400" aria-hidden />
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Contenu : formulaire + infos ===== */}
      <div className="bleed">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-2 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          {/* ----- Formulaire ----- */}
          <section
            aria-label="Formulaire de contact"
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.15)] md:p-7"
          >
            {sent ? (
              <div aria-live="polite" className="py-4 text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-7 text-green-700" strokeWidth={3} aria-hidden />
                </span>
                <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">
                  Message envoyé !
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
                  Merci {sent.name.split(' ')[0] ?? sent.name} — votre demande
                  « {CONTACT_SUBJECT_LABELS[sent.subject]} » est bien enregistrée.
                  Réponse à <strong>{sent.email}</strong> sous 24h ouvrées.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                  <Button variant="secondary" onClick={sendAnother}>
                    Envoyer un autre message
                  </Button>
                  <Link to="/events">
                    <Button>
                      Voir les événements <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold tracking-tight md:text-2xl">
                  Envoyer un message
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Tous les champs marqués d’un astérisque (*) sont requis.
                </p>
                <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Nom complet *"
                      autoComplete="name"
                      placeholder="Ex. Miora Rakoto"
                      error={errors.name?.message}
                      {...register('name')}
                    />
                    <Input
                      label="Email *"
                      type="email"
                      autoComplete="email"
                      placeholder="vous@exemple.mg"
                      error={errors.email?.message}
                      {...register('email')}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Téléphone (optionnel)"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+261 …"
                      error={errors.phone?.message}
                      {...register('phone')}
                    />
                    <Controller
                      name="subject"
                      control={control}
                      render={({ field }) => (
                        <SelectField
                          label="Sujet *"
                          value={field.value}
                          onChange={field.onChange}
                          options={SUBJECT_OPTIONS}
                          error={errors.subject?.message}
                        />
                      )}
                    />
                  </div>
                  <Textarea
                    label="Message *"
                    rows={6}
                    placeholder="Décrivez votre demande : événement concerné, numéro de commande, date…"
                    error={errors.message?.message}
                    {...register('message')}
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button type="submit" loading={isSubmitting} size="lg" className="w-full sm:w-auto">
                      <Send className="size-4" aria-hidden /> Envoyer le message
                    </Button>
                    <p className="text-xs leading-relaxed text-zinc-500">
                      Vos coordonnées servent uniquement à traiter votre demande.
                    </p>
                  </div>
                </form>
              </>
            )}
          </section>

          {/* ----- Colonne infos ----- */}
          <aside aria-label="Coordonnées" className="space-y-4">
            <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {INFO_ROWS.map((row) => (
                <div key={row.title} className="flex items-start gap-3 p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <row.icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      {row.title}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900" title={row.value}>
                      {row.value}
                    </p>
                    {row.action === 'copy-email' && (
                      <div className="mt-1.5 flex items-center gap-3">
                        <a
                          href={row.href}
                          className="text-[13px] font-semibold text-brand-700 hover:underline"
                        >
                          {row.linkLabel}
                        </a>
                        <button
                          type="button"
                          onClick={copyEmail}
                          className="inline-flex items-center gap-1 text-[13px] font-medium text-zinc-500 transition hover:text-zinc-900"
                        >
                          {copied
                            ? <><Check className="size-3.5 text-green-600" aria-hidden /> Copié !</>
                            : <><Copy className="size-3.5" aria-hidden /> Copier</>}
                        </button>
                      </div>
                    )}
                    {row.action === 'call' && (
                      <a
                        href={row.href}
                        className="mt-1.5 inline-block text-[13px] font-semibold text-brand-700 hover:underline"
                      >
                        {row.linkLabel}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA organisateurs */}
            <div className="grain hero-glow relative overflow-hidden rounded-2xl bg-night-950 p-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300">
                Organisateurs
              </p>
              <p className="mt-2 font-display text-lg font-bold leading-snug">
                Vous organisez un événement ?
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-300">
                Billetterie, contrôle QR et reversements : on s’occupe de tout.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Organiser un événement')}`}
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 text-sm font-bold text-night-950 transition hover:bg-gold-300"
              >
                Parler à l’équipe <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>
          </aside>
        </div>
      </div>

      {/* ===== FAQ ===== */}
      <div className="bleed">
        <div className="mx-auto max-w-3xl px-4 md:px-2">
          <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            Questions fréquentes
          </p>
          <h2 className="mt-1 text-center font-display text-2xl font-bold tracking-tight md:text-3xl">
            Avant de nous écrire
          </h2>
          <div className="mt-5 space-y-2">
            {FAQS.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={f.q}
                  className={cn(
                    'overflow-hidden rounded-2xl border bg-white transition',
                    isOpen ? 'border-zinc-900 shadow-md' : 'border-zinc-200 shadow-sm',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="text-sm font-semibold text-zinc-900">{f.q}</span>
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        'size-4 shrink-0 text-zinc-400 transition-transform duration-200',
                        isOpen && 'rotate-180 text-zinc-900',
                      )}
                    />
                  </button>
                  {isOpen && (
                    <p id={`faq-panel-${i}`} className="px-4 pb-4 text-sm leading-relaxed text-zinc-600">
                      {f.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
