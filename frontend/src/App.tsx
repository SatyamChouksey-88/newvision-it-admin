import {
  AuditOutlined,
  BarChartOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  LaptopOutlined,
  InboxOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
  FormOutlined,
  ToolOutlined,
  CustomerServiceOutlined,
  CommentOutlined,
} from '@ant-design/icons';
import { ErrorComponent, ThemedLayout, useNotificationProvider } from '@refinedev/antd';
import { Authenticated, Refine } from '@refinedev/core';
import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from '@refinedev/react-router';
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router';
import { AppSider } from './components/AppSider';
import { Header } from './components/Header';
import { RoleRouteGuard } from './components/RoleRouteGuard';
import { RouteFallback } from './components/RouteFallback';
import { TabletCollapse } from './components/TabletCollapse';
import { Title } from './components/Title';
import { accessControlProvider } from './providers/accessControlProvider';
import { authProvider } from './providers/authProvider';
import { dataProvider } from './providers/dataProvider';
import { newVisionTheme } from './theme';

function lazyNamed<T extends Record<string, ComponentType>>(
  loader: () => Promise<T>,
  exportName: keyof T,
) {
  return lazy(async () => {
    const mod = await loader();
    return { default: mod[exportName] };
  });
}

const DashboardPage = lazyNamed(() => import('./pages/dashboard'), 'DashboardPage');
const AssetList = lazyNamed(() => import('./pages/assets/list'), 'AssetList');
const AssetCreate = lazyNamed(() => import('./pages/assets/create'), 'AssetCreate');
const AssetEdit = lazyNamed(() => import('./pages/assets/edit'), 'AssetEdit');
const AssetShow = lazyNamed(() => import('./pages/assets/show'), 'AssetShow');
const EmployeeList = lazyNamed(() => import('./pages/employees/list'), 'EmployeeList');
const EmployeeProfile = lazyNamed(() => import('./pages/employees/profile'), 'EmployeeProfile');
const LocationList = lazyNamed(() => import('./pages/locations/list'), 'LocationList');
const LocationCreate = lazyNamed(() => import('./pages/locations/create'), 'LocationCreate');
const LocationEdit = lazyNamed(() => import('./pages/locations/edit'), 'LocationEdit');
const AccessoriesPage = lazyNamed(() => import('./pages/accessories/list'), 'AccessoriesPage');
const ConsumablesPage = lazyNamed(() => import('./pages/consumables/list'), 'ConsumablesPage');
const RequestsPage = lazyNamed(() => import('./pages/requests/list'), 'RequestsPage');
const MaintenancePage = lazyNamed(() => import('./pages/maintenance'), 'MaintenancePage');
const TicketList = lazyNamed(() => import('./pages/tickets/list'), 'TicketList');
const TicketCreate = lazyNamed(() => import('./pages/tickets/create'), 'TicketCreate');
const TicketReports = lazyNamed(() => import('./pages/tickets/reports'), 'TicketReports');
const TicketShow = lazyNamed(() => import('./pages/tickets/show'), 'TicketShow');
const VendorList = lazyNamed(() => import('./pages/procurement/vendors/list'), 'VendorList');
const VendorForm = lazyNamed(() => import('./pages/procurement/vendors/form'), 'VendorForm');
const VendorShow = lazyNamed(() => import('./pages/procurement/vendors/show'), 'VendorShow');
const RequisitionList = lazyNamed(() => import('./pages/procurement/requisitions/list'), 'RequisitionList');
const RequisitionForm = lazyNamed(() => import('./pages/procurement/requisitions/form'), 'RequisitionForm');
const RequisitionShow = lazyNamed(() => import('./pages/procurement/requisitions/show'), 'RequisitionShow');
const PurchaseOrderList = lazyNamed(() => import('./pages/procurement/orders/list'), 'PurchaseOrderList');
const PurchaseOrderShow = lazyNamed(() => import('./pages/procurement/orders/show'), 'PurchaseOrderShow');
const ContractList = lazyNamed(() => import('./pages/procurement/contracts/list'), 'ContractList');
const ContractShow = lazyNamed(() => import('./pages/procurement/contracts/show'), 'ContractShow');
const ReportsPage = lazyNamed(() => import('./pages/reports'), 'ReportsPage');
const AuditList = lazyNamed(() => import('./pages/audit/list'), 'AuditList');
const SettingsPage = lazyNamed(() => import('./pages/settings'), 'SettingsPage');
const HelpSection = lazyNamed(() => import('./pages/help/HelpSection'), 'HelpSection');
const ChatPage = lazyNamed(() => import('./pages/chat/ChatPage'), 'ChatPage');
const LoginPage = lazyNamed(() => import('./pages/login'), 'LoginPage');
const ResetPasswordPage = lazyNamed(() => import('./pages/reset-password'), 'ResetPasswordPage');
const ScanPage = lazyNamed(() => import('./pages/scan'), 'ScanPage');

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={{ ...newVisionTheme, algorithm: theme.defaultAlgorithm }}>
        <AntdApp>
          <Refine
            dataProvider={dataProvider}
            authProvider={authProvider}
            accessControlProvider={accessControlProvider}
            routerProvider={routerProvider}
            notificationProvider={useNotificationProvider}
            resources={[
              {
                name: 'dashboard',
                list: '/',
                meta: { label: 'Dashboard', icon: <DashboardOutlined /> },
              },
              {
                name: 'assets',
                list: '/assets',
                create: '/assets/create',
                edit: '/assets/edit/:id',
                show: '/assets/show/:id',
                meta: { label: 'Assets', icon: <LaptopOutlined /> },
              },
              {
                name: 'employees',
                list: '/employees',
                show: '/employees/show/:id',
                meta: { label: 'Employees', icon: <TeamOutlined /> },
              },
              {
                name: 'locations',
                list: '/locations',
                create: '/locations/create',
                edit: '/locations/edit/:id',
                meta: { label: 'Locations', icon: <EnvironmentOutlined /> },
              },
              {
                name: 'accessories',
                list: '/accessories',
                meta: { label: 'Accessories', icon: <ShoppingOutlined /> },
              },
              {
                name: 'consumables',
                list: '/consumables',
                meta: { label: 'Consumables', icon: <InboxOutlined /> },
              },
              {
                name: 'asset-requests',
                list: '/requests',
                meta: { label: 'Requests', icon: <FormOutlined /> },
              },
              {
                name: 'maintenance',
                list: '/maintenance',
                meta: { label: 'Maintenance', icon: <ToolOutlined /> },
              },
              {
                name: 'chat',
                list: '/chat',
                meta: { label: 'Chat', icon: <CommentOutlined /> },
              },
              {
                name: 'support-tickets',
                list: '/tickets',
                create: '/tickets/create',
                show: '/tickets/show/:id',
                meta: { label: 'Support Tickets', icon: <CustomerServiceOutlined /> },
              },
              {
                name: 'vendors',
                list: '/procurement/vendors',
                create: '/procurement/vendors/create',
                edit: '/procurement/vendors/edit/:id',
                show: '/procurement/vendors/show/:id',
                meta: { label: 'Vendors' },
              },
              {
                name: 'purchase-requisitions',
                list: '/procurement/requisitions',
                create: '/procurement/requisitions/create',
                edit: '/procurement/requisitions/edit/:id',
                show: '/procurement/requisitions/show/:id',
                meta: { label: 'Requisitions' },
              },
              {
                name: 'purchase-orders',
                list: '/procurement/orders',
                show: '/procurement/orders/show/:id',
                meta: { label: 'Purchase Orders' },
              },
              {
                name: 'vendor-contracts',
                list: '/procurement/contracts',
                show: '/procurement/contracts/show/:id',
                meta: { label: 'Contracts' },
              },
              {
                name: 'reports',
                list: '/reports',
                meta: { label: 'Reports', icon: <BarChartOutlined /> },
              },
              {
                name: 'audit-logs',
                list: '/audit-logs',
                meta: { label: 'Audit Log', icon: <AuditOutlined /> },
              },
              {
                name: 'settings',
                list: '/settings',
                meta: { label: 'Settings', icon: <SettingOutlined /> },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              disableTelemetry: true,
            }}
          >
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/scan/:code" element={<ScanPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                  element={
                    <Authenticated key="auth" fallback={<CatchAllNavigate to="/login" />}>
                      <ThemedLayout Header={Header} Title={Title} Sider={AppSider}>
                        <TabletCollapse />
                        <Suspense fallback={<RouteFallback />}>
                          <RoleRouteGuard>
                            <Outlet />
                          </RoleRouteGuard>
                        </Suspense>
                      </ThemedLayout>
                    </Authenticated>
                  }
                >
                  <Route index element={<DashboardPage />} />

                  <Route path="/assets">
                    <Route index element={<AssetList />} />
                    <Route path="create" element={<AssetCreate />} />
                    <Route path="edit/:id" element={<AssetEdit />} />
                    <Route path="show/:id" element={<AssetShow />} />
                  </Route>

                  <Route path="/employees">
                    <Route index element={<EmployeeList />} />
                    <Route path="show/:id" element={<EmployeeProfile />} />
                  </Route>

                  <Route path="/locations">
                    <Route index element={<LocationList />} />
                    <Route path="create" element={<LocationCreate />} />
                    <Route path="edit/:id" element={<LocationEdit />} />
                  </Route>

                  <Route path="/accessories" element={<AccessoriesPage />} />
                  <Route path="/consumables" element={<ConsumablesPage />} />
                  <Route path="/requests" element={<RequestsPage />} />

                  <Route path="/maintenance" element={<MaintenancePage />} />
                  <Route path="/tickets">
                    <Route index element={<TicketList />} />
                    <Route path="create" element={<TicketCreate />} />
                    <Route path="reports" element={<TicketReports />} />
                    <Route path="show/:id" element={<TicketShow />} />
                  </Route>
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/procurement/vendors">
                    <Route index element={<VendorList />} />
                    <Route path="create" element={<VendorForm />} />
                    <Route path="edit/:id" element={<VendorForm />} />
                    <Route path="show/:id" element={<VendorShow />} />
                  </Route>
                  <Route path="/procurement/requisitions">
                    <Route index element={<RequisitionList />} />
                    <Route path="create" element={<RequisitionForm />} />
                    <Route path="edit/:id" element={<RequisitionForm />} />
                    <Route path="show/:id" element={<RequisitionShow />} />
                  </Route>
                  <Route path="/procurement/orders">
                    <Route index element={<PurchaseOrderList />} />
                    <Route path="show/:id" element={<PurchaseOrderShow />} />
                  </Route>
                  <Route path="/procurement/contracts">
                    <Route index element={<ContractList />} />
                    <Route path="show/:id" element={<ContractShow />} />
                  </Route>
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/audit-logs" element={<AuditList />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  <Route path="*" element={<ErrorComponent />} />
                </Route>

                {/* Help is a full-page documentation site with its own chrome (header, nav
                    tree, table of contents) — deliberately not nested in the main app shell. */}
                <Route
                  element={
                    <Authenticated key="help-auth" fallback={<CatchAllNavigate to="/login" />}>
                      <Suspense fallback={<RouteFallback />}>
                        <Outlet />
                      </Suspense>
                    </Authenticated>
                  }
                >
                  <Route path="/help/*" element={<HelpSection />} />
                </Route>

                <Route
                  element={
                    <Authenticated key="auth-pages" fallback={<Outlet />}>
                      <NavigateToResource resource="dashboard" />
                    </Authenticated>
                  }
                >
                  <Route path="/login" element={<LoginPage />} />
                </Route>
              </Routes>
            </Suspense>

            <UnsavedChangesNotifier />
            <DocumentTitleHandler
              handler={({ resource }) => {
                const page = resource?.meta?.label ?? 'IT Asset Management';
                return `${page} | NewVisionITIS`;
              }}
            />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}
