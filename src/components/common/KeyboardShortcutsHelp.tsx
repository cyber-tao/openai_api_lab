/**
 * Keyboard Shortcuts Help Component
 * Displays available keyboard shortcuts in a modal or popover
 */

import React from 'react';
import { Modal, Typography, Divider, Tag, Space } from 'antd';
import { Keyboard } from 'lucide-react';
import { useKeyboardShortcutsHelp } from '../../hooks/useKeyboardShortcuts';
import type { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';

const { Title, Text } = Typography;

interface KeyboardShortcutsHelpProps {
  visible: boolean;
  onClose: () => void;
  shortcuts?: KeyboardShortcut[];
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  visible,
  onClose,
  shortcuts = [],
}) => {
  const { enabled, formatShortcut, getShortcutsByCategory } = useKeyboardShortcutsHelp();

  if (!enabled) {
    return null;
  }

  const categories = getShortcutsByCategory(shortcuts);

  const renderShortcutGroup = (title: string, groupShortcuts: KeyboardShortcut[]) => {
    if (groupShortcuts.length === 0) return null;

    return (
      <div key={title} style={{ marginBottom: 24 }}>
        <Title level={5} style={{ marginBottom: 12 }}>
          {title}
        </Title>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {groupShortcuts.map((shortcut, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
              }}
            >
              <Text>{shortcut.description}</Text>
              <Tag
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '4px 8px',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                {formatShortcut(shortcut)}
              </Tag>
            </div>
          ))}
        </Space>
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <Keyboard size={20} />
          <span>Keyboard Shortcuts</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      styles={{
        body: {
          maxHeight: '60vh',
          overflowY: 'auto',
        },
      }}
    >
      {shortcuts.length === 0 ? (
        <Text type="secondary">No keyboard shortcuts available for this page.</Text>
      ) : (
        <>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Use these keyboard shortcuts to navigate and interact with the application more efficiently.
          </Text>
          
          {renderShortcutGroup('Navigation', categories.navigation)}
          {categories.navigation.length > 0 && <Divider />}
          
          {renderShortcutGroup('Editing', categories.editing)}
          {categories.editing.length > 0 && <Divider />}
          
          {renderShortcutGroup('General', categories.general)}
        </>
      )}
    </Modal>
  );
};

export default KeyboardShortcutsHelp;