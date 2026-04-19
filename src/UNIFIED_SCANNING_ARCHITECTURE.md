# Unified Scanning Architecture — Implementation Summary

## ✅ Implementerad 2025-04-19

### **DEL 1 — SCHEMA-ÄNDRINGAR** ✓

#### Nya Entities
- **BatchAnalysis** — Generic analysis container för batch-analyser (quality_check, production_test, repair_diagnosis, site_inspection, etc)
- **MigrationRun** — Spåra migrerings-körningar

#### Utökade Entities
- **Article**: Added `legacy_batch_number` (audit trail), behållit `batch_number` (legacy marked)
- **Batch**: Added `legacy_unmigrated`, `merged_from_batch_ids`, `coupling_count`, `source_context`
- **ProductionRecord**: Added `article_id`, `batch_id`, `label_scan_ids`, `batch_analysis_ids`, `serial_number`
- **SiteReport**: Added `batch_ids`, `batch_analysis_ids`
- **SiteReportImage**: Added `batch_id`, `label_scan_id`, `batch_analysis_id`
- **RepairLog**: Added `label_scan_id`, `batch_analysis_ids`, `return_scan_required`
- **ReceivingRecord**: Behållit `image_urls` men märkt som LEGACY
- **LabelScan**: Added `migrated_legacy` status, context="production"

---

### **DEL 2 — UNIFIED SCANNING ACTION** ✓

#### `scanAndProcess`
**Enda ingångspunkten** för all scanning:

```javascript
scanAndProcess({
  image_url,
  image_urls,
  context: "purchase_receiving|article_creation|repair_return|site_report|production|manual_scan|reanalysis",
  context_reference_id,
  user_email
})
```

**Flöde:**
1. SHA-256 image hash + 7-dags dedup-check
2. Kall analyzeLabelWithKimi (befintlig action)
3. Article matching (SKU exact → name fuzzy)
4. Batch matching/creation
5. LabelScan record
6. Risk scoring
7. Context-specific linking (PO, RepairLog, SiteReport, ProductionRecord)

**Returnerar:**
```json
{
  "batch_id": "...",
  "article_id": "...",
  "label_scan_id": "...",
  "match_type": "sku_exact|name_fuzzy|created_new_article_and_batch|batch_found|dedupe_cached",
  "risk_score": 0-100,
  "needs_verification": boolean
}
```

---

### **DEL 3 — MIGRATION ACTIONS** ✓

#### Individuella migrations
1. **migrateArticleBatchNumbersToBatchEntity** — 369 artiklar → Batch-entity
2. **migrateBatchDuplicates** — Sammanslå duplicates baserat på coupling_count
3. **migrateRepairLogsToBatch** — Link RepairLog → Batch
4. **migrateReceivingRecordImagesToLabelScan** — Legacy image_urls → LabelScan
5. **migrateSiteReportImagesToBatchLinks** — SiteReportImage → Batch links
6. **migrateProductionRecordBatches** — Fyll ProductionRecord.serial_number

#### Meta-action
- **runFullMigration** — Köra alla steg i ordning, spara MigrationRun log

---

### **DEL 4 — BACKEND GUARDS** ✓

- **validateLabelScanGuard** — Kräver `context` vid LabelScan-insert
- **validateBatchGuard** — Kräver `article_id` ELLER `legacy_unmigrated=true` vid Batch-insert
- **rejectDeprecatedExtractedValueLog** — Avvisar ExtractedValueLog-poster (410 Gone)

---

### **DEL 5 — UI & NAVIGATION** ✓

#### New Pages
- **/MigrationCenter** — Admin-only migration dashboard
  - Visa migration-steg med progress
  - Bekräftelsedialog innan köring
  - MigrationRun-historik

#### Components
- **DeprecationBanner** — Gul banner för legacy scanning-sidor

#### Layout Updates
- Admin-menyn: Added MigrationCenter link

---

## 🔑 KRITISKA PUNKTER

### Data Integritet
- ✅ **INGEN DATA RADERAS** förutom:
  - TEST-* batches (från migrationen)
  - Förlorar-Batch-poster vid dublett-merge (men deras LabelScans + references bevaras och länkas till vinnaren)
- ✅ **ALL LEGACY DATA BEVARAD** — Article.batch_number, ReceivingRecord.image_urls, etc sparad men märkt som LEGACY
- ✅ **AUDIT TRAIL** — Article.legacy_batch_number sparar original för historik

### Scanning Konvergence
- ✅ **scanAndProcess = enda ingångspunkt** för all bild-processing
- ✅ **Context-aware** — samma funktion, olika logik beroende på källa
- ✅ **Idempotent dedup** — samma bild inom 7 dagar returnerar cached resultat

### Migration Safety
- ✅ **Stegvis** — varje migration kan köras separat eller alla tillsammans
- ✅ **Logging** — MigrationRun sparar alla steg + resultat
- ✅ **Admin-only** — guard på alla migrations-funktioner

---

## 📊 STATISTIK EFTER MIGRATION

**Input:**
- 369 Article-poster (många med batch_number)
- 3 Batch-poster (test-data)
- 0 LabelScan, ExtractedValueLog
- 14 ReceivingRecord
- 68 PurchaseOrderItem
- 22 SiteReportImage
- 3 RepairLog
- 5 ProductionRecord

**Expected Output:**
- 369 Article-poster (behållet)
- ~300-350 Batch-poster (skapade från Article.batch_number + dubletter sammanslagna)
- 22+ LabelScan (migrated legacy + nya from scanning)
- 0 TEST-* batches (raderade)
- 0 ExtractedValueLog-poster (deprecated, guard i plats)
- ALL duplikat-relaterade data sammanslagna under vinnare-Batch

---

## 🚀 NÄSTA STEG FÖR IVAN

1. **Kör migration**:
   - Logga in som admin
   - Gå till `/MigrationCenter`
   - Klicka "Starta migrering"
   - Vänta på stegvis progress (~5-10 minuter för 369 artiklar)

2. **Verifiera**:
   - Kontrollera MigrationRun-logg
   - Sök en artikel → kontrollera att primary_batch_id är satt
   - Scanningsystem ska automatiskt använda scanAndProcess

3. **Uppdatera UI** (framtida):
   - Integrera scanAndProcess i /scan-sidan för context-val
   - Visa risk_score + batch-info i formulär
   - Link till `/historical-reanalysis` för legacy-omanalys

---

## 📝 BREAKING CHANGES

- ❌ ExtractedValueLog-inserts blockas (guard)
- ❌ Batch-inserts utan `article_id` blockas (guard) om inte `legacy_unmigrated=true`
- ✅ Alla befintliga fält behållet för backward-kompatibilitet
- ✅ Gamla scanning-actions `analyzeLabelWithKimi` fungerar fortfarande (scanAndProcess använder dem internt)

---

**All data är intakt. INGA DELETES förutom TEST-* och merged-förlorare. Klart för produktion.**