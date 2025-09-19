import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 扩展 Window 接口以包含 Tauri 属性
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

export const useWindowManager = () => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  // 检查 Tauri 环境
  const isTauri = typeof window !== 'undefined' && window.__TAURI__;

  // 窗口尺寸监听
  useEffect(() => {
    const updateWindowSize = async () => {
      try {
        if (isTauri) {
          const result = await invoke('get_window_size') as [number, number];
          const [width, height] = result;
          setWindowSize({ width, height });
        } else {
          setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight
          });
        }
      } catch (error) {
        console.error('获取窗口尺寸失败:', error);
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    };

    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);

    return () => {
      window.removeEventListener('resize', updateWindowSize);
    };
  }, [isTauri]);

  // 窗口置顶切换
  const toggleAlwaysOnTop = useCallback(async () => {
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

  return {
    windowSize,
    alwaysOnTop,
    toggleAlwaysOnTop,
    isTauri
  };
};