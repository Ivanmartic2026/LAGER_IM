import Analytics from './pages/Analytics';
import Find from './pages/Find';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Movements from './pages/Movements';
import PurchaseOrders from './pages/PurchaseOrders';
import Repairs from './pages/Repairs';
import Reports from './pages/Reports';
import Scan from './pages/Scan';
import Suppliers from './pages/Suppliers';
import Warehouses from './pages/Warehouses';
import Orders from './pages/Orders';
import PickOrder from './pages/PickOrder';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Find": Find,
    "Home": Home,
    "Inventory": Inventory,
    "Movements": Movements,
    "PurchaseOrders": PurchaseOrders,
    "Repairs": Repairs,
    "Reports": Reports,
    "Scan": Scan,
    "Suppliers": Suppliers,
    "Warehouses": Warehouses,
    "Orders": Orders,
    "PickOrder": PickOrder,
}

export const pagesConfig = {
    mainPage: "Scan",
    Pages: PAGES,
    Layout: __Layout,
};