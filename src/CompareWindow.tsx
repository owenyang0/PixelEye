import React, { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 扩展 Window 接口以包含 Tauri 属性
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

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
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [isInvertMode, setIsInvertMode] = useState(false);

  // 检查 Tauri 环境
  const isTauri = typeof window !== 'undefined' && window.__TAURI__;

  // 窗口尺寸监听 - 使用Tauri API获取真实窗口尺寸
  useEffect(() => {
    const updateWindowSize = async () => {
      try {
        if (isTauri) {
          const result = await invoke('get_window_size') as [number, number];
          const [width, height] = result;
          setWindowSize({ width, height });
        } else {
          // 降级到浏览器API
          setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight
          });
        }
      } catch (error) {
        console.error('获取窗口尺寸失败:', error);
        // 降级到浏览器API
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    };

    // 初始化窗口尺寸
    updateWindowSize();

    // 监听窗口尺寸变化
    window.addEventListener('resize', updateWindowSize);


    return () => {
      window.removeEventListener('resize', updateWindowSize);
    };
  }, [isTauri]);

  useEffect(() => {
    // 如果没有图片URL，直接返回
    if (!imageUrl) {
      return;
    }

    const img = new Image();
    img.onload = async () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      setImageSize({
        width: naturalWidth,
        height: naturalHeight
      });

      setIsInitialized(true);
    };
    img.src = imageUrl;
  }, [imageUrl, isTauri]);

  // 设置窗口为置顶并确保透明
  useEffect(() => {

    // 添加透明模式CSS类
    document.documentElement.classList.add('compare-mode');
    document.body.classList.add('compare-mode');
    const root = document.getElementById('root');
    if (root) {
      root.classList.add('compare-mode');
    }


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

  // 窗口置顶切换
  const handleAlwaysOnTopToggle = useCallback(async () => {
    try {
      const newValue = !alwaysOnTop;
      if (isTauri) {
        await invoke('set_always_on_top', { alwaysOnTop: newValue });
      }
      setAlwaysOnTop(newValue);
    } catch (error) {
      console.error('设置窗口置顶失败:', error);
    }
  }, [alwaysOnTop, isTauri]);

  // 反色模式切换
  const handleInvertModeToggle = useCallback(() => {
    setIsInvertMode(!isInvertMode);
  }, [isInvertMode]);

  // 自动隐藏控制面板 - 5秒后自动隐藏
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsControlsVisible(false);
    }, 5000); // 5秒

    return () => {
      clearTimeout(timer);
    };
  }, []); // 只在组件挂载时执行一次

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
                  onClick={handleAlwaysOnTopToggle}
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
                  onClick={handleInvertModeToggle}
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
          className="fixed top-4 right-4 bg-black bg-opacity-20 text-white rounded-xl px-3 py-2 text-2xl leading-none font-medium hover:bg-opacity-90 z-50 transition-all"
          title="显示控制面板 (空格)"
        >
          ⚙
        </button>
      )}

      {/* 返回按钮 */}
      <button
        onClick={onClose}
        className="fixed top-4 left-4 bg-black bg-opacity-20 text-white rounded-xl px-3 py-2 text-2xl leading-none font-medium hover:bg-opacity-90 z-50 transition-all"
        title="返回主页面 (Esc)"
      >
        ←
      </button>
    </div>
  );
};

export default CompareWindow;