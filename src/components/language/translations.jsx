export const translations = {
  sv: {
    // Navigation
    nav_home: "Hem",
    nav_inventory: "Lager",
    nav_orders: "Ordrar",
    nav_work_orders: "Arbetsordrar",
    nav_production: "Produktion",
    nav_purchase: "Inköp",
    nav_site: "Plats",
    nav_unknown: "Okända",
    nav_repairs: "Reparation",
    nav_admin: "Admin",
    nav_projects: "Projekt",
    nav_workspace: "Workspace",
    nav_employees: "Medarbetare",
    nav_timesheet: "Tidrapport",
    nav_mileage: "Milersättning",

    // Common
    common_search: "Sök",
    common_save: "Spara",
    common_cancel: "Avbryt",
    common_delete: "Ta bort",
    common_edit: "Redigera",
    common_back: "Tillbaka",
    common_loading: "Laddar...",
    common_all: "Alla",
    common_status: "Status",
    common_date: "Datum",
    common_notes: "Anteckningar",
    common_close: "Stäng",
    common_confirm: "Bekräfta",
    common_upload: "Ladda upp",
    common_uploading: "Laddar upp...",
    common_send: "Skicka",
    common_scan: "Skanna",
    common_add: "Lägg till",
    common_create: "Skapa",
    common_update: "Uppdatera",
    common_articles: "Artiklar",

    // Sections / Page titles
    section_inventory: "Lager",
    section_find: "Hitta",
    section_order_overview: "Orderöversikt",
    section_edit_order: "Redigera order",
    section_new_order: "Ny order",
    section_customer_info: "Kundinformation",
    section_delivery_info: "Leveransinformation",
    section_technical_info: "Teknisk information",
    section_special_requirements: "Speciella krav och anteckningar",
    section_documents: "Dokument",
    section_finance: "Ekonomi & Fortnox",
    section_production_flow: "Produktionsflöde",
    section_pick_list: "Plocklista",
    section_picking_notes: "Plockanteckningar",
    section_activity_log: "Aktivitetslogg",
    section_site_reports: "Site-rapporter",
    section_recent_updates: "Senaste uppdateringar",
    section_work_orders: "Arbetsordrar",
    section_rm_system: "RM System",
    section_linked_work_orders: "Kopplade arbetsordrar",

    // Form field labels
    field_customer_name: "Kundnamn",
    field_customer_reference: "Kundreferens",
    field_fortnox_customer: "Fortnox Kund",
    field_delivery_address: "Leveransadress",
    field_delivery_date: "Leveransdatum",
    field_delivery_method: "Leveranssätt",
    field_carrier: "Speditör",
    field_delivery_contact: "Kontaktperson leverans",
    field_contact_phone: "Kontaktperson telefon",
    field_installation_date: "Installationsdatum",
    field_installation_type: "Installationstyp",
    field_screen_dimensions: "Skärmdimensioner",
    field_pixel_pitch: "Pixel pitch",
    field_module_count: "Antal moduler",
    field_site_visit_info: "Platsbesöksinfo",
    field_notes: "Anteckningar",
    field_priority: "Prioritet",
    field_order_number: "Ordernummer",
    field_fortnox_project_nr: "Fortnox Projektnr",
    field_fortnox_project_name: "Fortnox Projektnamn",
    field_billing_status: "Faktureringsstatus",
    field_important_for_team: "OBS / Viktigt för teamet",
    field_rm_system_id: "RM System ID",
    field_rm_system_url: "RM System URL",

    // Placeholders
    ph_customer_name: "Kundnamn",
    ph_customer_reference: "Kundens referens / ordernummer",
    ph_fortnox_customer: "T.ex. 1234",
    ph_delivery_address: "Fullständig leveransadress...",
    ph_delivery_contact: "Namn på kontaktperson vid leveransplats",
    ph_contact_phone: "+46 70 XXX XX XX",
    ph_carrier: "DHL, Schenker, etc.",
    ph_screen_dimensions: "Bredd x Höjd mm (t.ex. 1920 x 2400)",
    ph_pixel_pitch: "P2.6, P3.076, etc.",
    ph_module_count: "0",
    ph_site_visit_info: "Beskriv platsen: mått, el-access, monteringsyta, specialförutsättningar. Ju mer info desto färre frågor!",
    ph_critical_notes: "Skriv allt som teamet behöver veta: specialkrav, kundens önskemål, saker att tänka på vid konstruktion/montering.",
    ph_search_article: "Sök artikel, batchnummer eller hyllplats...",
    ph_search_order: "Sök order eller kund...",
    ph_search_article_start: "Börja skriva för att söka artiklar",
    ph_picking_notes: "Noteringar vid plockning...",
    ph_comment: "Skriv en kommentar, anteckning eller beslut...",
    ph_order_number: "T.ex. ORD-2025-001",
    ph_fortnox_project_nr: "T.ex. 1234",
    ph_fortnox_project_name: "Projektnamn",
    ph_rm_system_id: "T.ex. RM-12345",

    // Help texts
    help_installation_date: "Om annat datum än leverans",
    help_site_visit_tip: "💡 Tips: Ta bilder och ladda upp under Dokument",
    help_critical_notes: "⚠️ Det du skriver här visas för ALLA som jobbar med denna order",
    help_documents: "📎 Alla dokument här följer med till konstruktion, produktion och montering automatiskt",
    help_all_docs_follow: "Alla dokument uppladdade här följer med till alla steg",

    // Buttons
    btn_withdraw: "Ta ut från lager",
    btn_confirm_withdraw: "Bekräfta uttag",
    btn_go_to: "Gå till",
    btn_claim_task: "Ta denna uppgift",
    btn_new_production: "Ny produktion",
    btn_save_order: "Spara order",
    btn_create_order: "Skapa order",
    btn_update_order: "Uppdatera",
    btn_see_work_order: "Se arbetsorder →",
    btn_add_file: "Lägg till fil...",
    btn_select_file: "Välj fil...",
    btn_customer_order: "Kundorder / PO",
    btn_drawings: "Ritningar",
    btn_site_images: "Bilder från platsbesök",
    btn_other_docs: "Övriga dokument",

    // Filters / chips
    filter_all: "Alla",
    filter_active: "Aktiv",
    filter_low_stock: "Lågt lager",
    filter_out_of_stock: "Slut",
    filter_on_repair: "På reparation",
    filter_on_order: "På inköp",
    filter_customer_owned: "Kundägd",
    filter_rental: "Uthyrning",
    filter_all_categories: "Alla kategorier",

    // Priority labels
    priority_low: "Låg",
    priority_normal: "Normal",
    priority_high: "Hög",
    priority_urgent: "Brådskande",

    // Status labels
    status_pending: "Väntande",
    status_in_progress: "Pågår",
    status_completed: "Klar",
    status_cancelled: "Avbruten",
    status_delayed: "Försenad",
    status_new: "Nyinkommen",
    status_in_review: "Granskas",
    status_active: "I lager",
    status_low_stock: "Lågt lager",
    status_out_of_stock: "Slut",
    status_unbilled: "Ej fakturerad",
    status_pending_billing: "Inväntar fakturering",
    status_billed: "Fakturerad",

    // Stage labels
    stage_design: "Konstruktion",
    stage_production: "Produktion",
    stage_warehouse: "Lager",
    stage_assembly: "Montering",
    stage_delivery: "Leverans",
    stage_sales: "Sälj",
    stage_incoming: "Inkommande",

    // Order status values
    order_status_salj: "Sälj",
    order_status_konstruktion: "Konstruktion",
    order_status_produktion: "Produktion",
    order_status_lager: "Lager",
    order_status_montering: "Montering",

    // Delivery method labels
    delivery_truck: "Lastbil",
    delivery_courier: "Bud / Courier",
    delivery_air: "Flyg",
    delivery_sea: "Sjöfrakt",
    delivery_pickup: "Upphämtning",
    delivery_other: "Övrigt",

    // Installation type labels
    install_new: "Ny installation",
    install_replacement: "Byte / Uppgradering",
    install_addition: "Tillägg",
    install_service: "Service / Reparation",
    install_rental: "Uthyrning / Event",

    // Time expressions
    time_delayed: "försenad",
    time_remaining: "kvar",
    time_orders: "ordrar",
    time_delayed_plural: "försenade",
    time_soon: "snart",
    time_in_progress: "på gång",
    time_incoming: "inkommande",
    time_hour: "timme",
    time_hours: "timmar",
    time_minute: "minut",
    time_minutes: "minuter",

    // Validation / warnings
    validation_required_fields: "Kundnamn, leveransdatum och leveransadress krävs",
    warning_important_from_sales: "⚠️ OBS från sälj:",
    warning_missing_materials: "Material saknas",
    warning_complete_checklist: "Slutför checklistan",
    warning_all_docs_follow: "Alla dokument här följer med till alla steg",
    warning_team_visible: "⚠️ Det du skriver här visas för ALLA som jobbar med denna order",

    // Home page
    home_quick_withdrawal: "Snabb utplockning",
    home_quick_withdrawal_desc: "Ta ut från lager",
    home_inbound: "Inleverans",
    home_inbound_desc: "Registrera nya varor",
    home_search_article: "Sök artikel",
    home_search_article_desc: "Hitta snabbt i lagret",
    home_orders_to_pick: "Ordrar att plocka",
    home_orders_waiting: "väntar",
    home_order: "order",
    home_orders: "ordrar",
    home_day: "dag",
    home_days: "dagar",
    home_site_reports: "Inkommande Site-rapporter",
    home_reports_waiting: "väntar på granskning",
    home_report: "rapport",
    home_reports: "rapporter",
    home_alerts: "Kräver uppmärksamhet",
    home_recent_activity: "Senaste aktivitet",
    home_recent_articles: "Senaste artiklar",
    home_show_all: "Visa alla",
    home_no_activity: "Ingen aktivitet ännu",

    // Stats
    stats_articles: "Artiklar",
    stats_total_stock: "Totalt i lager",
    stats_low_stock: "Lågt lager",
    stats_out_of_stock: "Slut i lager",
    stats_on_repair: "På reparation",
    stats_total_orders: "Totalt ordrar",
    stats_ready_production: "Redo för produktion",
    stats_in_production: "Under produktion",

    // Inventory
    inventory_shelf: "Hyllplats",
    inventory_warehouse: "Lager",
    inventory_no_shelf: "Ingen hyllplats registrerad",
    inventory_article: "Artikel",
    inventory_name: "Namn",
    inventory_batch: "Batch",
    inventory_manufacturer: "Tillverkare",
    inventory_stock_status: "Lagerstatus",
    inventory_in_stock: "I lager",
    inventory_print_label: "Skriv ut etikett",

    // Production
    production_title: "Produktion",
    production_ready: "redo",
    production_ongoing: "pågående",
    production_completed: "klara",
    production_search: "Sök projekt/order...",
    production_no_orders: "Inga produktionsordrar",
    production_start: "Starta produktion",
    production_complete: "Slutför produktion",
    production_ready_alert: "Redo för produktion",
    production_ready_desc: "Klicka på 'Starta produktion' för att börja monteringen",
    production_info: "Produktionsinformation",
    production_technician: "Ansvarig montör",
    production_assembly_date: "Monteringsdatum",
    production_under: "Under produktion",
    production_started: "Startad",
    production_time_in: "Tid i produktion",
    production_finished: "Produktion slutförd",
    production_completed_date: "Slutförd",
    production_total_time: "Total produktionstid",
    production_project_docs: "Projektunderlag",
    production_drawing: "Ritning",
    production_assembly_instruction: "Montageinstruktion",
    production_special_instruction: "Specialanvisningar",
    production_customer_req: "Kundkrav",
    production_technical_notes: "Tekniska noteringar",
    production_upload: "Ladda upp",
    production_uploading: "Laddar upp...",
    production_older_versions: "Äldre versioner",
    production_bom: "Digital BOM (Bill of Materials)",
    production_no_articles: "Inga artiklar i denna order",
    production_quantity: "Antal",
    production_documentation: "Produktionsdokumentation",
    production_checklist: "Checklista",
    production_assembled: "Monterad",
    production_tested: "Testad",
    production_ready_install: "Klar för installation",
    production_comments: "Kommentarer",
    production_comments_placeholder: "Anteckningar från produktion...",
    production_deviations: "Avvikelser",
    production_deviations_placeholder: "Avvikelser som upptäckts...",
    production_assembly_images: "Bilder på färdigmonterad enhet",
    production_serial_images: "Bilder på serienummeretikett",

    // Orders
    orders_picked: "Plockad",
    orders_customer: "Kund",

    // Movement types
    movement_inbound: "Inleverans",
    movement_outbound: "Uttag",
    movement_inventory: "Inventering",
    movement_adjustment: "Justering",

    // User Management
    users_title: "Användarhantering",
    users_manage_access: "Hantera användaråtkomst till moduler",
    users_select_modules: "Välj moduler som användaren ska ha tillgång till:",
    users_modules: "moduler",
    users_role: "Roll",
    module_inventory: "Lager",
    module_orders: "Ordrar",
    module_production: "Produktion",
    module_purchase_orders: "Inköpsordrar",
    module_site_reports: "Site Reports",
    module_unknown_deliveries: "Okända leveranser",
    module_repairs: "Reparationer",
    module_reports: "Rapporter",
  },
  en: {
    // Navigation
    nav_home: "Home",
    nav_inventory: "Inventory",
    nav_orders: "Orders",
    nav_work_orders: "Work Orders",
    nav_production: "Production",
    nav_purchase: "Purchasing",
    nav_site: "Site",
    nav_unknown: "Unknown",
    nav_repairs: "Repairs",
    nav_admin: "Admin",
    nav_projects: "Projects",
    nav_workspace: "Workspace",
    nav_employees: "Employees",
    nav_timesheet: "Timesheet",
    nav_mileage: "Mileage",

    // Common
    common_search: "Search",
    common_save: "Save",
    common_cancel: "Cancel",
    common_delete: "Delete",
    common_edit: "Edit",
    common_back: "Back",
    common_loading: "Loading...",
    common_all: "All",
    common_status: "Status",
    common_date: "Date",
    common_notes: "Notes",
    common_close: "Close",
    common_confirm: "Confirm",
    common_upload: "Upload",
    common_uploading: "Uploading...",
    common_send: "Send",
    common_scan: "Scan",
    common_add: "Add",
    common_create: "Create",
    common_update: "Update",
    common_articles: "Articles",

    // Sections / Page titles
    section_inventory: "Inventory",
    section_find: "Find",
    section_order_overview: "Order Overview",
    section_edit_order: "Edit Order",
    section_new_order: "New Order",
    section_customer_info: "Customer Information",
    section_delivery_info: "Delivery Information",
    section_technical_info: "Technical Information",
    section_special_requirements: "Special Requirements and Notes",
    section_documents: "Documents",
    section_finance: "Finance & Fortnox",
    section_production_flow: "Production Flow",
    section_pick_list: "Pick List",
    section_picking_notes: "Picking Notes",
    section_activity_log: "Activity Log",
    section_site_reports: "Site Reports",
    section_recent_updates: "Recent Updates",
    section_work_orders: "Work Orders",
    section_rm_system: "RM System",
    section_linked_work_orders: "Linked Work Orders",

    // Form field labels
    field_customer_name: "Customer Name",
    field_customer_reference: "Customer Reference",
    field_fortnox_customer: "Fortnox Customer",
    field_delivery_address: "Delivery Address",
    field_delivery_date: "Delivery Date",
    field_delivery_method: "Delivery Method",
    field_carrier: "Carrier",
    field_delivery_contact: "Delivery Contact",
    field_contact_phone: "Contact Phone",
    field_installation_date: "Installation Date",
    field_installation_type: "Installation Type",
    field_screen_dimensions: "Screen Dimensions",
    field_pixel_pitch: "Pixel Pitch",
    field_module_count: "Number of Modules",
    field_site_visit_info: "Site Visit Info",
    field_notes: "Notes",
    field_priority: "Priority",
    field_order_number: "Order Number",
    field_fortnox_project_nr: "Fortnox Project No.",
    field_fortnox_project_name: "Fortnox Project Name",
    field_billing_status: "Billing Status",
    field_important_for_team: "Important for Team",
    field_rm_system_id: "RM System ID",
    field_rm_system_url: "RM System URL",

    // Placeholders
    ph_customer_name: "Customer name",
    ph_customer_reference: "Customer reference / order number",
    ph_fortnox_customer: "E.g. 1234",
    ph_delivery_address: "Full delivery address...",
    ph_delivery_contact: "Name of contact person at delivery site",
    ph_contact_phone: "+46 70 XXX XX XX",
    ph_carrier: "DHL, Schenker, etc.",
    ph_screen_dimensions: "Width x Height mm (e.g. 1920 x 2400)",
    ph_pixel_pitch: "P2.6, P3.076, etc.",
    ph_module_count: "0",
    ph_site_visit_info: "Describe the site: dimensions, power access, mounting surface, special conditions. More info = fewer questions!",
    ph_critical_notes: "Write everything the team needs to know: special requirements, customer wishes, things to consider during design/assembly.",
    ph_search_article: "Search article, batch number or shelf location...",
    ph_search_order: "Search order or customer...",
    ph_search_article_start: "Start typing to search articles",
    ph_picking_notes: "Notes during picking...",
    ph_comment: "Write a comment, note or decision...",
    ph_order_number: "E.g. ORD-2025-001",
    ph_fortnox_project_nr: "E.g. 1234",
    ph_fortnox_project_name: "Project name",
    ph_rm_system_id: "E.g. RM-12345",

    // Help texts
    help_installation_date: "If different from delivery date",
    help_site_visit_tip: "💡 Tip: Take photos and upload under Documents",
    help_critical_notes: "⚠️ What you write here is visible to EVERYONE working on this order",
    help_documents: "📎 All documents uploaded here automatically follow through to design, production and assembly",
    help_all_docs_follow: "All documents uploaded here follow through all steps",

    // Buttons
    btn_withdraw: "Withdraw from Stock",
    btn_confirm_withdraw: "Confirm Withdrawal",
    btn_go_to: "Go to",
    btn_claim_task: "Claim this Task",
    btn_new_production: "New Production",
    btn_save_order: "Save Order",
    btn_create_order: "Create Order",
    btn_update_order: "Update",
    btn_see_work_order: "See Work Order →",
    btn_add_file: "Add file...",
    btn_select_file: "Select file...",
    btn_customer_order: "Customer Order / PO",
    btn_drawings: "Drawings",
    btn_site_images: "Site Visit Photos",
    btn_other_docs: "Other Documents",

    // Filters / chips
    filter_all: "All",
    filter_active: "Active",
    filter_low_stock: "Low Stock",
    filter_out_of_stock: "Out of Stock",
    filter_on_repair: "In Repair",
    filter_on_order: "On Order",
    filter_customer_owned: "Customer Owned",
    filter_rental: "Rental",
    filter_all_categories: "All Categories",

    // Priority labels
    priority_low: "Low",
    priority_normal: "Normal",
    priority_high: "High",
    priority_urgent: "Urgent",

    // Status labels
    status_pending: "Pending",
    status_in_progress: "In Progress",
    status_completed: "Completed",
    status_cancelled: "Cancelled",
    status_delayed: "Delayed",
    status_new: "New",
    status_in_review: "In Review",
    status_active: "In Stock",
    status_low_stock: "Low Stock",
    status_out_of_stock: "Out of Stock",
    status_unbilled: "Unbilled",
    status_pending_billing: "Pending Billing",
    status_billed: "Billed",

    // Stage labels
    stage_design: "Design",
    stage_production: "Production",
    stage_warehouse: "Warehouse",
    stage_assembly: "Assembly",
    stage_delivery: "Delivery",
    stage_sales: "Sales",
    stage_incoming: "Incoming",

    // Order status values
    order_status_salj: "Sales",
    order_status_konstruktion: "Design",
    order_status_produktion: "Production",
    order_status_lager: "Warehouse",
    order_status_montering: "Assembly",

    // Delivery method labels
    delivery_truck: "Truck",
    delivery_courier: "Courier",
    delivery_air: "Air Freight",
    delivery_sea: "Sea Freight",
    delivery_pickup: "Pickup",
    delivery_other: "Other",

    // Installation type labels
    install_new: "New Installation",
    install_replacement: "Replacement / Upgrade",
    install_addition: "Addition",
    install_service: "Service / Repair",
    install_rental: "Rental / Event",

    // Time expressions
    time_delayed: "delayed",
    time_remaining: "remaining",
    time_orders: "orders",
    time_delayed_plural: "delayed",
    time_soon: "soon",
    time_in_progress: "in progress",
    time_incoming: "incoming",
    time_hour: "hour",
    time_hours: "hours",
    time_minute: "minute",
    time_minutes: "minutes",

    // Validation / warnings
    validation_required_fields: "Customer name, delivery date and delivery address are required",
    warning_important_from_sales: "⚠️ Important from sales:",
    warning_missing_materials: "Missing materials",
    warning_complete_checklist: "Complete the checklist",
    warning_all_docs_follow: "All documents uploaded here follow through all steps",
    warning_team_visible: "⚠️ What you write here is visible to EVERYONE working on this order",

    // Home page
    home_quick_withdrawal: "Quick Withdrawal",
    home_quick_withdrawal_desc: "Remove from stock",
    home_inbound: "Inbound",
    home_inbound_desc: "Register new goods",
    home_search_article: "Search Article",
    home_search_article_desc: "Find quickly in stock",
    home_orders_to_pick: "Orders to Pick",
    home_orders_waiting: "waiting",
    home_order: "order",
    home_orders: "orders",
    home_day: "day",
    home_days: "days",
    home_site_reports: "Incoming Site Reports",
    home_reports_waiting: "awaiting review",
    home_report: "report",
    home_reports: "reports",
    home_alerts: "Requires Attention",
    home_recent_activity: "Recent Activity",
    home_recent_articles: "Recent Articles",
    home_show_all: "Show All",
    home_no_activity: "No activity yet",

    // Stats
    stats_articles: "Articles",
    stats_total_stock: "Total in Stock",
    stats_low_stock: "Low Stock",
    stats_out_of_stock: "Out of Stock",
    stats_on_repair: "On Repair",
    stats_total_orders: "Total Orders",
    stats_ready_production: "Ready for Production",
    stats_in_production: "In Production",

    // Inventory
    inventory_shelf: "Shelf Location",
    inventory_warehouse: "Warehouse",
    inventory_no_shelf: "No shelf location registered",
    inventory_article: "Article",
    inventory_name: "Name",
    inventory_batch: "Batch",
    inventory_manufacturer: "Manufacturer",
    inventory_stock_status: "Stock Status",
    inventory_in_stock: "In Stock",
    inventory_print_label: "Print Label",

    // Production
    production_title: "Production",
    production_ready: "ready",
    production_ongoing: "ongoing",
    production_completed: "completed",
    production_search: "Search project/order...",
    production_no_orders: "No production orders",
    production_start: "Start Production",
    production_complete: "Complete Production",
    production_ready_alert: "Ready for Production",
    production_ready_desc: "Click 'Start Production' to begin assembly",
    production_info: "Production Information",
    production_technician: "Responsible Technician",
    production_assembly_date: "Assembly Date",
    production_under: "In Production",
    production_started: "Started",
    production_time_in: "Time in Production",
    production_finished: "Production Completed",
    production_completed_date: "Completed",
    production_total_time: "Total Production Time",
    production_project_docs: "Project Documentation",
    production_drawing: "Drawing",
    production_assembly_instruction: "Assembly Instructions",
    production_special_instruction: "Special Instructions",
    production_customer_req: "Customer Requirements",
    production_technical_notes: "Technical Notes",
    production_upload: "Upload",
    production_uploading: "Uploading...",
    production_older_versions: "Older Versions",
    production_bom: "Digital BOM (Bill of Materials)",
    production_no_articles: "No articles in this order",
    production_quantity: "Quantity",
    production_documentation: "Production Documentation",
    production_checklist: "Checklist",
    production_assembled: "Assembled",
    production_tested: "Tested",
    production_ready_install: "Ready for Installation",
    production_comments: "Comments",
    production_comments_placeholder: "Notes from production...",
    production_deviations: "Deviations",
    production_deviations_placeholder: "Discovered deviations...",
    production_assembly_images: "Images of Assembled Unit",
    production_serial_images: "Images of Serial Number Label",

    // Orders
    orders_picked: "Picked",
    orders_customer: "Customer",

    // Movement types
    movement_inbound: "Inbound",
    movement_outbound: "Withdrawal",
    movement_inventory: "Inventory",
    movement_adjustment: "Adjustment",

    // User Management
    users_title: "User Management",
    users_manage_access: "Manage user access to modules",
    users_select_modules: "Select modules this user should have access to:",
    users_modules: "modules",
    users_role: "Role",
    module_inventory: "Inventory",
    module_orders: "Orders",
    module_production: "Production",
    module_purchase_orders: "Purchase Orders",
    module_site_reports: "Site Reports",
    module_unknown_deliveries: "Unknown Deliveries",
    module_repairs: "Repairs",
    module_reports: "Reports",
  }
};

export const t = (key, lang = 'sv') => {
  return translations[lang]?.[key] || translations['sv']?.[key] || key;
};

// Translate dynamic order/work-order status values
export const tOrderStatus = (status, lang = 'sv') => {
  const map = {
    sv: { 'SÄLJ': 'Sälj', 'KONSTRUKTION': 'Konstruktion', 'PRODUKTION': 'Produktion', 'LAGER': 'Lager', 'MONTERING': 'Montering' },
    en: { 'SÄLJ': 'Sales', 'KONSTRUKTION': 'Design', 'PRODUKTION': 'Production', 'LAGER': 'Warehouse', 'MONTERING': 'Assembly' }
  };
  return map[lang]?.[status] || status;
};

// Translate work order stage values
export const tStage = (stage, lang = 'sv') => {
  const map = {
    sv: { konstruktion: 'Konstruktion', produktion: 'Produktion', lager: 'Lager', montering: 'Montering', leverans: 'Leverans' },
    en: { konstruktion: 'Design', produktion: 'Production', lager: 'Warehouse', montering: 'Assembly', leverans: 'Delivery' }
  };
  return map[lang]?.[stage] || stage;
};

// Translate work order status values
export const tWorkOrderStatus = (status, lang = 'sv') => {
  const map = {
    sv: { väntande: 'Väntande', pågår: 'Pågår', klar: 'Klar', avbruten: 'Avbruten' },
    en: { väntande: 'Pending', pågår: 'In Progress', klar: 'Completed', avbruten: 'Cancelled' }
  };
  return map[lang]?.[status] || status;
};

// Translate priority values
export const tPriority = (priority, lang = 'sv') => {
  const map = {
    sv: { låg: 'Låg', normal: 'Normal', hög: 'Hög', brådskande: 'Brådskande' },
    en: { låg: 'Low', normal: 'Normal', hög: 'High', brådskande: 'Urgent' }
  };
  return map[lang]?.[priority] || priority;
};

// Translate article status values
export const tArticleStatus = (status, lang = 'sv') => {
  const map = {
    sv: { active: 'Aktiv', low_stock: 'Lågt lager', out_of_stock: 'Slut i lager', on_repair: 'På reparation', in_transit: 'På inköp', discontinued: 'Utgången' },
    en: { active: 'Active', low_stock: 'Low Stock', out_of_stock: 'Out of Stock', on_repair: 'In Repair', in_transit: 'On Order', discontinued: 'Discontinued' }
  };
  return map[lang]?.[status] || status;
};

// Translate financial status
export const tFinancialStatus = (status, lang = 'sv') => {
  const map = {
    sv: { unbilled: 'Ej fakturerad', pending_billing: 'Inväntar fakturering', billed: 'Fakturerad' },
    en: { unbilled: 'Unbilled', pending_billing: 'Pending Billing', billed: 'Billed' }
  };
  return map[lang]?.[status] || status;
};