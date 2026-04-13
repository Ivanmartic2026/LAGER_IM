import { sectionTitle } from './printStyles';

const checkItem = (text) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '2px 0', fontSize: 11 }}>
    <span style={{ fontSize: 13, lineHeight: '16px' }}>☐</span>
    <span>{text}</span>
  </div>
);

export default function PrintChecklist() {
  return (
    <div>
      <div style={sectionTitle}>Installationschecklista</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left column */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', marginBottom: 4 }}>
            Före installation
          </div>
          {checkItem('Kontrollera leverans mot följesedel')}
          {checkItem('Fotografera vid mottagning')}
          {checkItem('Verifiera mått och tillgång på plats')}

          <div style={{ fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', marginTop: 8, marginBottom: 4 }}>
            Under installation
          </div>
          {checkItem('Montera fästen enligt ritning')}
          {checkItem('Installera och anslut enheter')}
          {checkItem('Kabelanslutning och ström')}
        </div>

        {/* Right column */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', marginBottom: 4 }}>
            Efter installation
          </div>
          {checkItem('Funktionstest')}
          {checkItem('Dokumentera serienummer')}
          {checkItem('Kundgenomgång')}
          {checkItem('Kund signerar godkännande')}

          <div style={{ fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', marginTop: 8, marginBottom: 4 }}>
            Avvikelser
          </div>
          <div style={{
            border: '1.5px dashed #ccc',
            borderRadius: 4,
            minHeight: 50,
            padding: 6,
            fontSize: 10,
            color: '#bbb',
          }}>
            Notera eventuella avvikelser här...
          </div>
        </div>
      </div>
    </div>
  );
}