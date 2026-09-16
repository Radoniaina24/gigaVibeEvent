import { Circle, Document, G, Image, Page, Path, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { TicketWithRelations } from '../orders/hooks';
import { formatAr, formatDate, formatShortDateTime } from '../../lib/utils';
// Même logo embarqué que le billet affiché (data-URL au build).
import logoEmbedded from '../../assets/logo.jpeg?inline';

const STATUS_LABEL: Record<string, string> = {
  valid: 'Valide',
  used: 'Utilisé',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

function badgeStyle(status: string) {
  switch (status) {
    case 'valid':
      return { backgroundColor: '#dcfce7', color: '#166534' };
    case 'used':
      return { backgroundColor: '#f4f4f5', color: '#3f3f46' };
    case 'cancelled':
    case 'expired':
      return { backgroundColor: '#fee2e2', color: '#b91c1c' };
    default:
      return { backgroundColor: '#fef3c7', color: '#92400e' };
  }
}

function holderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][parts[1].length - 1]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#fafafa', padding: 32, alignItems: 'center' },
  ticket: { width: 400, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, overflow: 'hidden' },
  brand: { backgroundColor: '#100607', paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },  logo: { width: 32, height: 32, borderRadius: 7, backgroundColor: '#ffffff' },
  logoFallback: { width: 32, height: 32, borderRadius: 7, backgroundColor: '#7f1d1d', alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  titles: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: 'bold', color: '#ffffff' },
  sub: { fontSize: 10, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  badge: { borderRadius: 999, paddingVertical: 2, paddingHorizontal: 10, fontSize: 11 },
  body: { flexDirection: 'column' },
  info: { flex: 1, padding: 16, minWidth: 0 },
  holderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: 999, backgroundColor: '#991b1b', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  who: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: 'bold', color: '#09090b' },
  num: { fontFamily: 'Courier', fontSize: 10, color: '#71717a', marginTop: 1 },
  amount: { textAlign: 'right' },
  price: { fontSize: 16, fontWeight: 'bold', color: '#09090b' },
  order: { fontSize: 10, color: '#71717a', marginTop: 1 },
  eventbox: { flexDirection: 'column', gap: 6, borderRadius: 12, backgroundColor: '#fafafa', padding: 10, marginTop: 8, fontSize: 12 },
  ev: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  evText: { flex: 1, minWidth: 0 },
  date: { fontSize: 12, color: '#09090b' },
  time: { fontSize: 11, color: '#71717a', marginTop: 1 },
  venue: { fontSize: 12, color: '#09090b' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  noteText: { fontSize: 11, color: '#71717a' },
  perf: { borderTopWidth: 2, borderTopColor: '#e4e4e7', borderTopStyle: 'dashed', marginHorizontal: 16, position: 'relative' },
  notch: { position: 'absolute', top: -9, width: 16, height: 16, borderRadius: 999, backgroundColor: '#fafafa' },
  stub: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  qrBox: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#ffffff', padding: 6 },
  qr: { width: 96, height: 96 },
  cap: { flex: 1, alignItems: 'flex-start', minWidth: 0 },
  lbl: { flexDirection: 'row', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.8 },
  stubNum: { fontFamily: 'Courier', fontSize: 10, color: '#a1a1aa', marginTop: 2 },
});

function Icon({ size, color, children }: { size: number; color: string; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </G>
    </Svg>
  );
}

export function TicketPdfDocument({
  ticket,
  qrDataUrl,
}: {
  ticket: TicketWithRelations;
  qrDataUrl: string;
}) {
  const hasLogo = logoEmbedded.startsWith('data:image');
  const isActive = ticket.status === 'valid';
  return (
    <Document title={ticket.ticket_number}>
      <Page size="A4" style={styles.page}>
        <View style={styles.ticket}>
          {/* Bandeau marque */}
          <View style={[styles.brand, !isActive ? { backgroundColor: '#18181b' } : {}]}>
            {hasLogo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoEmbedded} style={styles.logo} />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>GV</Text>
              </View>
            )}
            <View style={styles.titles}>
              <Text style={styles.title}>{ticket.event?.title ?? 'Événement'}</Text>
              <Text style={styles.sub}>
                {(ticket.ticket_type?.name ?? 'Billet')} · Giga Vibe Event
              </Text>
            </View>
            <Text style={[styles.badge, badgeStyle(ticket.status)]}>
              {STATUS_LABEL[ticket.status] ?? ticket.status}
            </Text>
          </View>

          {/* Corps + souche */}
          <View style={styles.body}>
            <View style={styles.info}>
              <View style={styles.holderRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{holderInitials(ticket.holder_name || '?')}</Text>
                </View>
                <View style={styles.who}>
                  <Text style={styles.name}>{ticket.holder_name}</Text>
                  <Text style={styles.num}>{ticket.ticket_number}</Text>
                </View>
                <View style={styles.amount}>
                  <Text style={styles.price}>
                    {ticket.ticket_type ? formatAr(ticket.ticket_type.price) : '—'}
                  </Text>
                  <Text style={styles.order}>{ticket.order?.order_number ?? ''}</Text>
                </View>
              </View>

              <View style={styles.eventbox}>
                <View style={styles.ev}>
                  <Icon size={14} color="#dc2626">
                    <Path d="M8 2v3" />
                    <Path d="M16 2v3" />
                    <Rect x={3} y={3} width={18} height={18} rx={2} />
                    <Path d="M3 9h18" />
                    <Path d="M8 13h.01" />
                    <Path d="M12 13h.01" />
                    <Path d="M16 13h.01" />
                    <Path d="M8 17h.01" />
                    <Path d="M12 17h.01" />
                    <Path d="M16 17h.01" />
                  </Icon>
                  <View style={styles.evText}>
                    <Text style={styles.date}>
                      {ticket.event ? formatDate(ticket.event.starts_at) : '—'}
                    </Text>
                    <Text style={styles.time}>
                      {ticket.event ? formatShortDateTime(ticket.event.starts_at) : '—'}
                    </Text>
                  </View>
                </View>
                <View style={styles.ev}>
                  <Icon size={14} color="#dc2626">
                    <Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                    <Circle cx={12} cy={10} r={3} />
                  </Icon>
                  <View style={styles.evText}>
                    <Text style={styles.venue}>
                      {ticket.event ? `${ticket.event.venue}, ${ticket.event.city}` : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.note}>
                <Icon size={12} color="#71717a">
                  <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <Circle cx={12} cy={7} r={4} />
                </Icon>
                <Text style={styles.noteText}>
                  Présentez ce billet avec une pièce d’identité si demandée.
                </Text>
              </View>
            </View>

            {/* Perforation */}
            <View style={styles.perf}>
              <View style={[styles.notch, { left: -24 }]} />
              <View style={[styles.notch, { right: -24 }]} />
            </View>

            {/* Souche QR */}
            <View style={styles.stub}>
              <View style={[styles.qrBox, !isActive ? { opacity: 0.6 } : {}]}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={qrDataUrl} style={styles.qr} />
              </View>
              <View style={styles.cap}>
                <View style={styles.lbl}>
                  <Icon size={12} color="#71717a">
                    <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <Path d="M7 12h10" />
                  </Icon>
                  <Text>Scan à l’entrée</Text>
                </View>
                <Text style={styles.stubNum}>{ticket.ticket_number}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
