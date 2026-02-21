# Webhook Integration Guide - Extern AI-validering

## Översikt
Detta system skickar automatiskt all viktigt data från Base44 till ett externt AI-system för validering, batch-kontroller, och rekommendationer.

---

## 🔧 Teknisk Arkitektur

### 1. Komponenter

#### Backend Function: `sendToExternalAI`
- **Plats:** `functions/sendToExternalAI.js`
- **Syfte:** Tar emot data från automationer och skickar till extern AI-validator
- **Endpoint:** `http://u1-server.tail5679ed.ts.net/webhook/base44`

#### Automationer (5 st)
1. **AI Granskning - Article** - Triggas vid create/update av artiklar
2. **AI Granskning - StockMovement** - Triggas vid lagertransaktioner
3. **AI Granskning - SupplierDocumentRequest** - Triggas vid dokumentförfrågningar
4. **AI Granskning - PurchaseOrder** - Triggas vid inköpsordrar
5. **AI Granskning - ReceivingRecord** - Triggas vid mottagningar

---

## 📋 Steg-för-steg Guide

### Steg 1: Konfiguration (KLART ✅)

**Secrets som är satta:**
```
WEBHOOK_URL=http://u1-server.tail5679ed.ts.net/webhook/base44
WEBHOOK_TOKEN=base44-webhook-token-2024-secure
```

**Var hittar jag Secrets?**
Dashboard → Settings → Environment Variables

---

### Steg 2: Backend Function (KLART ✅)

**Funktionen gör följande:**
1. Tar emot payload från automation
2. Omvandlar till standardiserat event-format:
   ```json
   {
     "id": "entity_id",
     "entity": "Article",
     "event_type": "CREATE" | "UPDATE",
     "occurred_at": "2026-02-21T...",
     "data": { ... entity data ... }
   }
   ```
3. Skickar till extern AI med headers:
   - `Content-Type: application/json`
   - `X-Webhook-Token: base44-webhook-token-2024-secure`
4. Tar emot svar från AI:
   ```json
   {
     "processed": {
       "review_status": "FLAGGED" | "OK",
       "warnings": [...],
       "recommendations": [...]
     }
   }
   ```

**Testa funktionen:**
```bash
Dashboard → Code → Functions → sendToExternalAI → Test
```

---

### Steg 3: Automationer (KLART ✅)

Alla 5 automationer är aktiva och körs automatiskt.

**Hur det fungerar:**
1. Användare skapar/uppdaterar en artikel
2. Base44 triggar automation "AI Granskning - Article"
3. Automation anropar `sendToExternalAI` med payload:
   ```json
   {
     "event": {
       "type": "create",
       "entity_name": "Article",
       "entity_id": "123..."
     },
     "data": { ... all article data ... },
     "old_data": null
   }
   ```
4. Funktionen skickar till extern AI
5. AI returnerar validering/rekommendationer

**Kontrollera automationer:**
```bash
Dashboard → Automations
```

---

## 🧪 Testa Systemet

### Test 1: Skapa ny artikel via scanning

1. Gå till appen → Scan
2. Välj "Inleverans"
3. Ta foto av en etikett
4. Spara artikeln

**Vad händer:**
- Artikel skapas med `ai_extracted_data` och `ai_confidence_scores`
- Automation "AI Granskning - Article" triggas
- Data skickas till `http://u1-server.tail5679ed.ts.net/webhook/base44`

**Verifiera:**
```bash
# På din U1-server, kolla loggar:
tail -f /var/log/u1-server/webhook.log

# Eller kolla Base44:
Dashboard → Code → Functions → sendToExternalAI → Logs
```

---

### Test 2: Uppdatera lagersaldo

1. Gå till Inventory
2. Välj en artikel
3. Klicka "Lägg till lager" → ange antal → spara

**Vad händer:**
- `StockMovement` skapas
- Automation "AI Granskning - StockMovement" triggas
- Data skickas till extern AI

---

### Test 3: Skapa inköpsorder

1. Gå till Purchase Orders
2. Skapa ny order
3. Lägg till artiklar
4. Spara

**Vad händer:**
- `PurchaseOrder` + `PurchaseOrderItem` skapas
- Automation triggas för båda
- Data skickas till AI för batch-validering

---

## 📊 Data som skickas

### Artikel (Article)
```json
{
  "id": "69995ba1...",
  "entity": "Article",
  "event_type": "CREATE",
  "occurred_at": "2026-02-21T07:16:27.280Z",
  "data": {
    "name": "Test AI Integration",
    "batch_number": "BATCH-TEST-2024-999",
    "stock_qty": 0,
    "ai_extracted_data": {
      "batch_number": "P3RGB27S-80X80-A1.0",
      "manufacturing_date": "2020/12/15",
      "pixel_pitch_mm": 3,
      ...
    },
    "ai_confidence_scores": {
      "batch_number": 0.9,
      "name": 0.9,
      ...
    }
  }
}
```

### Lagerrörelse (StockMovement)
```json
{
  "id": "...",
  "entity": "StockMovement",
  "event_type": "CREATE",
  "data": {
    "article_id": "...",
    "movement_type": "inbound",
    "quantity": 10,
    "previous_qty": 0,
    "new_qty": 10,
    "reason": "Inleverans via scanning"
  }
}
```

### Inköpsorder (PurchaseOrder)
```json
{
  "id": "...",
  "entity": "PurchaseOrder",
  "event_type": "UPDATE",
  "data": {
    "po_number": "PO-2024-001",
    "supplier_name": "Acme Corp",
    "status": "confirmed",
    "total_cost": 15000
  }
}
```

---

## 🔍 Förväntat AI-svar

Ditt externa AI-system bör returnera:

```json
{
  "processed": {
    "review_status": "OK" | "FLAGGED" | "WARNING",
    "confidence": 0.95,
    "warnings": [
      "Batch nummer matchar inte tillverkarens standard format",
      "Dimensioner verkar avvika från specifikation"
    ],
    "recommendations": [
      "Dubbelkolla tillverkningsdatum med leverantör",
      "Uppdatera pixel pitch till 3.0mm baserat på bilden"
    ],
    "discrepancies": [
      {
        "field": "batch_number",
        "expected": "BATCH-2024-001",
        "actual": "BATCH-TEST-2024-999",
        "severity": "medium"
      }
    ]
  }
}
```

---

## 🛠️ Felsökning

### Problem: Webhook når inte extern server

**Lösning:**
1. Testa webhook URL manuellt:
   ```bash
   curl -X POST http://u1-server.tail5679ed.ts.net/webhook/base44 \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Token: base44-webhook-token-2024-secure" \
     -d '{"test": "data"}'
   ```

2. Kontrollera att U1-server är igång
3. Kolla firewall-regler på Tailscale

---

### Problem: Data når inte fram

**Lösning:**
1. Kolla function logs:
   ```bash
   Dashboard → Code → Functions → sendToExternalAI → Logs
   ```

2. Verifiera att automationen körs:
   ```bash
   Dashboard → Automations → AI Granskning - Article → View History
   ```

3. Testa funktionen manuellt:
   ```bash
   Dashboard → Code → Functions → sendToExternalAI → Test
   # Payload:
   {
     "event": {"type": "create", "entity_name": "Article"},
     "data": {"name": "Test", "batch_number": "123"}
   }
   ```

---

### Problem: AI-svar når inte Base44

**Obs:** Base44 tar emot svaret men gör inget med det just nu. Om du vill spara AI-feedback:

**Skapa ny entity:**
```json
{
  "name": "AIValidationResult",
  "type": "object",
  "properties": {
    "entity_id": {"type": "string"},
    "entity_type": {"type": "string"},
    "review_status": {
      "type": "string",
      "enum": ["OK", "FLAGGED", "WARNING"]
    },
    "warnings": {
      "type": "array",
      "items": {"type": "string"}
    },
    "recommendations": {
      "type": "array", 
      "items": {"type": "string"}
    },
    "discrepancies": {"type": "array"}
  }
}
```

**Uppdatera function:**
```javascript
// I sendToExternalAI.js, efter att ha fått svar:
if (result.processed) {
  await base44.asServiceRole.entities.AIValidationResult.create({
    entity_id: payload.event.entity_id,
    entity_type: payload.event.entity_name,
    review_status: result.processed.review_status,
    warnings: result.processed.warnings || [],
    recommendations: result.processed.recommendations || []
  });
}
```

---

## 📈 Användningsfall

### Use Case 1: Batch-validering
- AI jämför batch-nummer med tillverkarens format
- Flaggar avvikelser
- Rekommenderar korrigeringar

### Use Case 2: Inventerings-avvikelser
- AI upptäcker stora skillnader mellan förväntat/faktiskt lager
- Skickar varning till admin
- Föreslår inventering

### Use Case 3: Leverantörs-dokumentation
- AI verifierar att alla nödvändiga dokument finns
- Kontrollerar batch-nummer mot produktspecifikationer
- Flaggar saknade certifikat

### Use Case 4: Inköpsorder-kontroll
- AI jämför priser mot historik
- Upptäcker dubbla ordrar
- Varnar för ovanligt stora avvikelser

---

## 🔐 Säkerhet

### Token-autentisering
Alla requests till extern AI inkluderar:
```
X-Webhook-Token: base44-webhook-token-2024-secure
```

Ditt AI-system MÅSTE validera denna token innan processing.

### Nätverkssäkerhet
- Webhook går via Tailscale VPN (`tail5679ed.ts.net`)
- Endast auktoriserade enheter kan nå servern
- HTTPS rekommenderas för produktion

---

## 📞 Support

**Problem med Base44:**
- Dashboard → Help
- support@base44.com

**Problem med AI-integration:**
- Kolla denna guide
- Verifiera secrets i Settings
- Testa webhook manuellt
- Granska function logs

---

## ✅ Checklista - Allt klart!

- [x] Secrets konfigurerade (WEBHOOK_URL, WEBHOOK_TOKEN)
- [x] Backend function `sendToExternalAI` skapad
- [x] 5 automationer skapade och aktiva
- [x] Testdata skickat (Article "Test AI Integration")
- [x] AI-fält läggs till automatiskt (`ai_extracted_data`, `ai_confidence_scores`)

**Nästa steg:**
1. Testa genom att skanna en ny artikel
2. Verifiera på U1-server att data kommer fram
3. Implementera AI-logik för validering
4. (Valfritt) Skapa AIValidationResult entity för att spara feedback

---

**Senast uppdaterad:** 2026-02-21