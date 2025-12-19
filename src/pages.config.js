import Scan from './pages/Scan';
import Inventory from './pages/Inventory';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Scan": Scan,
    "Inventory": Inventory,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Scan",
    Pages: PAGES,
    Layout: __Layout,
};