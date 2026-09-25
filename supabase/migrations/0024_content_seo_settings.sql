-- ============================================================
-- 0024_content_seo_settings.sql — Paramètres P1 (contenu, SEO,
-- opérateurs, emails/notifications)
--   - Opérateurs : payment_{yas,orange,airtel}_prefixes +
--     payment_instructions_{yas,orange,airtel}
--   - Tarifs : min_order_amount, service_fee_cap
--   - Contenu : refund_policy_text, terms_url
--   - SEO : seo_site_title, seo_site_description,
--     seo_og_image_url, seo_keywords
--   - Social : social_facebook_url, social_instagram_url,
--     social_tiktok_url, social_whatsapp, social_youtube_url
--   - Emails : email_brand_name, email_footer_text,
--     email_support_url, notify_payment_validated,
--     notify_payment_rejected, notify_event_published
-- Idempotent (INSERT ... ON CONFLICT DO NOTHING).
-- À exécuter APRÈS 0023 (SQL Editor ou `supabase db push`).
-- ============================================================

insert into public.platform_settings (key, value) values
  ('payment_yas_prefixes', '"034,038"'),
  ('payment_orange_prefixes', '"032,037"'),
  ('payment_airtel_prefixes', '"033"'),
  ('payment_instructions_yas', '""'),
  ('payment_instructions_orange', '""'),
  ('payment_instructions_airtel', '""'),
  ('min_order_amount', '1000'),
  ('service_fee_cap', '10000'),
  ('refund_policy_text', '"En cas d''annulation, remboursement automatique."'),
  ('terms_url', '"/cgu"'),
  ('seo_site_title', '"Giga Vibe Event — Billetterie événementielle"'),
  ('seo_site_description', '"Billetterie événementielle à Madagascar — concerts, festivals, sport, conférences. Paiement Mobile Money (YAS, Orange Money, Airtel Money)."'),
  ('seo_og_image_url', '"/logo.jpeg"'),
  ('seo_keywords', '"billetterie madagascar, concert antananarivo, yas money, orange money, airtel money"'),
  ('social_facebook_url', '""'),
  ('social_instagram_url', '""'),
  ('social_tiktok_url', '""'),
  ('social_whatsapp', '""'),
  ('social_youtube_url', '""'),
  ('email_brand_name', '"Giga Vibe Event"'),
  ('email_footer_text', '"Email automatique, merci de ne pas y répondre."'),
  ('email_support_url', '"/contact"'),
  ('notify_payment_validated', 'true'),
  ('notify_payment_rejected', 'true'),
  ('notify_event_published', 'true')
on conflict (key) do nothing;
