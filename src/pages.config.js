import Admin from './pages/Admin';
import Analytics from './pages/Analytics';
import EmailOrderSetup from './pages/EmailOrderSetup';
import Find from './pages/Find';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import InventoryValue from './pages/InventoryValue';
import Movements from './pages/Movements';
import NotificationSettings from './pages/NotificationSettings';
import Orders from './pages/Orders';
import PickOrder from './pages/PickOrder';
import PurchaseOrders from './pages/PurchaseOrders';
import ReceivePurchaseOrder from './pages/ReceivePurchaseOrder';
import Repairs from './pages/Repairs';
import Reports from './pages/Reports';
import Scan from './pages/Scan';
import SupplierLogin from './pages/SupplierLogin';
import SupplierPortal from './pages/SupplierPortal';
import SupplierPortalAdmin from './pages/SupplierPortalAdmin';
import Suppliers from './pages/Suppliers';
import UnknownDeliveries from './pages/UnknownDeliveries';
import UsersManagement from './pages/UsersManagement';
import WarehouseDashboard from './pages/WarehouseDashboard';
import Warehouses from './pages/Warehouses';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Analytics": Analytics,
    "EmailOrderSetup": EmailOrderSetup,
    "Find": Find,
    "Home": Home,
    "Inventory": Inventory,
    "InventoryValue": InventoryValue,
    "Movements": Movements,
    "NotificationSettings": NotificationSettings,
    "Orders": Orders,
    "PickOrder": PickOrder,
    "PurchaseOrders": PurchaseOrders,
    "ReceivePurchaseOrder": ReceivePurchaseOrder,
    "Repairs": Repairs,
    "Reports": Reports,
    "Scan": Scan,
    "SupplierLogin": SupplierLogin,
    "SupplierPortal": SupplierPortal,
    "SupplierPortalAdmin": SupplierPortalAdmin,
    "Suppliers": Suppliers,
    "UnknownDeliveries": UnknownDeliveries,
    "UsersManagement": UsersManagement,
    "WarehouseDashboard": WarehouseDashboard,
    "Warehouses": Warehouses,
}

export const pagesConfig = {
    mainPage: "Scan",
    Pages: PAGES,
    Layout: __Layout,
};