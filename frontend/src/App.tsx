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
import { BrowserRouter, Outlet, Route, Routes } from 'react-router';
import { AppSider } from './components/AppSider';
import { Header } from './components/Header';
import { TabletCollapse } from './components/TabletCollapse';
import { Title } from './components/Title';
import { AccessoriesPage } from './pages/accessories/list';
import { AssetCreate } from './pages/assets/create';
import { ConsumablesPage } from './pages/consumables/list';
import { RequestsPage } from './pages/requests/list';
import { AssetEdit } from './pages/assets/edit';
import { AssetList } from './pages/assets/list';
import { AssetShow } from './pages/assets/show';
import { AuditList } from './pages/audit/list';
import { DashboardPage } from './pages/dashboard';
import { EmployeeList } from './pages/employees/list';
import { EmployeeProfile } from './pages/employees/profile';
import { LocationCreate } from './pages/locations/create';
import { LocationEdit } from './pages/locations/edit';
import { LocationList } from './pages/locations/list';
import { LoginPage } from './pages/login';
import { MaintenancePage } from './pages/maintenance';
import { ReportsPage } from './pages/reports';
import { HelpSection } from './pages/help/HelpSection';
import { ScanPage } from './pages/scan';
import { SettingsPage } from './pages/settings';
import { TicketCreate } from './pages/tickets/create';
import { TicketList } from './pages/tickets/list';
import { TicketReports } from './pages/tickets/reports';
import { TicketShow } from './pages/tickets/show';
import { authProvider } from './providers/authProvider';
import { dataProvider } from './providers/dataProvider';
import { newVisionTheme } from './theme';

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={{ ...newVisionTheme, algorithm: theme.defaultAlgorithm }}>
        <AntdApp>
          <Refine
            dataProvider={dataProvider}
            authProvider={authProvider}
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
                name: 'support-tickets',
                list: '/tickets',
                create: '/tickets/create',
                show: '/tickets/show/:id',
                meta: { label: 'Support Tickets', icon: <CustomerServiceOutlined /> },
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
            <Routes>
              <Route path="/scan/:code" element={<ScanPage />} />
              <Route
                element={
                  <Authenticated key="auth" fallback={<CatchAllNavigate to="/login" />}>
                    <ThemedLayout Header={Header} Title={Title} Sider={AppSider}>
                      <TabletCollapse />
                      <Outlet />
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
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/audit-logs" element={<AuditList />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/help/*" element={<HelpSection />} />

                <Route path="*" element={<ErrorComponent />} />
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

            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}
