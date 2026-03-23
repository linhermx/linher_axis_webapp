import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import '../styles/layout.css';

const Layout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const hasTopbarTabs = location.pathname.startsWith('/employees');

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
      />
      <div className={`main-content ${hasTopbarTabs ? 'has-topbar-tabs' : ''}`}>
        <Topbar hasTabs={hasTopbarTabs} />
        <main className="page-container page-shell">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
