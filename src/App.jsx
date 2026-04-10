import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SupplierPOView from '@/pages/SupplierPOView';
import FortnoxSync from '@/pages/FortnoxSync';
import OrderEdit from '@/pages/OrderEdit';
import OrderDetail from '@/pages/OrderDetail';
import WorkOrderViewPage from '@/pages/WorkOrderView';
import SupplierDashboard from '@/pages/SupplierDashboard';
import SupplierLogin from '@/pages/SupplierLogin';
import ProjectResults from '@/pages/ProjectResults';
import ProjectReport from '@/pages/ProjectReport';
import WorkspaceProjects from '@/pages/WorkspaceProjects';
import MedarbetarOversikt from '@/pages/MedarbetarOversikt';
import TidsRapport from '@/pages/TidsRapport';
import KilometerErsattning from '@/pages/KilometerErsattning';
import OrderDashboard from '@/pages/OrderDashboard';
import WorkOrders from '@/pages/WorkOrders';
import PrintWorkOrder from '@/pages/PrintWorkOrder';
import PrintPickList from '@/pages/PrintPickList';
import PrintDeliveryNote from '@/pages/PrintDeliveryNote';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Skip auth checks for public pages
  if (location.pathname === '/OrderDashboard') {
    return (
      <Routes>
        <Route path="/OrderDashboard" element={<OrderDashboard />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <Routes>
            {/* Public order dashboard - no auth required */}
            <Route path="/OrderDashboard" element={<OrderDashboard />} />
            {/* Public supplier portal - no auth required */}
            <Route path="/SupplierPOView" element={<SupplierPOView />} />
            {/* Supplier Login & Dashboard - no auth required */}
            <Route path="/SupplierLogin" element={<SupplierLogin />} />
            <Route path="/SupplierDashboard" element={<SupplierDashboard />} />
            {/* Fortnox Sync - admin only */}
            <Route path="/FortnoxSync" element={
              <LayoutWrapper currentPageName="FortnoxSync">
                <FortnoxSync />
              </LayoutWrapper>
            } />
            {/* Order Edit - fullscreen */}
            <Route path="/OrderEdit" element={
              <LayoutWrapper currentPageName="Orders">
                <OrderEdit />
              </LayoutWrapper>
            } />
            {/* Order Detail - fullscreen */}
            <Route path="/OrderDetail" element={
              <LayoutWrapper currentPageName="Orders">
                <OrderDetail />
              </LayoutWrapper>
            } />
            {/* WorkOrder Detail */}
            <Route path="/WorkOrders/:workOrderId" element={
              <LayoutWrapper currentPageName="WorkOrders">
                <WorkOrderViewPage />
              </LayoutWrapper>
            } />

            {/* Project Report */}
            <Route path="/ProjectReport" element={<ProjectReport />} />
            {/* Workspace Projects */}
            <Route path="/WorkspaceProjects" element={
              <LayoutWrapper currentPageName="WorkspaceProjects">
                <WorkspaceProjects />
              </LayoutWrapper>
            } />
            {/* Medarbetar Oversikt */}
            <Route path="/MedarbetarOversikt" element={
              <LayoutWrapper currentPageName="MedarbetarOversikt">
                <MedarbetarOversikt />
              </LayoutWrapper>
            } />
            {/* Tidrapport */}
            <Route path="/TidsRapport" element={
              <LayoutWrapper currentPageName="TidsRapport">
                <TidsRapport />
              </LayoutWrapper>
            } />
            {/* Kilometer Ersattning */}
            <Route path="/KilometerErsattning" element={
              <LayoutWrapper currentPageName="KilometerErsattning">
                <KilometerErsattning />
              </LayoutWrapper>
            } />
            {/* Project Results */}
            <Route path="/ProjectResults" element={
              <LayoutWrapper currentPageName="Reports">
                <ProjectResults />
              </LayoutWrapper>
            } />
            {/* Work Orders List */}
            <Route path="/WorkOrders" element={
              <LayoutWrapper currentPageName="WorkOrders">
                <WorkOrders />
              </LayoutWrapper>
            } />
            {/* Print views - public, no layout */}
            <Route path="/PrintWorkOrder" element={<PrintWorkOrder />} />
            <Route path="/PrintPickList" element={<PrintPickList />} />
            <Route path="/PrintDeliveryNote" element={<PrintDeliveryNote />} />
            {/* All other routes require auth */}
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App