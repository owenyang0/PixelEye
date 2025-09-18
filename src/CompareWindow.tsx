import React, { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface CompareWindowProps {
  imageUrl: string;
  imageName: string;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  onClose: () => void;
}

export const CompareWindow: React.FC<CompareWindowProps> = ({
  imageUrl,
  imageName,
  opacity,
  onOpacityChange,
  onClose
}) => {
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  // 设置窗口为置顶并确保透明
  useEffect(() => {
    const setupWindow = async () => {
      try {
        if (typeof window !== 'undefined' && window.__TAURI__) {
          await invoke('set_always_on_top', { alwaysOnTop: true });
        }
      } catch (error) {
        console.error('设置窗口失败:', error);
      }
    };
    
    // 添加透明模式CSS类
    document.documentElement.classList.add('compare-mode');
    document.body.classList.add('compare-mode');
    const root = document.getElementById('root');
    if (root) {
      root.classList.add('compare-mode');
    }
    
    setupWindow();
    
    // 清理函数
    return () => {
      document.documentElement.classList.remove('compare-mode');
      document.body.classList.remove('compare-mode');
      if (root) {
        root.classList.remove('compare-mode');
      }
    };
  }, []);

  // 切换控制面板显示
  const toggleControls = useCallback(() => {
    setIsControlsVisible(!isControlsVisible);
  }, [isControlsVisible]);

  // 透明度调节
  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    onOpacityChange(newOpacity);
  }, [onOpacityChange]);

  // 键盘快捷键
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

  return (
    <div className="w-full h-screen relative" style={{ background: 'transparent' }}>
      {/* 主图片显示区域 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={imageUrl}
          alt={imageName}
          style={{ 
            opacity,
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
          className="select-none pointer-events-none"
          draggable={false}
        />
      </div>

      {/* 浮动控制面板 */}
      {isControlsVisible && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-white rounded-lg p-4 backdrop-blur-sm z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">{imageName}</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-red-400 ml-3"
              title="关闭对比模式 (Esc)"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            {/* 透明度控制 */}
            <div className="flex items-center space-x-2">
              <span className="text-xs w-12">透明度</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={opacity}
                onChange={handleOpacityChange}
                className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs w-8">{Math.round(opacity * 100)}%</span>
            </div>

            {/* 快捷键提示 */}
            <div className="text-xs text-gray-300 border-t border-gray-600 pt-2">
              <div>空格: 隐藏/显示控制面板</div>
              <div>↑↓: 调整透明度</div>
              <div>Esc: 退出对比模式</div>
            </div>
          </div>
        </div>
      )}

      {/* 隐藏控制面板时的切换按钮 */}
      {!isControlsVisible && (
        <button
          onClick={toggleControls}
          className="absolute top-4 right-4 bg-black bg-opacity-60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-80 z-50"
          title="显示控制面板 (空格)"
        >
          ⚙
        </button>
      )}
    </div>
  );
};

export default CompareWindow;