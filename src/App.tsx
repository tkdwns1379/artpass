import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/layouts/MainLayout';
import Home from '@/pages/Home';
import UniversityDetail from '@/pages/UniversityDetail';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Admin from '@/pages/Admin';
import Feedback from '@/pages/Feedback';
import MyPage from '@/pages/MyPage';
import ChatRooms from '@/pages/ChatRooms';
import ChatRoom from '@/pages/ChatRoom';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null; // 세션 로드 중 깜빡임 방지
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="university/:id" element={<UniversityDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="mypage" element={<MyPage />} />
        <Route path="rooms" element={<ChatRooms />} />
        <Route path="rooms/:id" element={<ChatRoom />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
