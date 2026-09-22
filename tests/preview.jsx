import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../src/components/Theme'
import Layout from '../src/components/Layout'
import ResourcePage from '../src/features/resources/ResourcePage'
import Orders from '../src/features/orders/Orders'
import Settings from '../src/features/settings/Settings'
import Manager from '../src/features/assistant/Manager'
import WhatsApp from '../src/features/whatsapp/WhatsApp'
import PublicLayout from '../src/features/public/PublicLayout'
import Home from '../src/features/public/Home'
import Bank from '../src/features/banking/Bank'
import SettlementReview from '../src/features/banking/SettlementReview'
import '../src/styles.css'
import '../src/enhancements.css'
import '../src/comqora.css'
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/home-preview" element={<Home />} />
          </Route>
          <Route element={<Layout />}>
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
            <Route path="orders" element={<Orders />} />
            <Route path="settings" element={<Settings />} />
            <Route path="manager" element={<Manager />} />
            <Route path="whatsapp" element={<WhatsApp />} />
            <Route path="bank" element={<Bank />} />
            <Route path="bank/:id" element={<SettlementReview />} />
            <Route path="*" element={<Navigate to="/products" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </ThemeProvider>,
)
