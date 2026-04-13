// Shared print style constants
export const BLUE = '#1B3F6E';
export const LIGHT_GRAY = '#F5F5F5';
export const BORDER_COLOR = '#E0E0E0';
export const LABEL_COLOR = '#888';
export const WARNING_BG = '#FFF8E6';
export const WARNING_BORDER = '#EF9F27';

export const sectionTitle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: BLUE,
  borderBottom: `2px solid ${BLUE}`,
  paddingBottom: 4,
  marginBottom: 10,
  marginTop: 18,
};

export const label = {
  fontSize: 10,
  color: LABEL_COLOR,
  marginBottom: 1,
};

export const value = {
  fontSize: 12,
  color: '#111',
  fontWeight: 500,
};

export const tableHeader = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: BLUE,
  borderBottom: `2px solid ${BLUE}`,
  padding: '4px 6px',
  textAlign: 'left',
};

export const tableCell = {
  fontSize: 11,
  padding: '4px 6px',
  borderBottom: `1px solid ${BORDER_COLOR}`,
  verticalAlign: 'top',
};

export const footer = (pageNum, orderNumber) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 9,
  color: '#999',
  borderTop: `1px solid ${BORDER_COLOR}`,
  paddingTop: 4,
  orderNumber,
  pageNum,
});

export const INSTALLATION_TYPE_LABELS = {
  ny_installation: 'Ny installation',
  byte_uppgradering: 'Byte / Uppgradering',
  tillagg: 'Tillägg',
  service_reparation: 'Service / Reparation',
  uthyrning_event: 'Uthyrning / Event',
};

export const PRIORITY_LABELS = {
  låg: 'Låg',
  normal: 'Normal',
  hög: 'Hög',
  brådskande: 'Brådskande',
};

export const DELIVERY_METHOD_LABELS = {
  truck: 'Lastbil',
  courier: 'Bud/kurir',
  pickup: 'Hämtas',
  air_freight: 'Flygfrakt',
  sea_freight: 'Sjöfrakt',
  other: 'Övrigt',
};