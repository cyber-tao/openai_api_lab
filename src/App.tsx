import React, { useEffect } from 'react';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ChatPage, ConfigPage, TestingPage, StatisticsPage } from './pages';
import DebugDashboard from './components/debug/DebugDashboard';
import { useSettingsStore } from './stores/settingsStore';
import './App.css';

const App: React.FC = () => {
  const { theme: currentTheme, loadFromStorage } = useSettingsStore();

  // Load settings on app start
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Determine theme algorithm
  const getThemeAlgorithm = () => {
    if (currentTheme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      return mediaQuery.matches ? theme.darkAlgorithm : theme.defaultAlgorithm;
    }
    return currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;
  };

  // Theme tokens
  const themeTokens = {
    colorPrimary: '#3b82f6',
    colorBgBase: currentTheme === 'light' ? '#ffffff' : '#0f0f0f',
    colorBgContainer: currentTheme === 'light' ? '#f8f9fa' : '#1a1a1a',
    colorBgElevated: currentTheme === 'light' ? '#ffffff' : '#262626',
    colorText: currentTheme === 'light' ? '#000000' : '#ffffff',
    colorTextSecondary: currentTheme === 'light' ? '#666666' : '#a3a3a3',
    colorTextTertiary: currentTheme === 'light' ? '#999999' : '#737373',
    colorBorder: currentTheme === 'light' ? '#d9d9d9' : '#404040',
    colorBorderSecondary: currentTheme === 'light' ? '#f0f0f0' : '#262626',
    borderRadius: 8,
    wireframe: false,
  };

  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          algorithm: getThemeAlgorithm(),
          token: themeTokens,
          components: {
            Layout: {
              bodyBg: themeTokens.colorBgBase,
              headerBg: themeTokens.colorBgContainer,
              siderBg: themeTokens.colorBgContainer,
            },
            Menu: {
              darkItemBg: themeTokens.colorBgContainer,
              darkItemSelectedBg: themeTokens.colorPrimary,
              darkItemHoverBg: themeTokens.colorBgElevated,
              itemBg: themeTokens.colorBgContainer,
              itemSelectedBg: themeTokens.colorPrimary,
              itemHoverBg: themeTokens.colorBgElevated,
            },
            Button: {
              primaryShadow: 'none',
            },
            Card: {
              colorBgContainer: themeTokens.colorBgContainer,
            },
          },
        }}
      >
        <AntApp>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<ChatPage />} />
                <Route path="/config" element={<ConfigPage />} />
                <Route path="/testing" element={<TestingPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/debug" element={<DebugDashboard />} />
              </Routes>
            </Layout>
          </Router>
        </AntApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;
