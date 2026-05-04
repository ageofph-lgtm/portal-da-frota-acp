import Dashboard from './pages/Dashboard';
import Gestao from './pages/Gestao';
import AoVivo from './pages/AoVivo';
import Producao from './pages/Producao';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Dashboard": Dashboard,
    "Gestao": Gestao,
    "AoVivo": AoVivo,
    "Producao": Producao,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
