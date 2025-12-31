import Admin from './pages/Admin';
import Analytics from './pages/Analytics';
import Find from './pages/Find';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Movements from './pages/Movements';
import Orders from './pages/Orders';
import PickOrder from './pages/PickOrder';
import PurchaseOrders from './pages/PurchaseOrders';
import ReceivePurchaseOrder from './pages/ReceivePurchaseOrder';
import Repairs from './pages/Repairs';
import Scan from './pages/Scan';
import Suppliers from './pages/Suppliers';
import UsersManagement from './pages/UsersManagement';
import Warehouses from './pages/Warehouses';
import Reports from './pages/Reports';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Analytics": Analytics,
    "Find": Find,
    "Home": Home,
    "Inventory": Inventory,
    "Movements": Movements,
    "Orders": Orders,
    "PickOrder": PickOrder,
    "PurchaseOrders": PurchaseOrders,
    "ReceivePurchaseOrder": ReceivePurchaseOrder,
    "Repairs": Repairs,
    "Scan": Scan,
    "Suppliers": Suppliers,
    "UsersManagement": UsersManagement,
    "Warehouses": Warehouses,
    "Reports": Reports,
}

export const pagesConfig = {
    mainPage: "Scan",
    Pages: PAGES,
    Layout: __Layout,
};