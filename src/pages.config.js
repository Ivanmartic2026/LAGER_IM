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
import Admin from './pages/Admin';
import Analytics from './pages/Analytics';
import Documentation from './pages/Documentation';
import EmailOrderSetup from './pages/EmailOrderSetup';
import Find from './pages/Find';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import InventoryValue from './pages/InventoryValue';
import Movements from './pages/Movements';
import NotificationSettings from './pages/NotificationSettings';
import Orders from './pages/Orders';
import PWASetup from './pages/PWASetup';
import PickOrder from './pages/PickOrder';
import PurchaseOrders from './pages/PurchaseOrders';
import ReceivePurchaseOrder from './pages/ReceivePurchaseOrder';
import Repairs from './pages/Repairs';
import Reports from './pages/Reports';
import Scan from './pages/Scan';
import SiteHistory from './pages/SiteHistory';
import SiteReports from './pages/SiteReports';
import StockForecast from './pages/StockForecast';
import SupplierLogin from './pages/SupplierLogin';
import SupplierPortal from './pages/SupplierPortal';
import SupplierPortalAdmin from './pages/SupplierPortalAdmin';
import Suppliers from './pages/Suppliers';
import UnknownDeliveries from './pages/UnknownDeliveries';
import UsersManagement from './pages/UsersManagement';
import WarehouseDashboard from './pages/WarehouseDashboard';
import Warehouses from './pages/Warehouses';
import Production from './pages/Production';
import ProductionView from './pages/ProductionView';
import SupplierPOView from './pages/SupplierPOView';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Analytics": Analytics,
    "Documentation": Documentation,
    "EmailOrderSetup": EmailOrderSetup,
    "Find": Find,
    "Home": Home,
    "Inventory": Inventory,
    "InventoryValue": InventoryValue,
    "Movements": Movements,
    "NotificationSettings": NotificationSettings,
    "Orders": Orders,
    "PWASetup": PWASetup,
    "PickOrder": PickOrder,
    "PurchaseOrders": PurchaseOrders,
    "ReceivePurchaseOrder": ReceivePurchaseOrder,
    "Repairs": Repairs,
    "Reports": Reports,
    "Scan": Scan,
    "SiteHistory": SiteHistory,
    "SiteReports": SiteReports,
    "StockForecast": StockForecast,
    "SupplierLogin": SupplierLogin,
    "SupplierPortal": SupplierPortal,
    "SupplierPortalAdmin": SupplierPortalAdmin,
    "Suppliers": Suppliers,
    "UnknownDeliveries": UnknownDeliveries,
    "UsersManagement": UsersManagement,
    "WarehouseDashboard": WarehouseDashboard,
    "Warehouses": Warehouses,
    "Production": Production,
    "ProductionView": ProductionView,
    "SupplierPOView": SupplierPOView,
}

export const pagesConfig = {
    mainPage: "Scan",
    Pages: PAGES,
    Layout: __Layout,
};