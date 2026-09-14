/**
 * Types miroir du schéma PostgreSQL Supabase (Phase 1 + plateforme v2 Giga Vibe).
 * Source de vérité : supabase/migrations/0001_init.sql → 0005_platform_v2.sql
 * (Générer avec `supabase gen types` quand le projet Supabase est lié.)
 */

export type UserRole = 'user' | 'partner' | 'controller' | 'admin';
export type PartnerStatus = 'active' | 'pending' | 'suspended' | 'disabled';
export type EventStatus =
  | 'draft'
  | 'pending_review'
  | 'changes_requested'
  | 'published'
  | 'sold_out'
  | 'suspended'
  | 'cancelled'
  | 'completed';
export type TicketTypeStatus = 'active' | 'inactive' | 'sold_out';
export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired';
export type PaymentMethod =
  | 'yas'
  | 'orange_money'
  | 'airtel_money'
  | 'card'
  | 'cash';
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired';
export type TicketStatus = 'valid' | 'used' | 'cancelled' | 'expired';

export interface Profile {
  id: string; // auth.users.id
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: UserRole;
  partner_id: string | null; // migration 0005 (rôle partner)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Partner {
  id: string;
  name: string; // raison sociale
  manager_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  contract_info: string | null;
  status: PartnerStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformSetting {
  key: string;
  value: unknown;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string;
  address: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  organizer: string | null;
  status: EventStatus;
  is_featured: boolean;
  partner_id: string | null; // migration 0005 (NULL = événement GVE direct)
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number; // en Ariary
  quantity: number;
  sold: number;
  sales_start: string | null;
  sales_end: string | null;
  status: TicketTypeStatus;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string; // ORDER-2026-000001
  user_id: string;
  event_id: string;
  subtotal: number;
  fees: number;
  total: number;
  payment_method: PaymentMethod | null;
  payment_status: OrderStatus;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  holder_names: string[] | null; // migration 0002
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  provider: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider_ref: string | null;
  provider_payload: Record<string, unknown> | null;
  phone_number: string | null;
  receipt_url: string | null; // migration 0007 (capture du transfert)
  rejection_reason: string | null; // migration 0010 (motif du refus)
  validated_by: string | null;
  validated_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string; // TICKET-XXXXXXXX
  order_id: string;
  order_item_id: string | null;
  user_id: string;
  event_id: string;
  ticket_type_id: string;
  holder_name: string;
  qr_payload: string; // référence vérifiable côté serveur
  status: TicketStatus;
  used_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Helper Supabase générique minimal pour Phase 1. */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category>; Relationships: [] };
      events: { Row: Event; Insert: Partial<Event>; Update: Partial<Event>; Relationships: [] };
      ticket_types: { Row: TicketType; Insert: Partial<TicketType>; Update: Partial<TicketType>; Relationships: [] };
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order>; Relationships: [] };
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem>; Relationships: [] };
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment>; Relationships: [] };
      tickets: { Row: Ticket; Insert: Partial<Ticket>; Update: Partial<Ticket>; Relationships: [] };
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog>; Relationships: [] };
      partners: { Row: Partner; Insert: Partial<Partner>; Update: Partial<Partner>; Relationships: [] };
      platform_settings: { Row: PlatformSetting; Insert: Partial<PlatformSetting>; Update: Partial<PlatformSetting>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
