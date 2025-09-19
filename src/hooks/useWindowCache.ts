import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface WindowSize {
  width: number;
  height: number;
}

export const useWindowCache = () => {
  const [mainWindowSize, setMainWindowSize] = useState<WindowSize | null>(null);

  // 缓存管理函数
  const saveMainWindowSize = useCallback((size: WindowSize) => {
    setMainWindowSize(size);
    localStorage.setItem('pixels_main_window_size', JSON.stringify(size));
  }, []);

  const loadMainWindowSize = useCallback(() => {
    const cached = localStorage.getItem('pixels_main_window_size');
    if (cached) {
      try {
        const size = JSON.parse(cached);
        setMainWindowSize(size);
        return size;
      } catch (error) {
        console.error('解析主窗口尺寸缓存失败:', error);
      }
    }
    return null;
  }, []);

  const saveCompareWindowSize = useCallback((size: WindowSize) => {
    localStorage.setItem('pixels_compare_window_size', JSON.stringify(size));
  }, []);

  const loadCompareWindowSize = useCallback(() => {
    const cached = localStorage.getItem('pixels_compare_window_size');
    if (cached) {
      try {
        const size = JSON.parse(cached);
        return size;
      } catch (error) {
        console.error('解析对比窗口尺寸缓存失败:', error);
      }
    }
    return null;
  }, []);

  // 进入对比模式
  const enterCompareMode = useCallback(async () => {
    try {
      // 保存当前主窗口尺寸
      const [currentWidth, currentHeight] = await invoke('get_window_size') as [number, number];
      saveMainWindowSize({ width: currentWidth, height: currentHeight });

      // 获取对比窗口缓存尺寸
      const cachedCompareSize = loadCompareWindowSize();
      
      if (cachedCompareSize) {
        // 使用缓存的对比窗口尺寸
        await invoke('set_window_size', {
          width: cachedCompareSize.width,
          height: cachedCompareSize.height
        });
      } else {
        // 首次使用，设置默认宽度750px
        await invoke('set_window_size', {
          width: 750,
          height: currentHeight
        });
      }
      
      return true;
    } catch (error) {
      console.error('进入对比模式失败:', error);
      return false;
    }
  }, [saveMainWindowSize, loadCompareWindowSize]);

  // 退出对比模式
  const exitCompareMode = useCallback(async () => {
    try {
      // 保存当前对比窗口尺寸
      const [currentWidth, currentHeight] = await invoke('get_window_size') as [number, number];
      saveCompareWindowSize({ width: currentWidth, height: currentHeight });

      // 恢复主窗口尺寸
      if (mainWindowSize) {
        await invoke('set_window_size', {
          width: mainWindowSize.width,
          height: mainWindowSize.height
        });
      }
      
      return true;
    } catch (error) {
      console.error('退出对比模式失败:', error);
      return false;
    }
  }, [mainWindowSize, saveCompareWindowSize]);

  // 应用启动时加载缓存
  useEffect(() => {
    loadMainWindowSize();
    loadCompareWindowSize();
  }, [loadMainWindowSize, loadCompareWindowSize]);

  return {
    mainWindowSize,
    enterCompareMode,
    exitCompareMode
  };
};