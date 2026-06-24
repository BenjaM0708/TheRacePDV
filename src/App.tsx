import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CreateGame } from './pages/admin/CreateGame';
import { JoinPage } from './pages/participant/JoinPage';
import { PlayPage } from './pages/participant/PlayPage';
import { useAuth } from './hooks/useAuth';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">
        Cargando.....
      </div>
    );
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/join" replace />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/play/:code" element={<PlayPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/create"
          element={
            <AdminRoute>
              <CreateGame />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
