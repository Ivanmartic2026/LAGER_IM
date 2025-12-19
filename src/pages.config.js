import Scan from './pages/Scan';
import Inventory from './pages/Inventory';
import Home from './pages/Home';
import Find from './pages/Find';
import Movements from './pages/Movements';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Scan": Scan,
    "Inventory": Inventory,
    "Home": Home,
    "Find": Find,
    "Movements": Movements,
}

export const pagesConfig = {
    mainPage: "Scan",
    Pages: PAGES,
    Layout: __Layout,
};