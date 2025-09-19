import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  onClose: () => void;
  toggleControls: () => void;
}

export const useKeyboardShortcuts = ({
  opacity,
  onOpacityChange,
  onClose,
  toggleControls
}: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          toggleControls();
          break;
        case 'ArrowUp':
          e.preventDefault();
          onOpacityChange(Math.min(1, opacity + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onOpacityChange(Math.max(0, opacity - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [opacity, onOpacityChange, onClose, toggleControls]);
};