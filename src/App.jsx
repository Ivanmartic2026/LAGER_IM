import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { lazy, Suspense, useEffect } from 'react'
const VisualEditAgent = lazy(() => import('@/lib/VisualEditAgent'))
import NavigationTracker from '@/lib/NavigationTracker'
import { runMigrationsOnce } from '@/lib/initializeMigrations'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const SupplierPOView = lazy(() => import('@/pages/SupplierPOView'));
const FortnoxSync = lazy(() => import('@/pages/FortnoxSync'));
const OrderEdit = lazy(() => import('@/pages/OrderEdit'));
const OrderDetail = lazy(() => import('@/pages/OrderDetail'));
const WorkOrderViewPage = lazy(() => import('@/pages/WorkOrderView'));
const SupplierDashboard = lazy(() => import('@/pages/SupplierDashboard'));
const SupplierLogin = lazy(() => import('@/pages/SupplierLogin'));
const ProjectResults = lazy(() => import('@/pages/ProjectResults'));
const ProjectReport = lazy(() => import('@/pages/ProjectReport'));
const WorkspaceProjects = lazy(() => import('@/pages/WorkspaceProjects'));
const MedarbetarOversikt = lazy(() => import('@/pages/MedarbetarOversikt'));
const TidsRapport = lazy(() => import('@/pages/TidsRapport'));
const KilometerErsattning = lazy(() => import('@/pages/KilometerErsattning'));
const OrderDashboard = lazy(() => import('@/pages/OrderDashboard'));
const WorkOrders = lazy(() => import('@/pages/WorkOrders'));
const PrintWorkOrder = lazy(() => import('@/pages/PrintWorkOrder'));
const PrintPickList = lazy(() => import('@/pages/PrintPickList'));
const PrintDeliveryNote = lazy(() => import('@/pages/PrintDeliveryNote'));
const FortnoxCustomers = lazy(() => import('@/pages/FortnoxCustomers'));
const BatchReview = lazy(() => import('@/pages/BatchReview'));
const BatchReanalyze = lazy(() => import('@/pages/BatchReanalyze'));
const BatchDashboard = lazy(() => import('@/pages/BatchDashboard'));
const BatchDetail = lazy(() => import('@/pages/BatchDetail'));
const BatchSuggestions = lazy(() => import('@/pages/BatchSuggestions'));
const HomeSaljare = lazy(() => import('@/pages/HomeSaljare'));
const HomeKonstruktor = lazy(() => import('@/pages/HomeKonstruktor'));
const HomeInkopare = lazy(() => import('@/pages/HomeInkopare'));
const HomeLager = lazy(() => import('@/pages/HomeLager'));
const HomeProduktion = lazy(() => import('@/pages/HomeProduktion'));
const HomeTekniker = lazy(() => import('@/pages/HomeTekniker'));
const HomeIvan = lazy(() => import('@/pages/HomeIvan'));
const UsersManagement = lazy(() => import('@/pages/UsersManagement'));
const MigrationCenter = lazy(() => import('@/pages/MigrationCenter'));
const PatternRules = lazy(() => import('@/pages/PatternRules'));
const MatchReview = lazy(() => import('@/pages/MatchReview'));

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
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black"><div className="w-8 h-8 border-4 border-zinc-700 border-t-white rounded-full animate-spin"></div></div>}>
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
    </Suspense>
  );
};


function MigrationRunner() {
  useEffect(() => {
    runMigrationsOnce();
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthProvider>
          <MigrationRunner />
          <NavigationTracker />
          <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black"><div className="w-8 h-8 border-4 border-zinc-700 border-t-white rounded-full animate-spin"></div></div>}>
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
              <LayoutWrapper currentPageName="Admin">
                <FortnoxSync />
              </LayoutWrapper>
            } />
            {/* Fortnox Customers - under Admin */}
            <Route path="/FortnoxCustomers" element={
              <LayoutWrapper currentPageName="Admin">
                <FortnoxCustomers />
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
            {/* Batch AI scanning routes */}
            <Route path="/BatchReview" element={
              <LayoutWrapper currentPageName="Admin">
                <BatchReview />
              </LayoutWrapper>
            } />
            <Route path="/BatchReanalyze" element={
              <LayoutWrapper currentPageName="Admin">
                <BatchReanalyze />
              </LayoutWrapper>
            } />
            <Route path="/BatchDashboard" element={
              <LayoutWrapper currentPageName="Admin">
                <BatchDashboard />
              </LayoutWrapper>
            } />
            <Route path="/BatchDetail" element={
              <LayoutWrapper currentPageName="Admin">
                <BatchDetail />
              </LayoutWrapper>
            } />
            <Route path="/BatchSuggestions" element={
              <LayoutWrapper currentPageName="Admin">
                <BatchSuggestions />
              </LayoutWrapper>
            } />
            {/* Role-based home pages */}
            <Route path="/home/saljare" element={<LayoutWrapper currentPageName="Home"><HomeSaljare /></LayoutWrapper>} />
            <Route path="/home/konstruktor" element={<LayoutWrapper currentPageName="Home"><HomeKonstruktor /></LayoutWrapper>} />
            <Route path="/home/inkopare" element={<LayoutWrapper currentPageName="Home"><HomeInkopare /></LayoutWrapper>} />
            <Route path="/home/lager" element={<LayoutWrapper currentPageName="Home"><HomeLager /></LayoutWrapper>} />
            <Route path="/home/produktion" element={<LayoutWrapper currentPageName="Home"><HomeProduktion /></LayoutWrapper>} />
            <Route path="/home/tekniker" element={<LayoutWrapper currentPageName="Home"><HomeTekniker /></LayoutWrapper>} />
            <Route path="/home/ivan" element={<LayoutWrapper currentPageName="Home"><HomeIvan /></LayoutWrapper>} />
            <Route path="/home/admin" element={<LayoutWrapper currentPageName="Admin"><HomeIvan /></LayoutWrapper>} />
            {/* User management */}
            <Route path="/UsersManagement" element={
              <LayoutWrapper currentPageName="Admin">
                <UsersManagement />
              </LayoutWrapper>
            } />
            {/* Migration Center */}
            <Route path="/MigrationCenter" element={
              <LayoutWrapper currentPageName="Admin">
                <MigrationCenter />
              </LayoutWrapper>
            } />
            {/* Match Review Queue */}
            <Route path="/MatchReview" element={
              <LayoutWrapper currentPageName="Admin">
                <MatchReview />
              </LayoutWrapper>
            } />
            {/* Pattern Rules */}
            <Route path="/PatternRules" element={
              <LayoutWrapper currentPageName="Admin">
                <PatternRules />
              </LayoutWrapper>
            } />
            {/* Print views - public, no layout */}
            <Route path="/PrintWorkOrder" element={<PrintWorkOrder />} />
            <Route path="/PrintPickList" element={<PrintPickList />} />
            <Route path="/PrintDeliveryNote" element={<PrintDeliveryNote />} />
            {/* All other routes require auth */}
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
          </Suspense>
          <Toaster />
          <Suspense fallback={null}><VisualEditAgent /></Suspense>
        </AuthProvider>
      </Router>
      </QueryClientProvider>
  )
}

export default App