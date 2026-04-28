# AGENTS.md — IMvision Lager & Order System

> **Purpose:** This document is the authoritative reference for AI agents, developers, and contributors who need to understand the architecture, data model, APIs, and operational logic of this system. Read it top-to-bottom before making any changes.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project File Structure](#3-project-file-structure)
4. [Routing & Navigation](#4-routing--navigation)
5. [Database Entities](#5-database-entities)
6. [Initialization & Migrations](#6-initialization--migrations)
7. [Backend Functions (API Layer)](#7-backend-functions-api-layer)
8. [External Integrations](#8-external-integrations)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Authentication & Roles](#10-authentication--roles)
11. [AI / Scanning Pipeline](#11-ai--scanning-pipeline)
12. [PWA & Push Notifications](#12-pwa--push-notifications)
13. [Key Business Workflows](#13-key-business-workflows)
14. [Conventions & Rules for Agents](#14-conventions--rules-for-agents)

---

## 1. System Overview

IMvision Lager & Order is a **mobile-first Progressive Web App (PWA)** for managing the entire lifecycle of LED screen components — from purchase and inventory to production, order fulfilment, and delivery.

**Core capabilities:**
- Inventory management with AI-assisted label scanning (Kimi/Moonshot vision API)
- Order and Work Order management with stage-based production flow
- Purchase Order management with Fortnox ERP integration
- Supplier portal (public-facing, no auth required)
- Public Order Dashboard (no auth required, real-time auto-scroll)
- Batch/lot tracking with pattern-based supplier inference
- Role-based home dashboards for each team role
- Push notifications (Web Push / VAPID)
- Offline-first with localStorage caching and sync queue

**Language:** The UI and all business logic uses **Swedish** for statuses, stage names, and labels. Agents must respect this — do not translate Swedish values to English.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui, framer-motion |
| Routing | React Router v6 |
| State / Fetching | TanStack React Query v5 |
| Backend Functions | Deno Deploy (via Base44 platform) |
| Database | Base44 BaaS (schema-defined entities, REST-style SDK) |
| AI Vision | Moonshot AI (Kimi) — `moonshot-v1-8k-vision-preview` |
| AI Text/LLM | Base44 `InvokeLLM` integration (OpenAI/Gemini under the hood) |
| ERP | Fortnox (OAuth via Base44 shared connector) |
| Email | Resend API (`RESEND_API_KEY`) |
| Push Notifications | Web Push VAPID (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`) |
| Fonts | Ropa Sans (headings/brand), Roboto (body) |

---

## 3. Project File Structure

```
/
├── AGENTS.md                   ← This file
├── App.jsx                     ← Root router — ALL routes defined here
├── Layout.jsx                  ← Shared navigation shell (sidebar + mobile nav)
├── index.css                   ← Design tokens, CSS variables, typography
├── tailwind.config.js          ← Tailwind theme (colors, fonts, safelist)
├── pages.config.js             ← Auto-generated page registry (do not edit manually)
├── main.jsx                    ← App entry point + service worker registration
│
├── pages/                      ← Route-level page components
│   ├── Home.jsx                ← Role dispatcher → redirects to /home/{role}
│   ├── Find.jsx                ← Main landing page (search / quick actions)
│   ├── Inventory.jsx           ← Article inventory list + management
│   ├── Scan.jsx                ← AI label scanner workflow
│   ├── Orders.jsx              ← Sales order list
│   ├── OrderEdit.jsx           ← Create/edit order form
│   ├── OrderDetail.jsx         ← Order detail with picking workflow
│   ├── WorkOrders.jsx          ← Work order list (kanban/table)
│   ├── WorkOrderView.jsx       ← Work order detail dashboard
│   ├── PurchaseOrders.jsx      ← Purchase order list + management
│   ├── ReceivePurchaseOrder.jsx← Goods receiving workflow
│   ├── OrderDashboard.jsx      ← PUBLIC auto-scroll delivery monitor
│   ├── BatchDashboard.jsx      ← Batch AI scanning overview
│   ├── BatchDetail.jsx         ← Individual batch detail
│   ├── BatchReview.jsx         ← Manual batch verification queue
│   ├── BatchReanalyze.jsx      ← Bulk re-analysis of historical images
│   ├── BatchSuggestions.jsx    ← AI-suggested batch pattern rules
│   ├── MatchReview.jsx         ← Manual scan match review queue
│   ├── PatternRules.jsx        ← Batch pattern rule management
│   ├── SiteReports.jsx         ← Field site report submission
│   ├── SiteHistory.jsx         ← Historical site reports
│   ├── Repairs.jsx             ← Repair log management
│   ├── Reports.jsx             ← Report generation
│   ├── Analytics.jsx           ← Analytics dashboard
│   ├── Suppliers.jsx           ← Supplier management
│   ├── Warehouses.jsx          ← Warehouse / shelf management
│   ├── WarehouseDashboard.jsx  ← Warehouse overview
│   ├── FortnoxSync.jsx         ← Fortnox ERP synchronization panel (admin)
│   ├── FortnoxCustomers.jsx    ← Fortnox customer list
│   ├── UsersManagement.jsx     ← User role and module management (admin)
│   ├── MigrationCenter.jsx     ← Data migration runner (admin)
│   ├── HomeSaljare/Konstruktor/Inkopare/Lager/Produktion/Tekniker/Ivan.jsx
│   │                           ← Role-specific home dashboards
│   ├── SupplierLogin.jsx       ← Public supplier login (no auth)
│   ├── SupplierDashboard.jsx   ← Public supplier portal
│   ├── SupplierPOView.jsx      ← Public PO view for suppliers
│   ├── PrintWorkOrder.jsx      ← Print-optimized work order view
│   ├── PrintPickList.jsx       ← Print-optimized pick list
│   └── PrintDeliveryNote.jsx   ← Print-optimized delivery note
│
├── components/
│   ├── ui/                     ← shadcn/ui base components (button, input, etc.)
│   ├── articles/               ← Article detail, edit, stock adjustment, repair
│   ├── orders/                 ← Order forms, picking, PO form, invoice scanner
│   ├── workorders/             ← Work order sections (materials, chat, stages, etc.)
│   ├── scanner/                ← Camera, AI review, barcode scanner components
│   ├── receiving/              ← Goods receiving form components
│   ├── purchaseorders/         ← PO status flow, document hub, Fortnox sync
│   ├── notifications/          ← Notification bell
│   ├── pwa/                    ← PWA install, push, offline, iOS prompts
│   ├── language/               ← LanguageProvider, translations, toggle
│   ├── activity/               ← Activity feed and recent activity widget
│   ├── brand/                  ← Brand-specific StatusBadge, EmptyState, etc.
│   ├── fortnox/                ← Fortnox-specific sync panels
│   ├── print/                  ← Print layout components
│   ├── dashboard/              ← MyTasksDashboard, PODashboard
│   └── utils/                  ← ErrorBoundary, offline storage, sync queue
│
├── functions/                  ← Deno Deploy backend functions (one file = one endpoint)
│
├── entities/                   ← JSON schemas for all database entities
│
├── lib/
│   ├── AuthContext.jsx         ← Auth state provider
│   ├── initializeMigrations.js ← Runs DB migrations on app start (admin only)
│   ├── app-params.js           ← Reads app/auth params from URL / localStorage
│   ├── query-client.js         ← TanStack Query client instance
│   ├── PageNotFound.jsx        ← 404 page
│   ├── NavigationTracker.jsx   ← Tracks navigation for back-button support
│   └── utils.js                ← cn(), createPageUrl(), shared utilities
│
├── api/
│   └── base44Client.js         ← Pre-initialized Base44 SDK client (requiresAuth: false)
│
└── public/
    ├── sw.js                   ← Service worker (push notifications, caching)
    ├── manifest.json           ← PWA manifest
    └── order-dashboard.html    ← Standalone HTML order dashboard (legacy)
```

---

## 4. Routing & Navigation

### Critical Routing Rules

- **`App.jsx` is the single source of truth for ALL routes.** `pages.config.js` is auto-generated and only used for the legacy `pagesConfig` loop — it does NOT handle new explicitly-added routes.
- **Every new page MUST have an explicit `<Route>` in `App.jsx`**, even if it also appears in `pages.config.js`.
- The `pagesConfig` loop wraps pages in `<LayoutWrapper>` — new explicit routes must do the same if they need the navigation shell.

### Public Routes (No Auth Required)

| Path | Component | Description |
|---|---|---|
| `/OrderDashboard` | `OrderDashboard` | Public delivery monitor (no layout) |
| `/SupplierPOView` | `SupplierPOView` | Supplier PO view |
| `/SupplierLogin` | `SupplierLogin` | Supplier login |
| `/SupplierDashboard` | `SupplierDashboard` | Supplier portal |
| `/PrintWorkOrder` | `PrintWorkOrder` | Print-only, no layout |
| `/PrintPickList` | `PrintPickList` | Print-only, no layout |
| `/PrintDeliveryNote` | `PrintDeliveryNote` | Print-only, no layout |

### Layout

`Layout.jsx` provides:
- Top logo bar (desktop) + mobile header with back button
- Bottom navigation bar (desktop + mobile)
- Floating camera button → `/Scan`
- Language toggle (Swedish/English)
- Notification bell
- PWA optimizers (service worker, push, offline indicator)

### Navigation Color/Brand

- Active nav item: `text-signal` (#6300FF purple)
- Background: `bg-black` with `border-zinc-800`
- All headings use `font-brand` (Ropa Sans, uppercase)

---

## 5. Database Entities

All entities are defined as JSON schemas in `entities/`. Every record automatically gets: `id`, `created_date`, `updated_date`, `created_by`.

### Core Entities

#### `Article` — Inventory items
Primary inventory record. Represents physical products/components.

| Key Field | Type | Description |
|---|---|---|
| `sku` | string | Article number |
| `name` | string | Article name (required) |
| `storage_type` | enum | `company_owned` \| `customer_owned` \| `rental_stock` (required) |
| `category` | enum | Cabinet, LED Module, Power Supply, etc. |
| `stock_qty` | number | Current stock level |
| `reserved_stock_qty` | number | Reserved for active orders |
| `shelf_address` | string[] | Warehouse locations |
| `supplier_id` / `supplier_name` | string | Linked supplier |
| `status` | enum | active, low_stock, out_of_stock, on_repair, in_transit, etc. |
| `batch_number` | string | LEGACY — use `Batch` entity instead |
| `primary_batch_id` | string | FK to primary `Batch` record |
| `image_urls` | string[] | Product/label images |
| `fortnox_synced` | boolean | Whether synced to Fortnox |

#### `Batch` — Lot/batch tracking
Tracks individual production batches for traceability. Linked to Articles.

| Key Field | Type | Description |
|---|---|---|
| `batch_number` | string | Normalized canonical batch number (required) |
| `raw_batch_number` | string | Original as read (OCR/barcode) |
| `aliases` | string[] | All known variants of this batch ID |
| `article_id` | string | FK to Article |
| `status` | enum | pending_verification \| verified \| rejected \| quarantine |
| `risk_score` | number | 0–100 risk score |
| `risk_flags` | string[] | Flags: low_ai_confidence, supplier_mismatch, etc. |
| `batch_pattern` | object | prefix, suffix, canonical_core, length, structure |
| `source_context` | enum | How this batch was created |

#### `Order` — Sales orders
Customer orders flowing through the production pipeline.

| Key Field | Type | Description |
|---|---|---|
| `order_number` | string | Order reference |
| `customer_name` | string | Customer (required) |
| `status` | enum | **SÄLJ → KONSTRUKTION → PRODUKTION → LAGER → MONTERING** |
| `financial_status` | enum | unbilled \| pending_billing \| billed |
| `delivery_date` | date | Target delivery |
| `critical_notes` | string | Shown as yellow warning across all stages |
| `fortnox_order_id` | string | Fortnox document reference |
| `site_ids` | string[] | Linked installation sites |

#### `WorkOrder` — Production work orders
Linked 1:1 to an Order. Manages the physical production workflow.

| Key Field | Type | Description |
|---|---|---|
| `order_id` | string | FK to Order (required) |
| `current_stage` | enum | konstruktion \| produktion \| lager \| montering \| leverans |
| `status` | enum | väntande \| pågår \| klar \| avbruten |
| `materials_needed` | array | Items needed: article_id, qty, in_stock, missing, needs_purchase |
| `checklist` | object | picked, assembled, tested, packed, ready_for_delivery |
| `tasks` | array | Sub-tasks with assigned_to, status, type |
| `role_sections` | object | Per-role notes and checklist (construction, project, it) |
| `production_status` | enum | påbörjad \| pågår \| monterad \| testad \| klar |
| `assembly_images` | string[] | Production photos |

#### `PurchaseOrder` — Supplier orders
| Key Field | Type | Description |
|---|---|---|
| `supplier_id` | string | FK to Supplier |
| `status` | enum | draft \| sent \| confirmed \| partial \| received \| cancelled |
| `total_amount` | number | Total cost |
| `fortnox_synced` | boolean | Synced to Fortnox |

#### `PurchaseOrderItem` — Line items on POs
Links articles/batches to purchase orders with quantities and pricing.

#### `ReceivingRecord` — Goods receipt
Records physical receipt of goods against a PO.

#### `LabelScan` — AI scan records
Every scan creates a LabelScan record for audit and deduplication.

| Key Field | Type | Description |
|---|---|---|
| `image_url` | string | Scanned image |
| `image_hash` | string | SHA-256 for deduplication (7-day cache) |
| `status` | enum | queued \| processing \| completed \| failed \| manual_review |
| `extracted_fields` | object | AI-extracted: batch_number, sku, supplier, barcodes, OCR regions |
| `field_confidence` | object | Per-field confidence scores (0–1) |
| `match_results` | object | all_matches, visual_suggestions, identifiers_searched |
| `context` | enum | manual_scan, purchase_receiving, repair_return, etc. |

#### `ScanMatchAudit` — Matching audit log
Immutable record of every scan's matching decision.

#### `BatchPatternRule` — Pattern inference rules
AI-inferred rules mapping batch number patterns to suppliers/categories.

| Key Field | Type | Description |
|---|---|---|
| `pattern_type` | enum | prefix \| suffix \| regex \| length \| composite |
| `pattern_value` | string | The pattern (e.g. "APP" for prefix) |
| `preferred_supplier_id` | string | Inferred supplier |
| `confidence` | number | 0–1 based on sample count vs conflicts |
| `status` | enum | active \| suggested \| rejected \| superseded |

#### `Supplier` — Supplier master data
#### `Warehouse` / `Shelf` — Physical storage locations
#### `RepairLog` — Repair tracking per article
#### `SiteReport` / `SiteReportImage` — Field inspection reports
#### `StockMovement` — Every stock change is logged here
#### `StockAdjustment` — Manual stock corrections with reason
#### `InventoryCount` — Full/partial inventory count sessions
#### `OrderPickList` — Picking sessions linked to orders
#### `DeliveryRecord` — Outbound delivery tracking
#### `ServiceLog` — Preventive maintenance records
#### `Notification` — In-app notifications per user
#### `NotificationSettings` — Per-user notification preferences
#### `PushSubscription` — Web Push subscription records
#### `SyncLog` — All Fortnox sync operations logged here
#### `Task` — General task management (linked to work orders)
#### `TaskTemplate` — Templates for auto-creating tasks on events
#### `KimiConfig` — AI model configuration (thresholds, costs, model name)
#### `MigrationRun` — Tracks which DB migrations have run
#### `ChatMessage` / `ChatRead` — In-app chat per work order
#### `ProjectTime` / `ProjectExpense` / `DrivingJournalEntry` — Time tracking and expense reporting
#### `FortnoxCustomer` / `FortnoxConfig` — Fortnox sync state
#### `ProductionRecord` / `ProductionActivity` / `WorkOrderActivity` / `POActivity` — Activity logs per entity type
#### `InternalWithdrawal` — Internal stock withdrawals (not tied to a customer order)
#### `OrderItem` — Line items on sales orders
#### `ArticleComment` — Comments on articles
#### `SupplierUser` / `SupplierDocument` / `SupplierDocumentRequest` — Supplier portal data
#### `BatchSuggestion` / `MatchReviewQueue` / `MergeApprovalQueue` — AI workflow queues
#### `BatchEvent` / `BatchActivity` / `BatchAnalysis` — Batch audit trails
#### `UserRegistration` — Custom user registration data
#### `ReportSchedule` — Scheduled report configurations

---

## 6. Initialization & Migrations

### App Startup (`main.jsx`)
1. React app mounts at `#root`
2. Service worker registered for PWA push notifications
3. `runMigrationsOnce()` called from `App.jsx` `useEffect`

### Migration System (`lib/initializeMigrations.js`)
- Runs **only once per browser session** (tracked via `sessionStorage`)
- Runs **only for admin users**
- Calls backend function `migrateExistingPurchaseOrders`
- If already completed or user is not admin → silently skips

### Migration Functions (in `functions/`)
All migration functions follow the pattern:
- Accept a payload with optional `dry_run: true` flag
- Create a `MigrationRun` entity record with before/after snapshots
- Store rollback data in `MigrationRun.rollback_snapshot`
- Return `{ success, created, updated, errors }`

Key migrations:
| Function | What it does |
|---|---|
| `migrateArticleBatchNumbersToBatchEntity` | Moves legacy `Article.batch_number` → `Batch` entity |
| `migrateBatchDuplicates` | Merges duplicate batch records |
| `migrateProductionRecordBatches` | Links production records to Batch entity |
| `migrateReceivingRecordImagesToLabelScan` | Migrates old images to LabelScan |
| `migrateRepairLogsToBatch` | Links repair logs to Batch entity |
| `runFullMigration` | Orchestrates all migrations in sequence |

---

## 7. Backend Functions (API Layer)

All backend functions live in `functions/`. Each file = one Deno Deploy HTTP handler.

### Pattern
```js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  // ... logic
  return Response.json({ ... });
});
```

### Calling from Frontend
```js
import { base44 } from '@/api/base44Client';
const res = await base44.functions.invoke('functionName', { param: 'value' });
// Result is in res.data
```

### Function Reference

#### Scanning & AI
| Function | Auth | Description |
|---|---|---|
| `mobileScan` | Required | Main scan endpoint — Kimi OCR + batch/article matching |
| `analyzeLabelWithKimi` | Required | Direct Kimi vision analysis for detailed label parsing |
| `bulkReanalyzeHistoricalImages` | Admin | Re-runs AI on all historical LabelScan images |
| `inferBatchPatterns` | Admin | Analyzes batch database to infer supplier pattern rules |
| `generatePatternSuggestions` | Admin | Creates BatchSuggestion records from pattern analysis |
| `applyBatchSuggestion` | Admin | Promotes a BatchSuggestion to a BatchPatternRule |
| `rejectBatchSuggestion` | Admin | Rejects a BatchSuggestion |
| `upsertBatchFromLabelScan` | Required | Creates/updates Batch from a completed LabelScan |
| `normalizeLabelScan` | Required | Normalizes extracted fields post-scan |
| `calculateRiskScore` | Required | Calculates batch risk score (0–100) |
| `mandatoryDuplicateCheck` | Required | Checks for duplicate batches before creating |
| `updateSupplierLabelPatterns` | Required | Updates SupplierLabelPattern based on scan results |
| `batchMatchSiteImages` | Admin | Matches site report images to batches |
| `matchSiteImages` | Admin | Matches site images to articles via AI |
| `discoverHistoricalImages` | Admin | Finds unlinked historical images |

#### Orders & Work Orders
| Function | Auth | Description |
|---|---|---|
| `createWorkOrder` | Service | Auto-creates WorkOrder from Order + OrderItems |
| `getPublicOrders` | **Public** | Returns active orders + work orders (no auth) |
| `exportOrder` | Required | Generates PDF for a single order |
| `exportOrders` | Required | Bulk PDF export |
| `exportMultipleOrders` | Required | Multi-order export |
| `processOrderDocument` | Required | AI parses uploaded customer PO document |
| `processIncomingOrderEmail` | Required | Parses email attachments into order data |
| `printWorkOrder` | Required | Generates print-ready work order HTML |
| `printPickList` | Required | Generates pick list PDF |
| `printDeliveryNote` | Required | Generates delivery note PDF |
| `getWorkOrderPrintData` | Required | Fetches all data needed for print views |

#### Purchase Orders
| Function | Auth | Description |
|---|---|---|
| `generatePurchaseOrders` | Required | Creates POs from article shortages |
| `deletePurchaseOrder` | Required | Safe PO deletion with cleanup |
| `sendPOToSupplier` | Required | Emails PO PDF to supplier via Resend |
| `sendPurchaseOrderEmail` | Required | Alternative PO email sender |
| `exportPurchaseOrderReceipt` | Required | PDF receipt for received PO |
| `syncPurchaseOrderToFortnox` | Admin | Pushes PO to Fortnox |
| `syncPurchaseOrdersWithFortnox` | Admin | Bulk PO sync |
| `migrateExistingPurchaseOrders` | Admin | Migrates PO data schema |
| `cleanupPurchaseOrderData` | Admin | Removes orphaned PO records |
| `supplierConfirmPO` | **Public** | Supplier confirms a PO (via supplier portal token) |
| `getSupplierPO` | **Public** | Fetches PO data for supplier portal |
| `getSupplierPurchaseOrders` | Supplier | Lists POs for authenticated supplier |

#### Fortnox Integration
| Function | Auth | Description |
|---|---|---|
| `fortnoxSync` | Admin | Main Fortnox sync orchestrator |
| `fortnoxSyncV2` | Admin | V2 sync with improved error handling |
| `fortnoxAutoSync` | Admin | Automated sync (called by automation) |
| `fortnoxExchangeCode` | Admin | OAuth code exchange for Fortnox token |
| `syncArticlesFromFortnox` | Admin | Pulls articles from Fortnox |
| `syncCustomersWithFortnox` | Admin | Syncs customers |
| `syncFortnoxCustomers` | Admin | Alternative customer sync |
| `fetchFortnoxArticles` | Admin | Lists articles from Fortnox API |
| `fetchFortnoxCustomers` | Admin | Lists customers from Fortnox API |
| `fortnoxArticleSync` | Admin | Syncs a single article |
| `createFortnoxProject` | Admin | Creates project in Fortnox |
| `createFortnoxInboundDelivery` | Admin | Creates inbound delivery record |
| `getFortnoxProjects` | Admin | Lists Fortnox projects |
| `getFortnoxProjectsList` | Admin | Alternative project list |
| `listFortnoxSuppliers` | Admin | Lists Fortnox suppliers |
| `syncSuppliersWithFortnox` | Admin | Syncs supplier data |
| `syncIncomingGoodsToFortnox` | Admin | Pushes received goods |
| `updateOrderFortnoxProject` | Admin | Links order to Fortnox project |
| `fortnoxOrderSync` | Admin | Syncs order status to Fortnox |
| `checkFortnoxSyncReadiness` | Admin | Validates Fortnox config before sync |

#### Inventory
| Function | Auth | Description |
|---|---|---|
| `exportArticles` | Required | Exports article list |
| `exportArticlesCsv` | Required | CSV export |
| `importArticles` | Admin | Bulk article import |
| `parseImportFile` | Required | Parses CSV/Excel for preview |
| `confirmImportArticles` | Admin | Confirms and applies import |
| `generateArticleSku` | Required | Auto-generates next SKU |
| `suggestPlacements` | Required | AI suggests shelf locations |
| `articleApi` | Required | Generic article CRUD API |
| `syncArticleDocumentFiles` | Required | Syncs article document attachments |
| `syncPOItemToInventory` | Required | Updates stock from received PO item |
| `syncReservedStock` | Required | Recalculates reserved stock across orders |
| `syncPOStatusToArticles` | Required | Updates article status based on PO status |

#### Notifications & Push
| Function | Auth | Description |
|---|---|---|
| `sendPushToUser` | Service | Sends Web Push to a specific user |
| `sendPushNotification` | Service | Generic push sender |
| `sendNotification` | Service | Creates in-app Notification record |
| `subscribeToPush` | Required | Saves PushSubscription for a user |
| `setupPushNotifications` | Required | Initializes push for a user |
| `generateVAPIDKeys` | Admin | Generates VAPID key pair |
| `setupVAPIDKeys` | Admin | Saves VAPID keys to config |
| `testPushNotification` | Required | Sends a test push |
| `notifyLowStock` | Service | Alerts on low stock |
| `notifyOrderCreated` | Service | Alerts on new order |
| `notifyOrderUpdated` | Service | Alerts on order update |
| `notifyOrderAssignment` | Service | Alerts assigned users |
| `notifyPOApprovalNeeded` | Service | Alerts on PO awaiting approval |
| `notifyRepairUpdate` | Service | Alerts on repair status change |
| `notifySiteReportSubmitted` | Service | Alerts on new site report |
| `notifyBatchPendingVerification` | Service | Alerts on batch needing review |
| `notifyQuarantineBatch` | Service | Alerts on quarantined batch |
| `notifyWorkOrderStatusChange` | Service | Alerts on work order stage change |
| `notifyWOAssignment` | Service | Alerts on WO team assignment |
| `notifyWorkOrderCompleted` | Service | Alerts on completion |
| `notifyMaterialShortage` | Service | Alerts on missing materials |
| `notifyPurchaseOrderLate` | Service | Alerts on overdue POs |
| `notifyBlockedTasks` | Service | Alerts on blocked tasks |
| `sendDailyMentionDigest` | Scheduled | Daily digest of @mentions |
| `sendChatNotification` | Service | Chat push notifications |
| `notifyChatMentions` | Service | Push for @mentions in chat |
| `notifySiteReportReviewed` | Service | Alert on site report review |

#### Reporting & Labels
| Function | Auth | Description |
|---|---|---|
| `generateReport` | Required | Generates various report types |
| `generateLabelPDF` | Required | Generates printable batch label |
| `generateA4Label` | Required | A4-sized label |
| `generateSmallLabel` | Required | Small format label |
| `generateResponsiveLabel` | Required | Responsive label format |
| `getLabelHTML` | Required | Raw label HTML |
| `getLabelHTML40x30` | Required | 40x30mm label HTML |
| `getLabelHTML40x30NoQR` | Required | 40x30mm label without QR |
| `exportSiteReport` | Required | Exports site report as PDF |
| `exportRepairsPdf` | Required | Exports repair log as PDF |
| `sendAccountingPackage` | Admin | Sends accounting export to accountant |

#### Automations & Background Jobs
| Function | Auth | Description |
|---|---|---|
| `autologPOChanges` | Service | Auto-logs PO field changes to POActivity |
| `autologWorkOrderChanges` | Service | Auto-logs WO field changes to WorkOrderActivity |
| `generateTasksFromTemplate` | Service | Creates Tasks from TaskTemplate on trigger events |
| `sendCommentReminders` | Scheduled | Reminds users of unread comments |
| `syncArticleSkuToPO` | Service | Propagates SKU updates to PO items |
| `syncArticleSupplierToPO` | Service | Propagates supplier updates |
| `syncPOSupplierToArticle` | Service | Reverse supplier sync |
| `logPOActivity` | Service | Logs PO activities |
| `logProductionActivity` | Service | Logs production activities |
| `logWorkOrderActivity` | Service | Logs WO activities |

#### Workspace / Time Tracking
| Function | Auth | Description |
|---|---|---|
| `syncOrderToWorkspace` | Required | Syncs order to workspace projects |
| `receiveWorkspaceTime` | Required | Records time entries from workspace |
| `getProjectFinancials` | Required | Calculates project cost/revenue |
| `updateUserModules` | Admin | Updates allowed_modules for a user |
| `updateUserName` | Required | Updates user's display name |
| `updateUserStatus` | Admin | Updates user active/inactive status |
| `createAdminUser` | Admin | Creates a new admin user |
| `createUserWithPassword` | Admin | Creates user with password auth |

#### Miscellaneous
| Function | Auth | Description |
|---|---|---|
| `parseImage` | Required | Generic image parsing |
| `parseReceivingDocument` | Required | Parses receiving documents via AI |
| `cleanupDuplicates` | Admin | Finds and removes duplicate records |
| `validateBatchGuard` | Required | Validates batch before write |
| `validateLabelScanGuard` | Required | Validates LabelScan before write |
| `kimiHealthcheck` | Admin | Tests Kimi API connectivity |
| `testKimiConnection` | Admin | Alternative Kimi connection test |
| `patchKimiConfig` | Admin | Updates KimiConfig entity |
| `indexArticleImage` | Required | Indexes article image for visual search |
| `optimizeImageStorage` | Admin | Compresses/optimizes stored images |
| `seedDefaultData` | Admin | Seeds initial data |
| `supplierLogin` | **Public** | Authenticates supplier by token |
| `supplierGetDocuments` | Supplier | Lists supplier documents |
| `supplierUploadFile` | Supplier | Uploads document to supplier portal |
| `uploadSupplierDocuments` | Required | Internal supplier doc upload |
| `generateSupplierRequestDocument` | Required | Generates supplier document request PDF |
| `generateVAPIDKeys` | Admin | Generates VAPID key pair |
| `pushToLagerAI` | Admin | Pushes data to external LagerAI system |
| `sendToExternalAI` | Admin | Sends data to external AI (`LAGER_AI_URL`) |
| `syncToLagerAI` | Admin | Syncs inventory to LagerAI |
| `receiveDrivingJournal` | Required | Receives driving journal entries |
| `articleWebhook` | Webhook | Handles article webhook events (`WEBHOOK_TOKEN` auth) |
| `syncInventoryWebhook` | Webhook | Handles inventory sync webhooks |
| `syncWarehouseWebhook` | Webhook | Handles warehouse sync webhooks |
| `printOrder` | Required | Generates order printout |
| `printPurchaseOrder` | Required | Generates PO printout |
| `rollbackMigration` | Admin | Rolls back a migration run |
| `approveMerge` | Admin | Approves a batch merge |
| `rejectMerge` | Admin | Rejects a batch merge |
| `rollbackMerge` | Admin | Rolls back a batch merge |
| `skipMerge` | Admin | Skips a merge candidate |
| `findDuplicateCandidates` | Admin | Finds potential duplicate batches |
| `migrateTaskRoles` | Admin | Migrates task role assignments |
| `migrateUserRoles` | Admin | Migrates user role data |

---

## 8. External Integrations

### Moonshot AI (Kimi)
- **Secret:** `KIMI_API_KEY`
- **Model:** `moonshot-v1-8k-vision-preview`
- **Used in:** `mobileScan`, `analyzeLabelWithKimi`, `bulkReanalyzeHistoricalImages`
- **Purpose:** OCR + vision analysis of product labels to extract batch numbers, SKUs, supplier names, barcodes

### Fortnox ERP
- **Auth:** OAuth (Base44 shared connector) — app builder's account
- **Used in:** All `fortnox*` functions
- **Operations:** Sync articles, customers, suppliers, purchase orders, projects, inbound deliveries
- **Config entity:** `FortnoxConfig` stores tokens and sync state

### Resend (Email)
- **Secret:** `RESEND_API_KEY`
- **Used in:** `sendPOToSupplier`, `sendPurchaseOrderEmail`, `sendAccountingPackage`
- **Purpose:** Sends PO PDFs to suppliers and accounting exports

### External LagerAI
- **Secrets:** `LAGER_AI_URL`, `EXTERNAL_API_KEY`
- **Used in:** `pushToLagerAI`, `sendToExternalAI`, `syncToLagerAI`
- **Purpose:** Syncs inventory data to external AI analytics platform

### External Webhook System
- **Secrets:** `WEBHOOK_TOKEN`, `WEBHOOK_URL`
- **Used in:** `articleWebhook`, `syncInventoryWebhook`, `syncWarehouseWebhook`
- **Auth:** Bearer token validation on incoming webhooks

### Base44 Built-in Integrations
- **`InvokeLLM`** — Used for visual match fallback in scanning, invoice parsing, document analysis
- **`UploadFile`** — Used for image/document uploads throughout the app
- **`SendEmail`** — Used for notifications (Resend preferred for rich emails)
- **`GenerateImage`** — Not widely used
- **`ExtractDataFromUploadedFile`** — Used for parsing Excel/CSV imports

---

## 9. Frontend Architecture

### State Management
- **Server state:** TanStack React Query (`useQuery`, `useMutation`, `queryClient`)
- **Local UI state:** React `useState` / `useReducer`
- **Global auth state:** `AuthContext` (`useAuth` hook)
- **Offline state:** `localStorage` via `offlineStorage` utility

### SDK Usage Pattern
```js
import { base44 } from '@/api/base44Client';

// Entity CRUD
const articles = await base44.entities.Article.list('-updated_date', 50);
const article = await base44.entities.Article.filter({ sku: 'ABC123' });
const created = await base44.entities.Article.create({ name: 'LED Module', storage_type: 'company_owned' });
await base44.entities.Article.update(id, { stock_qty: 10 });
await base44.entities.Article.delete(id);

// Backend functions
const res = await base44.functions.invoke('mobileScan', { image_url: '...' });

// Auth
const user = await base44.auth.me();
const isAuthenticated = await base44.auth.isAuthenticated();
await base44.auth.updateMe({ display_name: 'New Name' });
base44.auth.logout();

// Real-time subscription
const unsub = base44.entities.Article.subscribe((event) => {
  // event.type: 'create' | 'update' | 'delete'
  // event.data: entity data
  // event.id: entity id
});
// Call unsub() on cleanup
```

### Styling Conventions
- **Brand color:** `#6300FF` — accessed via `bg-signal`, `text-signal`, `border-signal`
- **Dark nav background:** `bg-black` / `border-zinc-800`
- **All headings:** `font-brand` class (Ropa Sans, uppercase, letter-spacing)
- **Body text:** `font-body` / `font-sans` (Roboto)
- **DO NOT** use hardcoded hex colors — use Tailwind tokens or `text-signal` / `bg-signal`

### Language System
`LanguageProvider` wraps the layout and provides `language` context (sv/en).
Translation function: `t('key', language)` from `components/language/translations`.

Status translations:
- `tOrderStatus(status, language)` — Order statuses
- `tStage(stage, language)` — Work order stages
- `tWorkOrderStatus(status, language)` — Work order statuses
- `tPriority(priority, language)` — Priority values

---

## 10. Authentication & Roles

### User Roles
| Role | Access |
|---|---|
| `admin` | Full access — all pages, all admin functions, user management |
| `user` | Standard access — limited by `allowed_modules` |
| Supplier | Public supplier portal only (token-based, not Base44 auth) |

### Module-Based Access (`allowed_modules` on User entity)
Modules: `Orders`, `PurchaseOrders`, `SiteReports`, `Repairs`
- If a module is listed in `allowed_modules`, the nav item and pages are visible
- If `allowed_modules` is empty/null, all modules are visible (backwards compat)
- Updated via `updateUserModules` backend function (admin only)

### Role-Based Home Pages
On login, users are redirected by `Home.jsx` based on their role:
- `saljare` → `/home/saljare`
- `konstruktor` → `/home/konstruktor`
- `inkopare` → `/home/inkopare`
- `lager` → `/home/lager`
- `produktion` → `/home/produktion`
- `tekniker` → `/home/tekniker`
- `ivan` / `admin` → `/home/ivan`

### Public Endpoints
These pages/functions require NO auth:
- `/OrderDashboard`, `/SupplierLogin`, `/SupplierDashboard`, `/SupplierPOView`
- Backend: `getPublicOrders`, `supplierLogin`, `supplierConfirmPO`, `getSupplierPO`

---

## 11. AI / Scanning Pipeline

The scanning pipeline is the most complex part of the system. Here's the full flow:

### Step 1 — Image Upload
User takes photo with device camera → image uploaded via `UploadFile` integration → URL stored.

### Step 2 — `mobileScan` function call
Frontend calls `mobileScan` with `image_url`.

### Step 3 — Deduplication Check
SHA-256 hash of image computed. If matching `LabelScan` found within 7 days with status `completed` → return cached result immediately.

### Step 4 — LabelScan stub created
`LabelScan` record created with `status: 'processing'` for audit trail.

### Step 5 — Kimi AI Analysis
Image sent to Moonshot `moonshot-v1-8k-vision-preview`:
- Extracts: `batch_number`, `article_sku`, `article_name`, `supplier_name`, `other_text`
- Also extracts: `barcode_values` (Data Matrix, QR, Code128), `ocr_regions`
- Returns confidence scores per field

### Step 6 — Number Collection
All identifiers gathered: barcodes → OCR text → batch_number → SKU → other_text
Deduplicated, max 60 chars, no multi-space values.

### Step 7 — Multi-Entity Search
Searches in parallel:
1. **Batch** — by `batch_number`, `raw_batch_number`, `aliases`, `canonical_core`, substring match
2. **Article** — by `sku`, `legacy_batch_number`
3. **PurchaseOrderItem** — by `batch_number`, `supplier_batch_numbers`
4. **OrderItem** — by `batch_number`

Match priority: exact > alias > canonical > partial.

### Step 8 — Visual AI Fallback
If zero text matches: sends scan image + up to 20 article images to LLM for visual similarity scoring. Returns matches with confidence ≥ 0.3.

### Step 9 — Results Returned
```json
{
  "label_scan_id": "...",
  "all_numbers": ["JC22-2009-262", "..."],
  "all_matches": [{ "entity_type": "Batch", "entity_id": "...", "entity_name": "...", ... }],
  "visual_suggestions": [...],
  "image_url": "...",
  "extracted_summary": { ... },
  "kimi_error": null
}
```

### Step 10 — Background Tasks (non-blocking)
- `LabelScan` updated with full results
- `ScanMatchAudit` created
- Push notification sent to scanning user
- Pattern rules applied

### Frontend Result Handling (`MobileScanResult`)
- Shows matches as clickable cards with confidence indicators
- "No match" → prompt to create new Article or Batch
- Visual suggestions shown separately with disclaimer

---

## 12. PWA & Push Notifications

### Service Worker (`public/sw.js`)
- Registered in `main.jsx`
- Handles: push event reception, notification click routing, background fetch

### VAPID Keys
- **`VAPID_PUBLIC_KEY`** — sent to browser for subscription
- **`VAPID_PRIVATE_KEY`** — used server-side to sign push messages
- Generated by `generateVAPIDKeys` function, stored in secrets

### Push Flow
1. User opts in → `subscribeToPush` function called → `PushSubscription` entity created
2. Any backend function calls `sendPushToUser` with `user_email` + message
3. `sendPushToUser` fetches all active subscriptions for that email → sends via Web Push

### iOS Special Handling
- `IOSInstallPrompt` — prompts iOS users to add to home screen
- `IOSPushPrompt` — explains iOS push limitations
- iOS requires standalone (home screen) mode for push notifications

---

## 13. Key Business Workflows

### Order → WorkOrder Flow
```
Order created (status: SÄLJ)
  └── Sales completed (sales_completed: true)
        └── createWorkOrder function called
              └── WorkOrder created (current_stage: konstruktion)
                    └── Stage progression:
                          konstruktion → produktion → lager → montering → leverans
```

### Purchase Order → Inventory Flow
```
PurchaseOrder created (status: draft)
  └── Sent to supplier (sendPOToSupplier)
        └── Supplier confirms (supplierConfirmPO)
              └── Goods received (ReceivePurchaseOrder page)
                    └── ReceivingRecord created
                          └── Article.stock_qty updated
                                └── StockMovement logged
                                      └── Fortnox inbound delivery created (optional)
```

### Label Scanning → Batch Verification
```
Photo taken (Scan page)
  └── mobileScan called
        └── Kimi AI analyzes image
              └── Matches found? → Show results
                    Yes: User confirms → LabelScan linked to Batch/Article
                    No: User creates new Article/Batch
                          └── Batch created with status: pending_verification
                                └── Admin reviews in BatchReview page
                                      └── Batch verified/rejected/quarantined
```

### Fortnox Sync Flow
```
Trigger (manual / automation)
  └── fortnoxSyncV2 called
        └── 1. Fetch latest from Fortnox (articles, customers, suppliers)
              └── 2. Compare with Base44 entities
                    └── 3. Create/update Base44 records
                          └── 4. Push orders/POs to Fortnox
                                └── 5. Log everything to SyncLog
```

---

## 14. Conventions & Rules for Agents

### DO
- ✅ Use `find_replace` for editing existing files — never rewrite entire files
- ✅ Use `write_file` only for new files or entity JSON schemas
- ✅ Keep all status/stage values in **Swedish** (väntande, pågår, klar, konstruktion, etc.)
- ✅ Add all new routes as explicit `<Route>` elements in `App.jsx`
- ✅ Use `base44.functions.invoke('functionName', payload)` from frontend
- ✅ Use `createClientFromRequest(req)` at the start of every backend function
- ✅ Use `base44.asServiceRole.entities.*` in backend functions that need admin access
- ✅ Use `base44.auth.me()` to authenticate users in backend functions
- ✅ Wrap new pages in `<LayoutWrapper currentPageName="...">` if they need navigation
- ✅ Use `font-brand` for headings, `font-body` for body text
- ✅ Use `text-signal`, `bg-signal`, `border-signal` for brand color (#6300FF)
- ✅ Create small focused component files — never bloat a single file

### DON'T
- ❌ Don't use `window.__BASE44_SERVER_URL__` — use `base44.functions.invoke()` instead
- ❌ Don't translate Swedish status values to English
- ❌ Don't use `write_file` to edit existing code files — use `find_replace`
- ❌ Don't use `find_replace` on entity files (`entities/*.json`) — use `write_file`
- ❌ Don't try to create a login page — authentication is handled by Base44 platform
- ❌ Don't use hardcoded hex colors — use Tailwind tokens
- ❌ Don't add optional features not requested — minimal changes only
- ❌ Don't catch errors silently in backend functions unless there's a good reason
- ❌ Don't import icons from `lucide-react` that don't exist in the library
- ❌ Don't make sequential tool calls when parallel is possible

### Entity Schema Rules
- Entity files are JSON schemas in `entities/*.json`
- Always provide the **full schema** when updating — no partial schemas or placeholders
- Built-in fields (`id`, `created_date`, `updated_date`, `created_by`) are automatic — don't add them
- `User` entity exists automatically — don't create it, can't insert records directly

### Backend Function Rules
- Minimum SDK version: `npm:@base44/sdk@0.8.25`
- Admin-only functions MUST check `user.role === 'admin'` and return 403 if not
- Public functions (supplier portal, order dashboard) use `asServiceRole` without user check
- Webhook functions validate with `WEBHOOK_TOKEN` bearer token
- All functions MUST use `Deno.serve(async (req) => { ... })`
- No local imports between function files — each is independent

### Swedish Status Values Reference
**Order status:** `SÄLJ`, `KONSTRUKTION`, `PRODUKTION`, `LAGER`, `MONTERING`
**WorkOrder stage:** `konstruktion`, `produktion`, `lager`, `montering`, `leverans`
**WorkOrder status:** `väntande`, `pågår`, `klar`, `avbruten`
**Priority:** `låg`, `normal`, `hög`, `brådskande`
**Batch status:** `pending_verification`, `verified`, `rejected`, `quarantine`
**PO status:** `draft`, `sent`, `confirmed`, `partial`, `received`, `cancelled