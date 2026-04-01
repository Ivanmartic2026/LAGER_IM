# IMvision Lager & Order System - Komplett Dokumentation

## Systemöversikt

IMvision är ett komplett lager- och orderhanteringssystem för LED-skärmar och komponenter. Systemet hanterar:

- 📦 Lagerhantering med multi-lagerställen
- 📋 Orderhantering och plockning
- 🛒 Inköpsordrar och mottagning
- 🔧 Reparationshantering
- 📊 Rapporter och analytics
- 📱 Mobil-först PWA med offline-stöd
- 📷 AI-driven skanning av etiketter

---

## Datamodell (Entities)

### Article (Artikel)
Huvudentitet för alla lagerartiklar.

**Fält**:
- `sku` - Artikelnummer (unikt)
- `name` - Benämning
- `supplier_id` - Referens till Supplier
- `supplier_name` - Leverantörens namn (denormaliserad)
- `unit_cost` - Enhetskostnad
- `supplier_product_code` - Leverantörens produktkod
- `category` - Typ: Cabinet, LED Module, Power Supply, Receiving Card, Control Processor, Computer, Cable, Accessory, Other
- `storage_type` - Lagertyp: company_owned, customer_owned
- `dimensions_width_mm` - Bredd (mm)
- `dimensions_height_mm` - Höjd (mm)
- `dimensions_depth_mm` - Djup (mm)
- `weight_g` - Vikt (g)
- `stock_qty` - I lager (antal)
- `reserved_stock_qty` - Reserverat för pågående ordrar
- `warehouse` - Lagerställe
- `shelf_address` - Lagerplatser (array)
- `batch_number` - Batch nummer
- `pixel_pitch_mm` - Pixel Pitch (mm)
- `customer_name` - Kundnamn/Marknadsnamn
- `pitch_value` - Pixel pitch värde (t.ex. P1.95, P2.6)
- `series` - Produktserie: Indoor, Outdoor, UltraBright, QP4, Other
- `product_version` - Produktversion
- `manufacturer` - Tillverkare
- `manufacturing_date` - Tillverkningsdatum
- `brightness_nits` - Ljusstyrka i nits
- `status` - active, low_stock, out_of_stock, discontinued, on_repair, unknown_delivery, pending_verification
- `image_urls` - Bilder på artikeln/etiketten (array)
- `notes` - Anteckningar
- `min_stock_level` - Minsta lagernivå för varning
- `repair_notes` - Anledning till reparation
- `repair_date` - Datum när artikel skickades på reparation
- `cfg_file_url` - Länk till CFG-konfigurationsfil
- `unknown_delivery_reference` - Referensnummer för okänd inleverans
- `delivery_date` - Datum för inleverans
- `assigned_to` - Vem som utreder den okända leveransen (email)

**Required**: `name`, `storage_type`

### StockMovement (Lagerrörelse)
Spårar alla lagertransaktioner.

**Fält**:
- `article_id` - Referens till artikel
- `movement_type` - inbound, outbound, adjustment, inventory
- `quantity` - Antal (positivt för in, negativt för ut)
- `previous_qty` - Tidigare lagersaldo
- `new_qty` - Nytt lagersaldo
- `reason` - Anledning till rörelse
- `reference` - Referens t.ex. ordernummer

**Required**: `article_id`, `movement_type`, `quantity`

### Order (Order)
Utgående ordrar från kunder.

**Fält**:
- `order_number` - Ordernummer
- `customer_name` - Kundnamn
- `customer_reference` - Kundreferens
- `status` - draft, ready_to_pick, picking, picked, delivered, cancelled
- `priority` - low, normal, high, urgent
- `delivery_date` - Önskat leveransdatum
- `delivery_address` - Leveransadress
- `notes` - Anteckningar
- `picked_by` - Plockad av (användarens email)
- `picked_date` - Plockdatum
- `needs_ordering` - Kräver beställning (boolean)
- `ordering_completed` - Beställning genomförd (boolean)
- `ordering_notes` - Beställningsanteckningar
- `fortnox_invoiced` - Ordern är fakturerad i Fortnox (boolean)
- `fortnox_invoice_number` - Fakturanummer från Fortnox
- `invoiced_date` - Datum när ordern fakturerades
- `invoiced_by` - Vem som markerade ordern som fakturerad (email)
- `is_incomplete` - Order är ofullständig (boolean)

**Required**: `customer_name`

### OrderItem (Orderrad)
Individuella artiklar i en order.

**Fält**:
- `order_id` - Referens till order
- `article_id` - Referens till artikel
- `article_name` - Artikelnamn
- `article_batch_number` - Batch nummer
- `shelf_address` - Hyllplats
- `quantity_ordered` - Beställd mängd
- `quantity_picked` - Plockad mängd
- `status` - pending, partial, picked

**Required**: `order_id`, `article_id`, `quantity_ordered`

### PurchaseOrder (Inköpsorder)
Inkommande ordrar till leverantörer.

**Fält**:
- `po_number` - Inköpsordernummer
- `supplier_id` - Referens till leverantör
- `supplier_name` - Leverantörens namn
- `fortnox_project_number` - Projektnummer Fortnox
- `status` - draft, ordered, prepaid, received, cancelled
- `expected_delivery_date` - Förväntat leveransdatum
- `order_date` - Orderdatum
- `received_date` - Mottagningsdatum
- `received_by` - Mottagen av (användarens email)
- `total_cost` - Total kostnad
- `notes` - Anteckningar

**Required**: `supplier_name`, `fortnox_project_number`

### PurchaseOrderItem (Inköpsorderrad)
**Fält**:
- `purchase_order_id` - Referens till inköpsorder
- `article_id` - Referens till artikel
- `article_name` - Artikelnamn
- `article_batch_number` - Batch nummer
- `quantity_ordered` - Beställd mängd
- `quantity_received` - Mottagen mängd
- `unit_price` - Enhetspris
- `status` - pending, partial, received

**Required**: `purchase_order_id`, `article_id`, `quantity_ordered`

### ReceivingRecord (Mottagningspost)
Spårar mottagning av varor.

**Fält**:
- `purchase_order_id` - Referens till inköpsorder
- `purchase_order_item_id` - Referens till inköpsorderrad
- `article_id` - Referens till artikel
- `article_name` - Artikelnamn
- `quantity_received` - Mottagen kvantitet
- `shelf_address` - Lagerplats där varorna placerats
- `quality_check_passed` - Om kvalitetskontroll utförts (boolean)
- `has_discrepancy` - Om det finns avvikelser (boolean)
- `discrepancy_reason` - Anledning till avvikelse
- `image_urls` - Bilder från mottagningen (array)
- `notes` - Anteckningar om mottagningen
- `received_by` - Vem som mottog varorna (email)

**Required**: `purchase_order_id`, `purchase_order_item_id`, `quantity_received`

### RepairLog (Reparationslogg)
Spårar artiklar på reparation.

**Fält**:
- `article_id` - Referens till artikeln
- `article_name` - Artikelnamn
- `article_batch_number` - Batch nummer
- `repair_date_start` - Datum då reparationen påbörjades
- `repair_date_end` - Datum då reparationen avslutades/artikeln återfördes
- `notes` - Anteckningar om reparationen
- `status` - in_progress, completed, discarded, cancelled
- `returned_quantity` - Antal returnerade till lager
- `discarded_quantity` - Antal kasserade
- `processed_by` - Användaren som hanterade reparationen (email)

**Required**: `article_id`, `repair_date_start`, `status`

### Supplier (Leverantör)
**Fält**:
- `name` - Leverantörens namn
- `contact_person` - Kontaktperson
- `email` - E-postadress
- `phone` - Telefonnummer
- `address` - Adress
- `website` - Webbsida
- `standard_delivery_days` - Standard leveranstid i dagar (default: 7)
- `notes` - Anteckningar
- `is_active` - Om leverantören är aktiv (boolean)

**Required**: `name`

### Warehouse (Lagerställe)
**Fält**:
- `name` - Namn på lagerställe
- `code` - Kort kod för lagret
- `address` - Fysisk adress
- `contact_person` - Kontaktperson
- `is_active` - Om lagret är aktivt (boolean)
- `notes` - Anteckningar

**Required**: `name`

### Shelf (Hyllplats)
**Fält**:
- `warehouse_id` - Referens till lagerställe
- `shelf_code` - Hyllkod (t.ex. A1-B2, G-04-03)
- `description` - Beskrivning av hyllan
- `aisle` - Gång/sektion
- `rack` - Ställning/hylla
- `level` - Hyllplan/nivå
- `width_cm` - Hyllans bredd i cm
- `height_cm` - Hyllans höjd i cm
- `depth_cm` - Hyllans djup i cm
- `is_active` - Om hyllan är aktiv (boolean)
- `notes` - Anteckningar

**Required**: `warehouse_id`, `shelf_code`

### ProductAssembly (Produktmontering)
Kopplar ihop färdiga produkter med deras komponenter.

**Fält**:
- `parent_article_id` - Referens till färdig produkt
- `parent_article_name` - Namn på färdig produkt
- `part_article_id` - Referens till reservdel/komponent
- `part_article_name` - Namn på reservdel
- `quantity_needed` - Antal av reservdelen per enhet
- `notes` - Anteckningar
- `is_critical` - Om denna del är kritisk (boolean)
- `position` - Position eller monteringsplats

**Required**: `parent_article_id`, `part_article_id`, `quantity_needed`

### InternalWithdrawal (Internt uttag)
Spårar uttag som senare ska kopplas till ordrar.

**Fält**:
- `article_id` - Referens till artikel
- `article_name` - Artikelnamn
- `article_batch_number` - Batch nummer
- `quantity` - Uttagen kvantitet
- `customer_reference` - Kund/kommentar om vart det ska
- `status` - pending, linked
- `linked_order_id` - Kopplad till order
- `withdrawn_by` - Vem som plockade ut (email)
- `notes` - Anteckningar

**Required**: `article_id`, `quantity`, `customer_reference`

### Notification (Notifiering)
**Fält**:
- `user_email` - Mottagarens email
- `title` - Notifieringens titel
- `message` - Notifieringsmeddelande
- `type` - order_status, low_stock, stock_alert, repair_update, purchase_order, system
- `priority` - low, normal, high, critical
- `is_read` - Om notifieringen är läst (boolean)
- `link_to` - Länk till relevant sida
- `link_page` - Sidnamn att länka till
- `metadata` - Extra metadata (object)

**Required**: `user_email`, `title`, `message`, `type`

### NotificationSettings (Notifieringsinställningar)
**Fält**:
- `user_email` - Användarens email
- `in_app_enabled` - In-app notifieringar aktiverade (boolean)
- `email_enabled` - Email notifieringar aktiverade (boolean)
- `order_status_updates` - Notifiering vid orderstatus ändringar (boolean)
- `low_stock_alerts` - Notifiering vid lågt lager (boolean)
- `purchase_order_updates` - Notifiering vid inköpsorder uppdateringar (boolean)
- `repair_updates` - Notifiering vid reparationsuppdateringar (boolean)
- `critical_only` - Endast kritiska notifieringar (boolean)

**Required**: `user_email`

### ReportSchedule (Rapportschema)
**Fält**:
- `name` - Namn på rapporten
- `report_type` - stock_summary, stock_movements, low_stock, full_inventory
- `frequency` - daily, weekly, monthly
- `email_recipients` - E-postadresser att skicka till (array)
- `filters` - Filter för rapporten (object)
- `date_range` - Tidsperiod för rapporten (object)
- `is_active` - Om schemat är aktivt (boolean)
- `last_sent` - När rapporten senast skickades
- `next_send` - När rapporten nästa ska skickas

**Required**: `name`, `report_type`, `frequency`, `email_recipients`

### PushSubscription (Push-prenumeration)
För PWA push-notifikationer.

**Fält**:
- `user_email` - Användarens email
- `endpoint` - Push-tjänstens endpoint URL
- `keys` - Krypteringsnycklar (object med p256dh, auth)
- `user_agent` - Webbläsare och enhetsinfo
- `is_active` - Om prenumerationen är aktiv (boolean)

**Required**: `user_email`, `endpoint`, `keys`

---

## Sidstruktur

### pages/Home
**Syfte**: Dashboard med översikt och snabbåtkomst.

**Funktioner**:
- Visar statistik (totalt lager, lågt lager, ordrar, reparationer)
- Snabblänkar till vanliga funktioner
- Senaste aktivitet
- Varningar och alerts

### pages/Inventory
**Syfte**: Huvudvy för lagerhantering.

**Funktioner**:
- Lista alla artiklar med filtrering (status, lager, kategori)
- Sök på artikelnummer, batch, namn, tillverkare
- Sortering (nyast, namn, batch, hylla, leverantör, saldo)
- Bulk-operationer (redigera, ta bort flera)
- Export till Excel/CSV
- Import från Excel
- Visar inkommande kvantiteter från inköpsordrar
- Klickbar för detaljvy

**Filter**:
- Status: Alla, Aktiv, Lågt, Slut, Reparation
- Lagerställe
- Lagertyp: Företagsägt/Kundägt
- Kategori

### pages/Scan
**Syfte**: AI-driven skanning och snabbregistrering.

**Modes**:
1. **Barcode Scan**: Skanna streckkoder
2. **Inbound**: Registrera inkommande artiklar
3. **Adjust**: Justera lagersaldo
4. **Unknown Delivery**: Registrera okända leveranser

**Funktioner**:
- Kameraåtkomst för fotografi
- AI-analys av etiketter (OCR + LLM)
- Automatisk datafyllning
- Batchnummer-generering
- SKU-generering
- Direkt lagring till databas

**Workflow**:
1. Välj mode
2. Skanna/fotografera
3. AI analyserar
4. Granska och justera data
5. Spara

### pages/Orders
**Syfte**: Hantera utgående kundordrar.

**Funktioner**:
- Lista ordrar med status
- Skapa nya ordrar
- Orderdetaljer med alla orderrader
- Plockning (stegvis eller bulk)
- Fakturering via Fortnox
- Export till PDF/Excel
- Länka internt uttag till order

**Status**:
- Draft (utkast)
- Ready to pick (redo att plocka)
- Picking (plockas)
- Picked (plockad)
- Delivered (levererad)
- Cancelled (avbruten)

### pages/PickOrder
**Syfte**: Optimerad vy för orderplockning.

**Funktioner**:
- Visar orderrader sorterade per hyllplats
- Stöd för streckkodsskanning vid plockning
- Markera plockade artiklar
- Partiell plockning
- Anteckningar per rad
- Slutför plockning

### pages/PurchaseOrders
**Syfte**: Hantera inköpsordrar till leverantörer.

**Funktioner**:
- Skapa inköpsordrar
- Lägg till artiklar
- Koppla till Fortnox-projekt
- Förväntad leverans
- Status: Draft, Ordered, Prepaid, Received
- Mottagning (delvis eller full)
- Export till PDF
- Email till leverantör

### pages/ReceivePurchaseOrder
**Syfte**: Ta emot inköpsordrar.

**Funktioner**:
- Välj inköpsorder
- Visa orderrader
- Registrera mottagen kvantitet per rad
- Välj hyllplats
- Kvalitetskontroll
- Avvikelserapportering
- Fotografera följesedel/skador
- Uppdatera lagersaldo automatiskt
- Skapa StockMovement

### pages/Repairs
**Syfte**: Hantera artiklar på reparation.

**Funktioner**:
- Lista reparationer
- Skicka artikel på reparation
- Återför från reparation (helt/delvis/kasserad)
- Status: In progress, Completed, Discarded
- Export reparationsrapport
- Historik per artikel

### pages/UnknownDeliveries
**Syfte**: Hantera artiklar med okänd ursprung.

**Funktioner**:
- Lista artiklar med status "unknown_delivery"
- Tilldela till användare för utredning
- Kommentera och uppdatera
- Ändra status när utrett
- Koppla till inköpsorder eller order

### pages/Warehouses
**Syfte**: Hantera lagerställen och hyllplatser.

**Funktioner**:
- Lista lagerställen
- Skapa/redigera lagerställen
- Visa layout med hyllor
- Bulk-skapa hyllor (A1-A10, etc.)
- Visualisera utnyttjande per hylla
- Placeringsförslag för nya artiklar

### pages/Admin
**Syfte**: Administratörsfunktioner.

**Funktioner**:
- Användarhantering
- Systeminställningar
- Leverantörshantering
- Rapportscheman
- Backup/restore
- Systemloggar

### pages/Reports
**Syfte**: Generera rapporter.

**Typer**:
- Lagersaldo
- Lagerrörelser
- Lågt lager
- Ordrar per kund
- Inköp per leverantör
- Lagervärde
- Turnover

**Funktioner**:
- Filtrera efter period, kategori, lager
- Export till Excel/PDF
- Schemalagda rapporter via email

### pages/Analytics
**Syfte**: Visualisera nyckeltal.

**Dashboards**:
- Lageromsättning
- Top artiklar
- Lagervärde över tid
- Order vs. Inköp
- Leverantörsprestanda

---

## Komponenter

### components/articles/ArticleDetail
Detaljerad artikelvy.

**Props**: `article`, `onBack`, `onEdit`, `onDelete`, `onAdjustStock`

**Funktioner**:
- Bildgalleri
- Alla artikelattribut
- Redigera/ta bort
- Justera lager (+/-)
- Lagerrörelser (historik)
- Monteringsdelar (om relevant)
- Relaterade ordrar
- Reparationshistorik
- Ladda ner etiketter (A4/liten)
- Skicka på reparation

### components/articles/ArticleEditForm
Formulär för redigering.

**Props**: `article`, `onSave`, `onCancel`, `isSaving`

**Fält**:
- Grundinfo (namn, SKU, tillverkare)
- Mått och vikt
- Lagring (lager, hylla, batch)
- Tekniska detaljer (pitch, ljusstyrka, etc.)
- Bilder (upload/ta bort)

**Funktioner**:
- SKU-generering
- Leverantörssök
- Placeringsförslag

### components/articles/StockAdjustmentModal
Modal för lagerjustering.

**Props**: `isOpen`, `onClose`, `article`, `type`, `onSubmit`, `isSubmitting`

**Types**: `add`, `remove`

**Funktioner**:
- Input för antal
- Input för anledning
- Visar nytt lagersaldo
- Skapar StockMovement

### components/articles/RepairModal
Skicka artikel på reparation.

**Props**: `article`, `onClose`, `onSubmit`

**Funktioner**:
- Välj antal
- Anledning
- Uppdatera artikel status
- Skapa RepairLog

### components/articles/ReturnFromRepairModal
Återför artikel från reparation.

**Props**: `repairLog`, `onClose`, `onSubmit`

**Funktioner**:
- Returnerad kvantitet
- Kasserad kvantitet
- Uppdatera lagersaldo
- Avsluta RepairLog

### components/articles/ProductAssemblyManager
Hantera monteringsdelar.

**Props**: `article`

**Funktioner**:
- Lista komponenter
- Lägg till komponenter
- Ta bort komponenter
- Visa om komponenter finns i lager

### components/scanner/BarcodeScanner
Streckkodsskanning.

**Props**: `onDetected`, `onError`

**Teknologi**: @zxing/library

**Funktioner**:
- Kameraåtkomst
- Realtidsskanning
- Callback vid detektering

### components/scanner/CameraCapture
Fotografi för AI-analys.

**Props**: `onCapture`, `onClose`

**Funktioner**:
- Kameraåtkomst
- Ta foto
- Retry
- Returnera base64 image

### components/scanner/ReviewForm
Granska AI-extraherad data.

**Props**: `extractedData`, `onSave`, `onCancel`, `mode`

**Funktioner**:
- Visa alla fält
- Redigera varje fält
- Förslag (leverantör, hylla)
- Validering
- Submit

### components/orders/OrderForm
Skapa/redigera order.

**Props**: `order`, `onSave`, `onCancel`

**Funktioner**:
- Kundinformation
- Lägg till artiklar (sök och välj)
- Antal per artikel
- Prioritet
- Leveransdatum
- Anteckningar

### components/orders/OrderDetailModal
Visa orderdetaljer.

**Props**: `order`, `onClose`

**Funktioner**:
- Alla orderrader
- Plockstatus
- Ändra status
- Export
- Fakturera

### components/orders/PickingItemCard
En rad vid plockning.

**Props**: `item`, `onUpdate`

**Funktioner**:
- Visa artikel info
- Input för plockad kvantitet
- Skanna streckkod
- Markera som klar

### components/warehouses/ShelfManager
Hantera hyllor i ett lagerställe.

**Props**: `warehouse`

**Funktioner**:
- Lista alla hyllor
- Skapa ny hylla
- Bulk-skapa
- Redigera
- Ta bort
- Visa artiklar per hylla

### components/warehouses/PlacementAssistant
Föreslå placering för artikel.

**Props**: `article`

**Funktioner**:
- Analysera mått
- Föreslå lämplig hylla
- Visa tillgängligt utrymme
- Bekräfta placering

### components/inventory/QuickInventory
Snabb inventering av hylla.

**Props**: `articles`

**Funktioner**:
- Sök hylla
- Lista artiklar på hyllan
- Markera inventerad
- Slutför inventering

### components/inventory/PickListGenerator
AI-genererad plocklista.

**Props**: `articles`

**Funktioner**:
- Input för order-beskrivning
- LLM genererar optimal plocklista
- Visar artiklar i optimal plockordning
- Print/execute

### components/inventory/ImportPreview
Förhandsgranska import.

**Props**: `articles`, `onConfirm`, `onCancel`

**Funktioner**:
- Visa alla artiklar som ska importeras
- Välj vilka att importera
- Välj lagerställe
- Bekräfta

### components/inventory/ColumnMapper
Mappa kolumner vid import.

**Props**: `columns`, `previewData`, `onConfirm`, `onCancel`

**Funktioner**:
- Automappning
- Manuell mappning per kolumn
- Preview av mappning
- Bekräfta

### components/notifications/NotificationBell
Notifieringsikon med badge.

**Funktioner**:
- Visa antal olästa
- Dropdown med notifieringar
- Markera som läst
- Navigera till relevant sida

### components/labels/LabelDownloader
Generera och ladda ner etiketter.

**Props**: `article`

**Typer**: A4 label, Small label

**Funktioner**:
- Generera PDF via backend
- QR-kod med artikel-ID
- Innehåller: Namn, Batch, Hylla, Bild
- Ladda ner

### components/pwa/PWAOptimizer
Optimeringar för PWA.

**Funktioner**:
- Registrera service worker
- Cache manifest
- Offline-stöd
- App-liknande upplevelse

### components/pwa/OfflineIndicator
Visa online/offline status.

**Funktioner**:
- Lyssna på network events
- Visa badge när offline
- Toast när online igen

### components/pwa/PushManager
Hantera push-notifikationer.

**Funktioner**:
- Be om tillåtelse
- Registrera subscription
- Skicka till server
- Hantera meddelanden

---

## Backend Functions

### functions/exportArticles
Exportera artiklar till Excel.

**Input**: Inga parametrar

**Output**: Excel-fil (binary)

**Funktionalitet**:
- Hämtar alla artiklar
- Skapar Excel med xlsx library
- Kolumner: SKU, Namn, Batch, Lager, Hylla, etc.
- Returnerar fil för nedladdning

### functions/exportArticlesCsv
Exportera artiklar till CSV.

**Input**: Inga parametrar

**Output**: CSV-fil (text)

**Funktionalitet**:
- Hämtar alla artiklar
- Formaterar som CSV
- Headers + data-rader
- Returnerar som text/csv

### functions/parseImportFile
Analysera importfil (Excel).

**Input**: `file_url`, `columnMapping` (optional)

**Output**: `{ success: boolean, articles: array, needsMapping: boolean, columns: array }`

**Funktionalitet**:
- Ladda Excel-fil från URL
- Läs kolumner och data
- Automappning av kolumner
- Om mapping behövs, returnera kolumner
- Annars, returnera parsade artiklar

### functions/confirmImportArticles
Spara importerade artiklar.

**Input**: `articles` (array)

**Output**: `{ success: boolean, message: string }`

**Funktionalitet**:
- Validera artikeldata
- Bulk-skapa i Article entity
- Skapa StockMovement för inbound
- Returnera resultat

### functions/generateArticleSku
Generera unikt SKU.

**Input**: `article_name`, `manufacturer`, `category`

**Output**: `{ sku: string }`

**Funktionalitet**:
- Använd LLM för att föreslå SKU
- Kontrollera att SKU är unikt
- Returnera förslag

### functions/suggestPlacements
Föreslå hyllplacering.

**Input**: `article` (dimensions, weight, quantity)

**Output**: `{ suggestions: array }`

**Funktionalität**:
- Hämta alla hyllor
- Beräkna volym och vikt
- Jämför med tillgängligt utrymme
- Sortera på bästa match
- Returnera top 3

### functions/generateA4Label
Generera A4 etikett PDF.

**Input**: `article_id`

**Output**: PDF-fil (binary)

**Funktionalitet**:
- Hämta artikel
- Generera QR-kod
- Skapa PDF med artikel-info
- Returnera för nedladdning

### functions/generateSmallLabel
Generera liten etikett PDF.

**Input**: `article_id`

**Output**: PDF-fil (binary)

**Funktionalitet**:
- Hämta artikel
- Generera QR-kod
- Skapa liten PDF (58mm bred)
- Returnera för nedladdning

### functions/exportOrder
Exportera order till PDF.

**Input**: `order_id`

**Output**: PDF-fil

**Funktionalitet**:
- Hämta order + orderrader
- Generera plocklista i PDF
- Sorterad per hylla
- Returnera för nedladdning

### functions/exportMultipleOrders
Exportera flera ordrar.

**Input**: `order_ids` (array)

**Output**: PDF-fil

**Funktionalitet**:
- Hämta alla ordrar
- Kombinera till en PDF
- Separata sidor per order
- Returnera

### functions/generatePurchaseOrders
Föreslå inköpsordrar baserat på lågt lager.

**Input**: Inga parametrar

**Output**: `{ purchase_orders: array }`

**Funktionalitet**:
- Hitta artiklar med lågt lager
- Gruppera per leverantör
- Beräkna behov
- Returnera förslag

### functions/sendPurchaseOrderEmail
Skicka inköpsorder via email.

**Input**: `purchase_order_id`, `recipient_email`

**Output**: `{ success: boolean }`

**Funktionalitet**:
- Hämta inköpsorder
- Generera PDF
- Skicka via SendEmail integration
- Returnera resultat

### functions/sendNotification
Skapa notifiering.

**Input**: `user_email`, `title`, `message`, `type`, `priority`, `link_to`

**Output**: `{ success: boolean }`

**Funktionalitet**:
- Skapa Notification entity
- Om push aktiverat, skicka push
- Returnera resultat

### functions/sendPushNotification
Skicka push-notifiering.

**Input**: `user_email`, `title`, `body`, `url`

**Output**: `{ success: boolean }`

**Funktionalitet**:
- Hämta user's PushSubscription
- Skicka via Web Push API
- Returnera resultat

### functions/generateReport
Generera rapport.

**Input**: `report_type`, `filters`, `date_range`

**Output**: Excel eller PDF

**Funktionalitet**:
- Hämta data baserat på typ
- Filtrera och aggregera
- Generera Excel/PDF
- Returnera fil

---

## Arbetsflöden

### 1. Inkommande Artikel (Skanning)
```
1. Öppna pages/Scan
2. Välj "Inbound" mode
3. Fotografera etikett
4. AI analyserar → extraherar data
5. Granska i ReviewForm
6. Justera vid behov
7. Spara → skapar Article + StockMovement
8. Success screen med QR-kod
```

### 2. Skapa Order
```
1. Öppna pages/Orders
2. Klicka "Ny order"
3. Fyll i kund + detaljer
4. Lägg till artiklar (sök och välj)
5. Ange antal per artikel
6. Spara → status: draft
7. Ändra status till "ready_to_pick"
```

### 3. Plocka Order
```
1. Öppna pages/Orders
2. Välj order med status "ready_to_pick"
3. Klicka "Plocka"
4. Öppnar pages/PickOrder
5. Följ lista (sorterad per hylla)
6. Skanna eller ange plockad kvantitet
7. Markera varje rad som klar
8. Slutför → uppdaterar lagersaldo + status: picked
9. Skapar StockMovement för varje artikel
```

### 4. Skapa Inköpsorder
```
1. Öppna pages/PurchaseOrders
2. Klicka "Ny inköpsorder"
3. Välj leverantör
4. Ange Fortnox-projektnummer
5. Lägg till artiklar + antal
6. Förväntat leveransdatum
7. Spara → status: draft
8. Skicka till leverantör (email/PDF)
9. Ändra status till "ordered"
```

### 5. Ta Emot Inköpsorder
```
1. Öppna pages/ReceivePurchaseOrder
2. Välj inköpsorder
3. Visa alla orderrader
4. För varje rad:
   - Ange mottagen kvantitet
   - Välj hyllplats
   - Kvalitetskontroll
   - Fotografera följesedel (optional)
5. Slutför mottagning
6. Uppdaterar:
   - Article.stock_qty
   - PurchaseOrderItem.quantity_received
   - Skapar ReceivingRecord
   - Skapar StockMovement
```

### 6. Reparationsflöde
```
1. Hitta artikel i pages/Inventory
2. Öppna detaljvy
3. Klicka "Skicka på reparation"
4. Ange antal och anledning
5. Spara:
   - Minskar Article.stock_qty
   - Sätter Article.status = "on_repair"
   - Skapar RepairLog
   - Skapar StockMovement (outbound)
6. När reparation klar:
   - Öppna pages/Repairs
   - Klicka "Återför från reparation"
   - Ange returnerad/kasserad kvantitet
   - Spara:
     - Ökar Article.stock_qty (returnerad)
     - Uppdaterar RepairLog.status = completed
     - Skapar StockMovement (inbound)
```

### 7. Okänd Leverans
```
1. Skanna artikel i "Unknown Delivery" mode
2. Spara med status "unknown_delivery"
3. Öppna pages/UnknownDeliveries
4. Tilldela till användare för utredning
5. Användare undersöker och kommenterar
6. När utrett:
   - Uppdatera artikel med korrekt info
   - Ändra status till "active"
   - Koppla till inköpsorder om relevant
```

### 8. Export/Import
```
Export:
1. pages/Inventory → klicka "Excel" eller "CSV"
2. Backend genererar fil
3. Ladda ner

Import:
1. pages/Inventory → klicka "Importera"
2. Välj Excel-fil
3. System analyserar kolumner
4. Om mappning behövs → ColumnMapper
5. Förhandsgranska i ImportPreview
6. Välj artiklar att importera
7. Välj lagerställe
8. Bekräfta → bulk-skapar artiklar
```

---

## Integrationer

### Core (Built-in)
- **InvokeLLM**: AI-analys av text/bilder
- **UploadFile**: Ladda upp filer
- **SendEmail**: Skicka email
- **GenerateImage**: AI bildgenerering (ej använd i nuläget)
- **ExtractDataFromUploadedFile**: Extrahera strukturerad data

### Framtida Integrationer
- **Fortnox**: Fakturering och bokföring
- **Zendesk**: Support-ärenden
- **Slack**: Notifieringar
- **Google Sheets**: Dataexport

---

## PWA-funktioner

### Offline Support
- **Service Worker**: Cachar app-skal
- **Offline Storage**: LocalStorage + IndexedDB för data
- **Sync Queue**: Kör operationer när online igen

### Push Notifications
- **Web Push**: Notifikationer även när appen är stängd
- **Subscription Management**: Registrera enheter
- **Backend Integration**: Skicka från servern

### App-liknande
- **Install Prompt**: Lägg till på hemskärm
- **Standalone Mode**: Fullskärm utan webbläsarUI
- **Splash Screen**: Visas vid start

---

## Säkerhet

### Autentisering
- Base44 inbyggd auth
- Email/password login
- Session-based
- Ingen egen implementation

### Roller
- **Admin**: Full åtkomst
- **User**: Begränsad åtkomst

### Validering
- Frontend: UI-validering
- Backend: All kritisk validering i functions
- Entity-level: JSON-schema validation

---

## Performance

### Optimeringar
- React Query caching
- Lazy loading av bilder
- Virtualiserade listor (vid behov)
- Debounced sökfält
- Minimala re-renders

### Metrics
- First Load: < 2s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

---

## Framtida Utveckling

### Planerade Features
- [ ] Barcode-generering för egna artiklar
- [ ] Automatisk lagerinventering (QR-skanning)
- [ ] Integration med frakttjänster
- [ ] Multi-lager transfers
- [ ] Advanced analytics (ML predictions)
- [ ] Leverantörsportal för direktuppdateringar
- [ ] Mobile app (React Native)

### Backlog
- [ ] API för externa system
- [ ] Webhooks för events
- [ ] Bulk-import från CSV
- [ ] Custom fields per artikel-kategori
- [ ] Batch-operations med undo

---

## Support & Underhåll

### Loggning
- Frontend: Console logs (development)
- Backend: Deno logs
- Errors: Captured och loggas

### Monitoring
- Uptime monitoring via Base44
- Error tracking
- Usage analytics

### Backup
- Automatisk backup via Base44
- Daily snapshots
- Point-in-time recovery

---

## Kontakt & Dokumentation

**System**: IMvision Lager & Order System
**Plattform**: Base44
**Version**: 2.0
**Senast uppdaterad**: 2026-02-13

**Utvecklare**: Base44 AI Agent
**Dokumentation**: /components/docs/

---

*Detta dokument beskriver systemet i sin nuvarande form. För uppdateringar, se git-historik eller kontakta systemadministratör.*