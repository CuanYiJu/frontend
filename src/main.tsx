import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { RequireMember, RequireUser, SessionProvider } from './session';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { OnboardingPage } from './pages/Onboarding';
import { EventDetailPage } from './pages/EventDetail';
import { EventFormPage } from './pages/EventForm';
import { MePage } from './pages/Me';
import { AdminPage } from './pages/Admin';
import './styles.css';

const member = (page: React.ReactNode) => <RequireMember>{page}</RequireMember>;

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={member(<HomePage />)} />
            <Route path="/events/new" element={member(<EventFormPage mode="create" />)} />
            <Route path="/events/:id" element={member(<EventDetailPage />)} />
            <Route path="/events/:id/edit" element={member(<EventFormPage mode="edit" />)} />
            <Route path="/me" element={member(<MePage />)} />
            <Route path="/admin" element={member(<AdminPage />)} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/onboarding"
              element={
                <RequireUser>
                  <OnboardingPage />
                </RequireUser>
              }
            />
            <Route path="*" element={<p className="empty">页面不存在。</p>} />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
