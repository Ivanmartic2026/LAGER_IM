# Guide: Scanning & Bilduppladdning för Korrekt AI-Extraktion

## 📸 Så tar du rätt bilder för bästa resultat

### Vad AI:n letar efter på bilderna

AI-systemet analyserar dina bilder och försöker hitta:

1. **Batch-nummer** (viktigast!)
   - Format: `P2.5250721228`, `BATCH-2024-001`, etc.
   - Ofta märkt med "Batch", "LOT", "Serial"

2. **Artikelnamn/Produktkod**
   - `P2.5 Gob`, `LED-Module-500x500`, etc.
   - Ofta överst på etiketten

3. **Tillverkningsdatum**
   - Format: `2024-01-15`, `15/01/2024`, `2024/01/15`
   - Märkt med "MFG Date", "Production Date", "制造日期"

4. **Tillverkare**
   - Företagsnamn eller logotyp
   - `Nick Everlasting`, `Novastar`, `Unilumin`, etc.

5. **Dimensioner**
   - `500x500mm`, `Width: 500`, `H: 1000`
   - Ofta med "mm" eller "cm"

6. **Vikt**
   - `6.5kg`, `Weight: 6500g`

7. **Pixel Pitch**
   - `P2.5`, `P3.91`, `Pixel Pitch: 2.5mm`

8. **QR/Streckkoder**
   - Innehåller ofta batch-nummer eller produktkod

---

## ✅ Rätt sätt att fotografera

### 📋 Bra bild - Hög AI-precision

```
✓ Välbelyst (inget bländande ljus)
✓ Etikett fylls hela bilden
✓ Skarp text (ej suddig)
✓ Rakt uppifrån (ej vinklad)
✓ All text synlig och läsbar
✓ QR-kod tydlig (om finns)
```

**Exempel på BRA bild:**
```
┌────────────────────────────┐
│  ╔══════════════════════╗  │
│  ║  PRODUCT LABEL       ║  │
│  ║                      ║  │
│  ║  P2.5 Indoor LED     ║  │ ← Tydlig produktkod
│  ║  Batch: P2.5250721228║  │ ← Batch-nummer läsbart
│  ║  MFG: 2024-01-15     ║  │ ← Datum korrekt format
│  ║  500x500x80mm        ║  │ ← Dimensioner tydliga
│  ║  Weight: 6.5kg       ║  │ ← Vikt synlig
│  ║  [QR CODE]           ║  │ ← QR-kod skarp
│  ╚══════════════════════╝  │
└────────────────────────────┘
     Etikett fyller bilden
```

---

### ❌ Undvik dessa misstag

**Problem 1: Suddig bild**
```
┌────────────────────────────┐
│  ╔══════════════════════╗  │
│  ║  ~~PRODUCT LABEL~~   ║  │ ← Text ej läsbar
│  ║  ~~~~~~~~~~~~~~~~     ║  │
│  ║  ~~~~~ ~~~~~~~~~~~~  ║  │
│  ╚══════════════════════╝  │
└────────────────────────────┘
    ❌ AI kan inte läsa text
```

**Problem 2: För mörk/mörka skuggor**
```
┌────────────────────────────┐
│ ███████████████████████    │
│ █PRODU█████████████         │ ← Text dold i skugga
│ ██████ch: ████████          │
│ ███████████████████         │
└────────────────────────────┘
    ❌ Delar av etikett skymd
```

**Problem 3: Etikett för liten i bild**
```
┌────────────────────────────┐
│                            │
│         ╔═════╗            │ ← Etikett för liten
│         ║ P2.5║            │
│         ╚═════╝            │
│                            │
└────────────────────────────┘
    ❌ AI kan inte läsa detaljer
```

**Problem 4: Vinklad/sned bild**
```
┌────────────────────────────┐
│    ╔══════════              │
│     ║ PRODUCT               │ ← Perspektiv fel
│      ║ Batch:               │
│       ║                     │
└────────────────────────────┘
    ❌ Text förvrängt
```

---

## 📝 Steg-för-steg: Scanna en artikel

### Steg 1: Gå till Scan
1. Öppna appen
2. Klicka på kamera-ikonen (högst ner till höger)
3. Välj **"Inleverans"** (eller annan typ)

### Steg 2: Ta bild eller ladda upp
**Alternativ A: Ta foto med kameran**
1. Klicka "Ta bild med kamera"
2. Positionera etiketten så den fyller bilden
3. Se till att ljuset är bra
4. Ta bilden

**Alternativ B: Ladda upp från galleri**
1. Klicka "Ladda upp från galleri"
2. Välj en tydlig bild av etiketten

**Tips:** Du kan ta flera bilder om etiketten är stor eller har info på flera ställen!

### Steg 3: AI analyserar bilden
- Systemet visar "Analyserar bilderna..."
- AI extraherar fält automatiskt
- Du kan börja redigera medan analysen pågår

### Steg 4: Granska extraherad data
AI visar alla fält den hittade:

```
┌─────────────────────────────────────┐
│ ✓ Batchnummer *                     │
│   P2.5250721228                     │
│   Confidence: 90%                   │
│                                     │
│ ✓ Artikelnamn *                     │
│   P2.5 Indoor LED                   │
│   Confidence: 90%                   │
│                                     │
│ □ Tillverkare                       │
│   Unilumin                          │
│   Confidence: 70%                   │
│                                     │
│ ✓ Tillverkningsdatum                │
│   2024-01-15                        │
│   Confidence: 85%                   │
└─────────────────────────────────────┘
```

**✓ = Valt att spara**
**□ = Ej valt (klicka för att inkludera)**
**\* = Obligatoriskt fält**

### Steg 5: Välj vilka fält som ska sparas
- Klicka på ett fält för att inkludera/exkludera det
- Redigera värden som AI:n missade eller fick fel
- **OBS:** Batch-nummer och Artikelnamn är obligatoriska!

### Steg 6: Spara
1. Kontrollera att minst Batch-nummer + Namn är ifyllda
2. Klicka "Spara X fält"
3. Artikeln skapas i systemet
4. Data skickas automatiskt till extern AI för validering

---

## 🎯 Vilka fält hamnar var

### Automatiskt extraherade (från bild)
Dessa sparas i `ai_extracted_data`:
- batch_number
- name
- manufacturing_date
- category
- manufacturer
- pixel_pitch_mm
- dimensions (width/height/depth)
- weight_kg

### Manuellt ifyllda (av dig)
- storage_type (Företagsägt/Kundägt)
- warehouse (Lagerställe)
- shelf_address (Hyllplats)
- stock_qty (Antal som inlevereras)
- supplier_name
- notes

### AI Confidence Scores
Systemet sparar också `ai_confidence_scores` för varje fält:
- 0.0-0.5 = Låg tillförlitlighet (dubbelkolla!)
- 0.5-0.8 = Medel tillförlitlighet
- 0.8-1.0 = Hög tillförlitlighet

---

## 🚨 Varningar och dubletter

### Batch-nummer redan finns
Om du scannar en artikel med samma batch-nummer:
```
⚠️ Varning: Dublett hittad!

Artikel med batch "P2.5250721228" finns redan:
• Namn: P2.5 Indoor LED
• Lagerställe: Huvudlager
• Nuvarande antal: 50

Vad vill du göra?
[Uppdatera befintlig] [Skapa ny ändå] [Avbryt]
```

**Uppdatera befintlig:**
- Lägger till ditt antal till befintlig artikel
- Rätt val om det är samma produkt

**Skapa ny ändå:**
- Skapar en separat artikel
- Använd om det är olika batch av samma produkt

---

## 📊 Efter uppladdning: Vad händer?

### 1. Artikel skapas i Base44
Alla valda fält sparas på artikeln

### 2. Automation triggar
"AI Granskning - Article" automation körs automatiskt

### 3. Data skickas till extern AI
```json
POST http://u1-server.tail5679ed.ts.net/webhook/base44

{
  "id": "article_id",
  "entity": "Article",
  "event_type": "CREATE",
  "data": {
    "batch_number": "P2.5250721228",
    "name": "P2.5 Indoor LED",
    "ai_extracted_data": {...},
    "ai_confidence_scores": {...}
  }
}
```

### 4. AI validerar och svarar
Extern AI kan:
- Verifiera batch-format
- Jämföra med historik
- Flagga avvikelser
- Ge rekommendationer

---

## 💡 Best Practices

### ✅ GÖR detta:
1. **Ta flera bilder** om etiketten är stor
2. **Kontrollera batch-numret** - det är viktigast!
3. **Välj rätt lagertyp** (Företagsägt/Kundägt)
4. **Fyll i antal** som inlevereras
5. **Lägg till hyllplats** direkt om du vet den

### ❌ UNDVIK detta:
1. **Sudiga bilder** - AI kan inte läsa text
2. **Mörka bilder** - använd blixten eller bättre ljus
3. **Spara utan batch-nummer** - obligatoriskt fält!
4. **Hoppa över granskning** - kolla alltid att datan stämmer
5. **Ignorera dublettvarningar** - kan skapa förvirring i lagret

---

## 🔍 Exempel: Komplett scanning

### Scenario: Inleverans av LED-kabinett

**1. Etikett ser ut så här:**
```
═══════════════════════════════════
    UNILUMIN LED CABINET
═══════════════════════════════════
Model:        UTV2.5 Indoor
Batch No:     UTV2.5-20240115-001
Mfg Date:     2024-01-15
───────────────────────────────────
Dimensions:   500x500x80mm
Weight:       6.5kg
Pixel Pitch:  2.5mm
Power:        120W
───────────────────────────────────
[QR CODE: UTV2.5-20240115-001]
═══════════════════════════════════
```

**2. Ta bild:**
- Fylld bild av hela etiketten
- Välbelyst
- Skarp text
- QR-kod tydlig

**3. AI extraherar:**
```
✓ batch_number: "UTV2.5-20240115-001"      (95%)
✓ name: "UTV2.5 Indoor"                     (92%)
✓ manufacturer: "Unilumin"                  (88%)
✓ manufacturing_date: "2024-01-15"          (90%)
✓ dimensions_width_mm: 500                  (95%)
✓ dimensions_height_mm: 500                 (95%)
✓ dimensions_depth_mm: 80                   (90%)
✓ weight_kg: 6.5                            (88%)
✓ pixel_pitch_mm: 2.5                       (93%)
```

**4. Du lägger till manuellt:**
```
• storage_type: "company_owned"
• warehouse: "Huvudlager"
• shelf_address: ["A-12-03"]
• stock_qty: 10
• category: "Cabinet"
• supplier_name: "Unilumin Sweden AB"
```

**5. Spara → Data skickas till AI:**
- Validering körs
- Batch-format kontrolleras
- Dimensioner verifieras mot produktdatabas
- Eventuella varningar visas

**6. Färdigt!**
Artikel finns nu i systemet med all korrekt data.

---

## 🆘 Felsökning

### Problem: AI hittar inga fält
**Lösning:**
1. Kontrollera att bilden är skarp
2. Se till att etiketten fyller bilden
3. Ta om bilden med bättre ljus
4. Fyll i fälten manuellt om AI misslyckas

### Problem: Fel batch-nummer extraherat
**Lösning:**
1. Redigera fältet manuellt
2. Dubbelkolla med fysiska etiketten
3. Spara med korrekt värde
4. AI lär sig från rättelser över tid

### Problem: Dublettvarning fast det är ny artikel
**Lösning:**
- Batch-numret kanske är liknande men inte identiskt
- Kolla noga: `UTV2.5-001` vs `UTV2.5-0001`
- Om verkligt olika, klicka "Skapa ny ändå"

### Problem: Många fält saknas
**Lösning:**
1. Ta fler bilder från olika vinklar
2. Zooma in på specifika delar av etiketten
3. Fyll i manuellt om data inte finns på etiketten

---

## 📋 Checklista: Perfekt scanning

- [ ] Bild är skarp och välbelyst
- [ ] Etikett fyller bildrutan
- [ ] QR-kod synlig (om finns)
- [ ] Batch-nummer är korrekt extraherat
- [ ] Artikelnamn stämmer
- [ ] Dimensioner verifierade
- [ ] Lagertyp vald (Företagsägt/Kundägt)
- [ ] Antal inlevererat ifyllt
- [ ] Hyllplats angiven (om känd)
- [ ] Granska alla valda fält före sparning

---

**Lycka till med scanningen! 🚀**

Med bra bilder får du 90%+ automatisk datafångst.