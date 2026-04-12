import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AiAssistant from './AiAssistant';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-primary)' }}>
        <div className="p-6 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
      <AiAssistant />
    </div>
  );
}
