import React, { useCallback } from 'react';
import { useWindowManager } from './hooks/useWindowManager';
import { useImageLoader } from './hooks/useImageLoader';
import { useControlPanel } from './hooks/useControlPanel';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTransparentMode } from './hooks/useTransparentMode';

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
  // 使用自定义 Hooks
  const { windowSize, alwaysOnTop, toggleAlwaysOnTop } = useWindowManager();
  const { imageSize, isInitialized } = useImageLoader(imageUrl);
  const { isControlsVisible, isInvertMode, toggleControls, toggleInvertMode } = useControlPanel();
  
  // 设置透明模式和键盘快捷键
  useTransparentMode();
  useKeyboardShortcuts({ opacity, onOpacityChange, onClose, toggleControls });

  // 透明度调节
  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    onOpacityChange(newOpacity);
  }, [onOpacityChange]);

  return (
    <div className="w-full h-screen relative" style={{ background: 'transparent' }}>
      {/* 主图片显示区域 */}
      <div className="flex items-center justify-center">
        {!isInitialized ? (
          <div className="text-center text-white">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-lg font-medium">正在加载图片...</p>
            <p className="text-sm text-gray-300 mt-2">准备设置最佳窗口尺寸</p>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={imageName}
            style={{
              opacity,
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transition: 'opacity 0.3s ease',
              filter: isInvertMode ? 'invert(1)' : 'none'
            }}
            className="select-none pointer-events-none"
            draggable={false}
          />
        )}
      </div>

      {/* 浮动控制面板 */}
      {isControlsVisible && (
        <div className="fixed top-4 right-4 bg-black bg-opacity-90 text-white rounded-xl p-4 backdrop-blur-sm z-50 min-w-64">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium truncate">{imageName}</h3>
            <button
              onClick={toggleControls}
              className="text-white hover:text-red-400 ml-3 transition-colors"
              title="关闭对比模式 (Esc)"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* 透明度控制 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">透明度</span>
                <span className="text-sm font-bold">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={handleOpacityChange}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* 窗口置顶控制 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">窗口置顶</span>
                <button
                  onClick={toggleAlwaysOnTop}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${alwaysOnTop ? 'bg-blue-600' : 'bg-gray-500'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${alwaysOnTop ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-400">
                {alwaysOnTop ? '窗口始终保持在最前' : '窗口可以被其他窗口覆盖'}
              </p>
            </div>

            {/* 反色模式控制 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">反色模式</span>
                <button
                  onClick={toggleInvertMode}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isInvertMode ? 'bg-purple-600' : 'bg-gray-500'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isInvertMode ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-400">
                {isInvertMode ? '图片颜色已反转' : '正常显示图片颜色'}
              </p>
            </div>

            {/* 尺寸信息 */}
            {isInitialized && (
              <div className="text-xs text-gray-300 space-y-1 pt-2 border-t border-gray-600">
                <div className="flex items-center justify-between">
                  <span>原始尺寸</span>
                  <span>{imageSize.width} × {imageSize.height}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>窗口尺寸</span>
                  <span>{windowSize.width} × {windowSize.height}</span>
                </div>
              </div>
            )}

            {/* 快捷键提示 */}
            <div className="text-xs text-gray-300 space-y-1 pt-2 border-t border-gray-600">
              <div className="flex items-center justify-between">
                <span>空格</span>
                <span>切换面板</span>
              </div>
              <div className="flex items-center justify-between">
                <span>↑↓</span>
                <span>调透明度</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Esc</span>
                <span>退出对比</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 隐藏控制面板时的切换按钮 */}
      {!isControlsVisible && (
        <button
          onClick={toggleControls}
          className="fixed top-4 right-4 bg-black opacity-20 text-white rounded-xl px-3 py-2 text-2xl leading-none font-medium hover:opacity-90 z-50 transition-all"
          title="显示控制面板 (空格)"
        >
          ⚙
        </button>
      )}

      {/* 返回按钮 */}
      <button
        onClick={onClose}
        className="fixed top-4 left-4 bg-black opacity-20 text-white rounded-xl px-3 py-2 text-2xl leading-none font-medium hover:opacity-90 z-50 transition-all"
        title="返回主页面 (Esc)"
      >
        ←
      </button>
    </div>
  );
};

export default CompareWindow;