'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { RecordFilter } from '@/types/record';

type TabId = 'dashboard' | 'repository' | 'analytics';

interface AppState {
  activeTab: TabId;
  refreshTrigger: number;
  presetFilters: RecordFilter | null;
  isRecordModalOpen: boolean;
}

interface AppActions {
  goToTab: (tab: TabId) => void;
  navigateToRepository: (filters: RecordFilter) => void;
  triggerRefresh: () => void;
  openRecordModal: () => void;
  closeRecordModal: () => void;
}

type AppContextValue = AppState & AppActions;

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [presetFilters, setPresetFilters] = useState<RecordFilter | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const goToTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setPresetFilters(null);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const navigateToRepository = useCallback((filters: RecordFilter) => {
    setPresetFilters({ ...filters, autoRun: true });
    setActiveTab('repository');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const openRecordModal = useCallback(() => {
    setIsRecordModalOpen(true);
  }, []);

  const closeRecordModal = useCallback(() => {
    setIsRecordModalOpen(false);
  }, []);

  const value: AppContextValue = {
    activeTab,
    refreshTrigger,
    presetFilters,
    isRecordModalOpen,
    goToTab,
    navigateToRepository,
    triggerRefresh,
    openRecordModal,
    closeRecordModal,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
