import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './features/auth/AuthContext'
import { Loading } from './components/ui'
import Layout from './components/Layout'
import AuthPage from './features/auth/AuthPage'
const Billing = lazy(() => import('./features/billing/Billing'))
const Dashboard = lazy(() => import('./features/analytics/Dashboard'))
const Manager = lazy(() => import('./features/assistant/Manager'))
const Analytics = lazy(() => import('./features/analytics/Analytics'))
const Orders = lazy(() => import('./features/orders/Orders'))
const OrderDetail = lazy(() => import('./features/orders/OrderDetail'))
const ResourcePage = lazy(() => import('./features/resources/ResourcePage'))
const Settings = lazy(() => import('./features/settings/Settings'))
const WhatsApp = lazy(() => import('./features/whatsapp/WhatsApp'))
const Bank = lazy(() => import('./features/banking/Bank'))
const SettlementReview = lazy(() => import('./features/banking/SettlementReview'))
const Unsubscribe = lazy(() => import('./features/whatsapp/Unsubscribe'))
const PublicLayout = lazy(() => import('./features/public/PublicLayout'))
const Home = lazy(() => import('./features/public/Home'))
const Blog = lazy(() => import('./features/public/Blog'))
const BlogArticle = lazy(() =>
  import('./features/public/Blog').then((m) => ({ default: m.BlogArticle })),
)
const Legal = lazy(() => import('./features/public/Legal'))
const Contact = lazy(() => import('./features/public/Contact'))
const NotFound = lazy(() =>
  import('./features/public/Contact').then((m) => ({ default: m.NotFound })),
)

export default function App() {
  const { user, loading } = useAuth()
  const locked = user && !user.has_dashboard_access
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogArticle />} />
          <Route path="contact" element={<Contact />} />
          <Route path="pricing" element={<Billing />} />
          {['privacy', 'terms', 'cookies', 'acceptable-use', 'refunds', 'security'].map((page) => (
            <Route key={page} path={page} element={<Legal page={page} />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route
          path="billing"
          element={loading ? <Loading /> : user ? <Billing /> : <Navigate to="/login" replace />}
        />
        <Route path="whatsapp-unsubscribe" element={<Unsubscribe />} />
        {[
          'login',
          'register',
          'forgot-password',
          'reset-password',
          'verify-email',
          'resend-verification',
        ].map((path) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              user && !locked && ['login', 'register'].includes(path) ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <AuthPage key={path} />
              )
            }
          />
        ))}
        <Route
          element={
            loading ? (
              <Loading />
            ) : user ? (
              locked ? (
                <Navigate to="/billing" replace />
              ) : (
                <Layout />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route
            path="manager"
            element={user?.has_ai_access ? <Manager /> : <Navigate to="/billing" replace />}
          />
          <Route path="analytics" element={<Analytics />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          {[
            'products',
            'categories',
            'inventory',
            'packaging',
            'couriers',
            'customers',
            'marketing',
            'expenses',
          ].map((resource) => (
            <Route
              key={resource}
              path={resource}
              element={<ResourcePage key={resource} resource={resource} />}
            />
          ))}
          <Route path="settings" element={<Settings />} />
          <Route path="whatsapp" element={<WhatsApp />} />
          <Route path="bank" element={<Bank />} />
          <Route path="bank/:id" element={<SettlementReview />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
