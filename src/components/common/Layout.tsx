/**
 * Main Layout Component
 * Provides the responsive layout structure with sidebar navigation and header
 */

import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Button, Drawer, Grid } from 'antd';
import {
  MessageSquare,
  Settings,
  BarChart3,
  Zap,
  Menu as MenuIcon,
  X,
  Moon,
  Sun,
  Monitor,
  HelpCircle,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { ScreenReaderAnnouncer } from './ScreenReaderAnnouncer';
import { useScreenReaderAnnouncer } from '../../hooks/useScreenReaderAnnouncer';
import './Layout.css';

const { Header, Sider, Content } = AntLayout;
const { useBreakpoint } = Grid;

interface LayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
}

const navigationItems: NavigationItem[] = [
  {
    key: 'chat',
    icon: <MessageSquare size={18} />,
    label: 'Chat',
    path: '/',
  },
  {
    key: 'config',
    icon: <Settings size={18} />,
    label: 'Configuration',
    path: '/config',
  },
  {
    key: 'testing',
    icon: <Zap size={18} />,
    label: 'Testing',
    path: '/testing',
  },
  {
    key: 'statistics',
    icon: <BarChart3 size={18} />,
    label: 'Statistics',
    path: '/statistics',
  },
];

const themeIcons = {
  dark: <Moon size={16} />,
  light: <Sun size={16} />,
  auto: <Monitor size={16} />,
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);
  const screens = useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { theme, toggleTheme, compactMode, animations } = useSettingsStore();
  const { announcement, announce } = useScreenReaderAnnouncer();
  
  // Determine if we're on mobile
  const isMobile = !screens.md;
  
  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  // Get current active menu key based on location
  const getActiveKey = () => {
    const path = location.pathname;
    const item = navigationItems.find(item => item.path === path);
    return item?.key || 'chat';
  };

  // Handle navigation
  const handleMenuClick = (key: string) => {
    const item = navigationItems.find(item => item.key === key);
    if (item) {
      navigate(item.path);
      // Close mobile drawer after navigation
      if (isMobile) {
        setMobileDrawerOpen(false);
      }
    }
  };

  // Handle theme cycling
  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'auto' : 'dark';
    toggleTheme();
    announce(`Theme changed to ${newTheme}`, 'polite');
  };

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setCollapsed(!collapsed);
    announce(collapsed ? 'Sidebar expanded' : 'Sidebar collapsed', 'polite');
  };

  // Handle shortcuts help
  const handleShowShortcuts = () => {
    setShortcutsHelpVisible(true);
  };

  // Define keyboard shortcuts
  const layoutShortcuts: KeyboardShortcut[] = [
    {
      key: 'b',
      ctrlKey: true,
      action: handleSidebarToggle,
      description: 'Toggle sidebar',
    },
    {
      key: 't',
      ctrlKey: true,
      action: handleThemeToggle,
      description: 'Cycle theme (dark → light → auto)',
    },
    {
      key: '?',
      shiftKey: true,
      action: handleShowShortcuts,
      description: 'Show keyboard shortcuts help',
    },
    {
      key: '1',
      altKey: true,
      action: () => handleMenuClick('chat'),
      description: 'Go to Chat',
    },
    {
      key: '2',
      altKey: true,
      action: () => handleMenuClick('config'),
      description: 'Go to Configuration',
    },
    {
      key: '3',
      altKey: true,
      action: () => handleMenuClick('testing'),
      description: 'Go to Testing',
    },
    {
      key: '4',
      altKey: true,
      action: () => handleMenuClick('statistics'),
      description: 'Go to Statistics',
    },
  ];

  // Apply keyboard shortcuts
  useKeyboardShortcuts(layoutShortcuts);

  // Menu items for Ant Design Menu component
  const menuItems = navigationItems.map(item => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
  }));

  // Sidebar content
  const sidebarContent = (
    <div className="layout-sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <Zap size={24} className="logo-icon" />
          {!collapsed && <span className="logo-text">API Lab</span>}
        </div>
      </div>
      
      <Menu
        mode="inline"
        selectedKeys={[getActiveKey()]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        className="sidebar-menu"
        inlineCollapsed={collapsed && !isMobile}
      />
    </div>
  );

  return (
    <AntLayout className={`main-layout ${compactMode ? 'compact' : ''} ${!animations ? 'no-animations' : ''}`}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={240}
          collapsedWidth={64}
          className="layout-sider"
          trigger={null}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title={null}
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          bodyStyle={{ padding: 0 }}
          width={240}
          className="mobile-drawer"
        >
          {sidebarContent}
        </Drawer>
      )}

      <AntLayout className="layout-main">
        {/* Header */}
        <Header className="layout-header">
          <div className="header-left">
            {isMobile ? (
              <Button
                type="text"
                icon={<MenuIcon size={18} />}
                onClick={() => setMobileDrawerOpen(true)}
                className="mobile-menu-button"
                aria-label="Open navigation menu"
              />
            ) : (
              <Button
                type="text"
                icon={collapsed ? <MenuIcon size={18} /> : <X size={18} />}
                onClick={handleSidebarToggle}
                className="sidebar-toggle"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              />
            )}
            
            <div className="header-title">
              <h1>OpenAI API Lab</h1>
            </div>
          </div>

          <div className="header-right">
            <Button
              type="text"
              icon={<HelpCircle size={16} />}
              onClick={handleShowShortcuts}
              className="shortcuts-help"
              aria-label="Show keyboard shortcuts help"
              title="Show keyboard shortcuts (Shift + ?)"
            />
            <Button
              type="text"
              icon={themeIcons[theme]}
              onClick={handleThemeToggle}
              className="theme-toggle"
              aria-label={`Switch theme (current: ${theme})`}
              title={`Current theme: ${theme}. Click to cycle through themes.`}
            />
          </div>
        </Header>

        {/* Main Content */}
        <Content className="layout-content">
          <div className="content-wrapper">
            {children}
          </div>
        </Content>
      </AntLayout>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        visible={shortcutsHelpVisible}
        onClose={() => setShortcutsHelpVisible(false)}
        shortcuts={layoutShortcuts}
      />

      {/* Screen Reader Announcements */}
      {announcement && (
        <ScreenReaderAnnouncer
          message={announcement.message}
          priority={announcement.priority}
        />
      )}
    </AntLayout>
  );
};

export default Layout;