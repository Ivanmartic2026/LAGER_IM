/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const Admin = lazy(() => import('./pages/Admin'));
const KilometerErsattning = lazy(() => import('./pages/KilometerErsattning'));
const MedarbetarOversikt = lazy(() => import('./pages/MedarbetarOversikt'));
const TidsRapport = lazy(() => import('./pages/TidsRapport'));
const WorkspaceProjects = lazy(() => import('./pages/WorkspaceProjects'));
const Analytics = lazy(() => import('./pages/Analytics'));
const EmailOrderSetup = lazy(() => import('./pages/EmailOrderSetup'));
const Find = lazy(() => import('./pages/Find'));
const Home = lazy(() => import('./pages/Home'));
const Inventory = lazy(() => import('./pages/Inventory'));
const InventoryValue = lazy(() => import('./pages/InventoryValue'));
const Movements = lazy(() => import('./pages/Movements'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Orders = lazy(() => import('./pages/Orders'));
const PWASetup = lazy(() => import('./pages/PWASetup'));
const PickOrder = lazy(() => import('./pages/PickOrder'));
const PrintLabel = lazy(() => import('./pages/PrintLabel'));
const Production = lazy(() => import('./pages/Production'));
const ProductionView = lazy(() => import('./pages/ProductionView'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const ReceivePurchaseOrder = lazy(() => import('./pages/ReceivePurchaseOrder'));
const Repairs = lazy(() => import('./pages/Repairs'));
const Reports = lazy(() => import('./pages/Reports'));
const Scan = lazy(() => import('./pages/Scan'));
const SiteHistory = lazy(() => import('./pages/SiteHistory'));
const SiteReportSettings = lazy(() => import('./pages/SiteReportSettings'));
const SiteReports = lazy(() => import('./pages/SiteReports'));
const StockForecast = lazy(() => import('./pages/StockForecast'));
const SupplierDocumentUpload = lazy(() => import('./pages/SupplierDocumentUpload'));
const SupplierDocumentationOverview = lazy(() => import('./pages/SupplierDocumentationOverview'));
const SupplierLogin = lazy(() => import('./pages/SupplierLogin'));
const SupplierPOView = lazy(() => import('./pages/SupplierPOView'));
const SupplierPortal = lazy(() => import('./pages/SupplierPortal'));
const SupplierPortalAdmin = lazy(() => import('./pages/SupplierPortalAdmin'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const UnknownDeliveries = lazy(() => import('./pages/UnknownDeliveries'));
const UsersManagement = lazy(() => import('./pages/UsersManagement'));
const WarehouseDashboard = lazy(() => import('./pages/WarehouseDashboard'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const WorkOrders = lazy(() => import('./pages/WorkOrders'));
const WorkOrderView = lazy(() => import('./pages/WorkOrderView'));

export const PAGES = {
    "Admin": Admin,
    "KilometerErsattning": KilometerErsattning,
    "MedarbetarOversikt": MedarbetarOversikt,
    "TidsRapport": TidsRapport,
    "WorkspaceProjects": WorkspaceProjects,
    "Analytics": Analytics,
    "EmailOrderSetup": EmailOrderSetup,
    "Find": Find,
    "Home": Home,
    "Inventory": Inventory,
    "InventoryValue": InventoryValue,
    "Movements": Movements,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "Orders": Orders,
    "PWASetup": PWASetup,
    "PickOrder": PickOrder,
    "PrintLabel": PrintLabel,
    "Production": Production,
    "ProductionView": ProductionView,
    "PurchaseOrders": PurchaseOrders,
    "ReceivePurchaseOrder": ReceivePurchaseOrder,
    "Repairs": Repairs,
    "Reports": Reports,
    "Scan": Scan,
    "SiteHistory": SiteHistory,
    "SiteReportSettings": SiteReportSettings,
    "SiteReports": SiteReports,
    "StockForecast": StockForecast,
    "SupplierDocumentUpload": SupplierDocumentUpload,
    "SupplierDocumentationOverview": SupplierDocumentationOverview,
    "SupplierLogin": SupplierLogin,
    "SupplierPOView": SupplierPOView,
    "SupplierPortal": SupplierPortal,
    "SupplierPortalAdmin": SupplierPortalAdmin,
    "Suppliers": Suppliers,
    "UnknownDeliveries": UnknownDeliveries,
    "UsersManagement": UsersManagement,
    "WarehouseDashboard": WarehouseDashboard,
    "Warehouses": Warehouses,
    "WorkOrders": WorkOrders,
    "WorkOrderView": WorkOrderView,
}

export const pagesConfig = {
    mainPage: "Find",
    Pages: PAGES,
    Layout: __Layout,
};