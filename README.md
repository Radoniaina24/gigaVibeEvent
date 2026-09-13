# Ticket — Plateforme de billetterie événementielle (Madagascar)

Vite + React + TypeScript + Tailwind CSS v4 + Supabase + TanStack Query + Zod + React Router + Lucide.

## État : Phase 4 ✅

- [x] Phase 1 : Architecture projet + Supabase + Database + Auth + Layout + Routing
- [x] Phase 2 : Home, Events, Event details, Categories
- [x] Phase 3 : Orders, Tickets, User dashboard (simulation DEV, webhook en Phase 5)
- [x] Phase 4 : Admin (dashboard KPI, événements + billets, catégories, utilisateurs, commandes, paiements, billets, statistiques)
- [ ] Phase 5 : Paiement Mobile Money (MVola / Orange / Airtel)
- [ ] Phase 6 : QR Code, vérification, stats, audit
- [ ] Phase 7 : Revue sécurité / RLS / UX / responsive / perf

## Migrations Supabase (ordre)

```sql
supabase/migrations/0001_init.sql      -- schéma + RLS + storage
supabase/migrations/0002_checkout.sql  -- RPC checkout + simulation DEV
supabase/migrations/0003_audit.sql     -- INSERT audit_logs par les admins
supabase/seed.sql                      -- données de démonstration (DEV)
```

## Démarrage

```bash
npm install
cp .env.example .env   # renseigner VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

## Supabase

1. Créer un projet sur https://supabase.com
2. SQL Editor → exécuter `supabase/migrations/0001_init.sql`
3. (DEV uniquement) exécuter `supabase/seed.sql`
4. Storage → vérifier le bucket `event-images` (public en lecture, écriture admin)
5. Authentication → activer Email provider ; Site URL = `http://localhost:5173`
6. Créer le 1er admin manuellement :
   ```sql
   update public.profiles set role = 'admin' where email = 'admin@exemple.mg';
   ```

Tables : `profiles, categories, events, ticket_types, orders, order_items, payments, tickets, audit_logs`.
RLS activé partout (voir migration). Stock atomique via `reserve_stock()` / `release_stock()`.

## Scripts

```bash
npm run dev      # dev
npm run build    # tsc -b + vite build (vérif Phase 1)
npm run preview  # preview
npm run lint     # oxlint
```

## Architecture

```
src/
  app/config (env, query)
  app/providers (AppProviders)
  app/router (router)
  components/ui (Button, Input, Card, States)
  components/layout (Header, Public/Dashboard/Admin, Guards)
  features/auth (AuthContext, useProfile)
  hooks (useEvents, useOrders)
  lib (supabase, utils)
  schemas (auth, event/order/payment)
  types (database)
  pages/public | auth | dashboard | admin
supabase/
  migrations/0001_init.sql
  seed.sql
  functions/create-payment-intent, payment-webhook, _shared
```

Règles : pas d'appel Supabase dans les composants UI (hooks uniquement),
Zod sur tous les formulaires, rôle vérifié via `profiles.role` + RLS
(jamais le frontend seul), aucun secret dans `VITE_*`.

## Paiement (préparé Phase 5)

```
React → Edge Function → API Mobile Money → webhook → orders/payments → tickets
```

Voir `supabase/functions/_shared/payment-providers.ts`.
