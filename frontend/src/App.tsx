import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Spinner from './components/ui/Spinner';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ComposePage from './pages/ComposePage';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center"><Spinner /></div>;
  const guard = (el: JSX.Element) => (user ? el : <Navigate to="/" replace />);
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard/scheduled" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<Navigate to="/dashboard/scheduled" replace />} />
      <Route path="/dashboard/:tab" element={guard(<DashboardPage />)} />
      <Route path="/compose" element={guard(<ComposePage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
