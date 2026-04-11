import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import Pipelines from './pages/Pipelines';
import PullRequests from './pages/PullRequests';
import Deploy from './pages/Deploy';
import Environments from './pages/Environments';
import Security from './pages/Security';
import ALMJira from './pages/ALMJira';
import Meetings from './pages/Meetings';
import Notifications from './pages/Notifications';
import Team from './pages/Team';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/pipelines" element={<Pipelines />} />
            <Route path="/pull-requests" element={<PullRequests />} />
            <Route path="/deploy" element={<Deploy />} />
            <Route path="/environments" element={<Environments />} />
            <Route path="/security" element={<Security />} />
            <Route path="/alm-jira" element={<ALMJira />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/team" element={<Team />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
