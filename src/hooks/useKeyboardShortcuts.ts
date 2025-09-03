/**
 * Keyboard Shortcuts Hook
 * Provides keyboard shortcut functionality with accessibility support
 */

import { useEffect, useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  disabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { keyboardShortcuts: globalEnabled } = useSettingsStore();
  
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = true,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if shortcuts are globally enabled and locally enabled
      if (!globalEnabled || !enabled) {
        return;
      }

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]') ||
        target.closest('.ant-input') ||
        target.closest('.ant-select') ||
        target.closest('.ant-mentions');

      if (isInputField) {
        return;
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find(shortcut => {
        if (shortcut.disabled) {
          return false;
        }

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!event.ctrlKey === !!shortcut.ctrlKey;
        const altMatch = !!event.altKey === !!shortcut.altKey;
        const shiftMatch = !!event.shiftKey === !!shortcut.shiftKey;
        const metaMatch = !!event.metaKey === !!shortcut.metaKey;

        return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
      });

      if (matchingShortcut) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }

        try {
          matchingShortcut.action();
        } catch (error) {
          console.error('Error executing keyboard shortcut:', error);
        }
      }
    },
    [shortcuts, globalEnabled, enabled, preventDefault, stopPropagation]
  );

  useEffect(() => {
    if (!globalEnabled || !enabled) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, globalEnabled, enabled]);

  return {
    enabled: globalEnabled && enabled,
    shortcuts,
  };
};

/**
 * Hook for displaying keyboard shortcuts help
 */
export const useKeyboardShortcutsHelp = () => {
  const { keyboardShortcuts: enabled } = useSettingsStore();

  const formatShortcut = useCallback((shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];
    
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.metaKey) parts.push('Cmd');
    
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join(' + ');
  }, []);

  const getShortcutsByCategory = useCallback((shortcuts: KeyboardShortcut[]) => {
    // Group shortcuts by common prefixes or patterns
    const categories: Record<string, KeyboardShortcut[]> = {
      navigation: [],
      editing: [],
      general: [],
    };

    shortcuts.forEach(shortcut => {
      if (shortcut.description.toLowerCase().includes('go to') || 
          shortcut.description.toLowerCase().includes('navigate')) {
        categories.navigation.push(shortcut);
      } else if (shortcut.description.toLowerCase().includes('edit') ||
                 shortcut.description.toLowerCase().includes('save') ||
                 shortcut.description.toLowerCase().includes('new')) {
        categories.editing.push(shortcut);
      } else {
        categories.general.push(shortcut);
      }
    });

    return categories;
  }, []);

  return {
    enabled,
    formatShortcut,
    getShortcutsByCategory,
  };
};

/**
 * Default application keyboard shortcuts
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'n',
    ctrlKey: true,
    action: () => console.log('New chat'),
    description: 'Create new chat session',
  },
  {
    key: 's',
    ctrlKey: true,
    action: () => console.log('Save'),
    description: 'Save current session',
  },
  {
    key: 'e',
    ctrlKey: true,
    action: () => console.log('Export'),
    description: 'Export data',
  },
  {
    key: 'k',
    ctrlKey: true,
    action: () => console.log('Toggle shortcuts'),
    description: 'Toggle keyboard shortcuts',
  },
  {
    key: '/',
    ctrlKey: true,
    action: () => console.log('Search'),
    description: 'Search messages',
  },
  {
    key: 'Enter',
    ctrlKey: true,
    action: () => console.log('Send message'),
    description: 'Send message',
  },
  {
    key: 'b',
    ctrlKey: true,
    action: () => console.log('Toggle sidebar'),
    description: 'Toggle sidebar',
  },
  {
    key: 't',
    ctrlKey: true,
    action: () => console.log('Toggle theme'),
    description: 'Toggle theme',
  },
  {
    key: '1',
    altKey: true,
    action: () => console.log('Go to Chat'),
    description: 'Go to Chat',
  },
  {
    key: '2',
    altKey: true,
    action: () => console.log('Go to Configuration'),
    description: 'Go to Configuration',
  },
  {
    key: '3',
    altKey: true,
    action: () => console.log('Go to Testing'),
    description: 'Go to Testing',
  },
  {
    key: '4',
    altKey: true,
    action: () => console.log('Go to Statistics'),
    description: 'Go to Statistics',
  },
];

export default useKeyboardShortcuts;