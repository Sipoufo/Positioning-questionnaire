// App.tsx
// Top-level layout: Header (with language toggle) and route outlet.

import { Route, Routes } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Landing } from './pages/Landing';
import { Questionnaire } from './pages/Questionnaire';
import { Success } from './pages/Success';

export const App = () => {
  return (
    <div className="flex min-h-screen flex-col bg-hc-bg-cream">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/success" element={<Success />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};
