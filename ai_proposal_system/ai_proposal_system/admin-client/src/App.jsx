import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 공개 페이지
import HomePage from './pages/public/HomePage';
import ProductsPage from './pages/public/ProductsPage';
import ProductDetailPage from './pages/public/ProductDetailPage';
import OrderPage from './pages/public/OrderPage';
import OrderCompletePage from './pages/public/OrderCompletePage';
import DownloadPage from './pages/public/DownloadPage';

// Team D — 뮤직비디오 제작
import MVProjectList   from './pages/music-video/MVProjectList';
import MVProjectCreate from './pages/music-video/MVProjectCreate';
import MVProjectDetail from './pages/music-video/MVProjectDetail';

// Team D — AI 영상 제작 관리 (fal.ai 기반)
import AIVideoList    from './pages/ai-video/AIVideoList';
import AIVideoCreate  from './pages/ai-video/AIVideoCreate';
import AIVideoDetail  from './pages/ai-video/AIVideoDetail';
import AIVideoMonitor from './pages/ai-video/AIVideoMonitor';

// Team D — 영상 제작 (공개 + 관리자)
import VideoCreatorWizard  from './pages/video-creator/VideoCreatorWizard';
import PhotoUploadPage     from './pages/video-creator/PhotoUploadPage';
import MusicSelectPage     from './pages/video-creator/MusicSelectPage';
import ScenarioPage        from './pages/video-creator/ScenarioPage';
import PreviewPage         from './pages/video-creator/PreviewPage';
import AdminVideoProjects  from './pages/video-creator/AdminVideoProjects';

// 관리자 페이지
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserNew from './pages/admin/AdminUserNew';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── 공개 페이지 ── */}
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/order/:productId" element={<OrderPage />} />
        <Route path="/order/complete/:orderNumber" element={<OrderCompletePage />} />
        <Route path="/download" element={<DownloadPage />} />

        {/* ── 관리자 페이지 (/admin/*) ── */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/users/new" element={<AdminRoute><AdminUserNew /></AdminRoute>} />
        <Route path="/admin/users/:id" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/products/new" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
        <Route path="/admin/products/:id/edit" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin/orders/:id" element={<AdminRoute><AdminOrderDetail /></AdminRoute>} />

        {/* ── Team D: 영상 제작 마법사 (공개) ── */}
        <Route path="/video-creator"                      element={<VideoCreatorWizard />} />
        <Route path="/video-creator/:id/photos"           element={<PhotoUploadPage />} />
        <Route path="/video-creator/:id/music"            element={<MusicSelectPage />} />
        <Route path="/video-creator/:id/scenario"         element={<ScenarioPage />} />
        <Route path="/video-creator/:id/preview"          element={<PreviewPage />} />

        {/* ── Team D: 관리자 영상 관리 (기존 photo slideshow) ── */}
        <Route path="/admin/video-projects" element={<AdminRoute><AdminVideoProjects /></AdminRoute>} />

        {/* ── Team D: AI 영상 제작 관리 (fal.ai 기반) ── */}
        <Route path="/admin/ai-video"            element={<AdminRoute><AIVideoList /></AdminRoute>} />
        <Route path="/admin/ai-video/create"     element={<AdminRoute><AIVideoCreate /></AdminRoute>} />
        <Route path="/admin/ai-video/:id"        element={<AdminRoute><AIVideoDetail /></AdminRoute>} />
        <Route path="/admin/ai-video/:id/monitor" element={<AdminRoute><AIVideoMonitor /></AdminRoute>} />

        {/* ── Team D: 뮤직비디오 제작 ── */}
        <Route path="/admin/music-video"         element={<AdminRoute><MVProjectList   /></AdminRoute>} />
        <Route path="/admin/music-video/create"  element={<AdminRoute><MVProjectCreate /></AdminRoute>} />
        <Route path="/admin/music-video/:id"     element={<AdminRoute><MVProjectDetail /></AdminRoute>} />

        {/* 구 경로 → /admin 리다이렉트 (북마크 호환) */}
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
