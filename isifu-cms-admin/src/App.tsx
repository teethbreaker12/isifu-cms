import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { ContentTypesPage } from './pages/ContentTypesPage';
import { DashboardPage } from './pages/DashboardPage';
import { EntriesPage } from './pages/EntriesPage';
import { FormsPage } from './pages/FormsPage';
import { LoginPage } from './pages/LoginPage';
import { MediaPage } from './pages/MediaPage';
import { PagesPage } from './pages/PagesPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="content-types" element={<ContentTypesPage />} />
          <Route path="entries" element={<EntriesPage />} />
          <Route path="forms" element={<FormsPage />} />
          <Route path="pages" element={<PagesPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
