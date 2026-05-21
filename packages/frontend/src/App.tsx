// App.tsx
// Top-level layout: Header (with language toggle) and route outlet. The
// /vote/* subtree is wrapped in the VoteAuthProvider so member/admin pages
// can call useAuth(); the public questionnaire is untouched by it.

import { Route, Routes } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Landing } from './pages/Landing';
import { Questionnaire } from './pages/Questionnaire';
import { Success } from './pages/Success';
import { VoteAuthProvider } from './features/vote/AuthContext';
import { RequireAuth } from './components/vote/RequireAuth';
import { RequireAdmin } from './components/vote/RequireAdmin';
import { VoteLogin } from './pages/vote/VoteLogin';
import { VoteVerify } from './pages/vote/VoteVerify';
import { VoteList } from './pages/vote/VoteList';
import { VoteDetail } from './pages/vote/VoteDetail';
import { VoteSuccess } from './pages/vote/VoteSuccess';
import { VoteResults } from './pages/vote/VoteResults';
import { AdminDashboard } from './pages/vote/admin/AdminDashboard';
import { AdminVoters } from './pages/vote/admin/AdminVoters';
import { AdminVoteCreate } from './pages/vote/admin/AdminVoteCreate';
import { AdminVoteDetail } from './pages/vote/admin/AdminVoteDetail';
import { AdminVoteResults } from './pages/vote/admin/AdminVoteResults';
import { AdminAuditLog } from './pages/vote/admin/AdminAuditLog';

export const App = () => {
  return (
    <div className="flex min-h-screen flex-col bg-hc-bg-cream">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/success" element={<Success />} />

          {/* Vote module — wrapped in its own auth provider. */}
          <Route
            path="/vote/*"
            element={
              <VoteAuthProvider>
                <Routes>
                  <Route path="login" element={<VoteLogin />} />
                  <Route path="verify" element={<VoteVerify />} />
                  <Route
                    path=""
                    element={
                      <RequireAuth>
                        <VoteList />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path=":id"
                    element={
                      <RequireAuth>
                        <VoteDetail />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path=":id/success"
                    element={
                      <RequireAuth>
                        <VoteSuccess />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path=":id/results"
                    element={
                      <RequireAuth>
                        <VoteResults />
                      </RequireAuth>
                    }
                  />

                  {/* Admin sub-tree */}
                  <Route
                    path="admin"
                    element={
                      <RequireAdmin>
                        <AdminDashboard />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="admin/voters"
                    element={
                      <RequireAdmin>
                        <AdminVoters />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="admin/votes/new"
                    element={
                      <RequireAdmin>
                        <AdminVoteCreate />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="admin/votes/:id"
                    element={
                      <RequireAdmin>
                        <AdminVoteDetail />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="admin/votes/:id/results"
                    element={
                      <RequireAdmin>
                        <AdminVoteResults />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="admin/audit"
                    element={
                      <RequireAdmin>
                        <AdminAuditLog />
                      </RequireAdmin>
                    }
                  />
                </Routes>
              </VoteAuthProvider>
            }
          />

          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};
