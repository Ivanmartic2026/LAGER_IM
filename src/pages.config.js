import Scan from './pages/Scan';
import Inventory from './pages/Inventory';
import Home from './pages/Home';
import Find from './pages/Find';
import Movements from './pages/Movements';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import PurchaseOrders from './pages/PurchaseOrders';
import Suppliers from './pages/Suppliers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Scan": Scan,
    "Inventory": Inventory,
    "Home": Home,
    "Find": Find,
    "Movements": Movements,
    "Reports": Reports,
    "Analytics": Analytics,
    "PurchaseOrders": PurchaseOrders,
    "Suppliers": Suppliers,
}

export const pagesConfig = {
    mainPage: "Scan",
    Pages: PAGES,
    Layout: __Layout,
};