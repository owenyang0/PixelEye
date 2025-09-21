import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { storageService, STORAGE_KEYS } from '../utils/StorageService';
import { isTauriEnvironment } from '../utils/environmentUtils';

interface WindowSize {
  width: number;
  height: number;
}

interface WindowPosition {
  x: number;
  y: number;
}

interface WindowState {
  size: WindowSize;
  position: WindowPosition;
}

// 窗口缓存Hook
export const useWindowCache = () => {
  const [mainWindowState, setMainWindowState] = useState<WindowState | null>(null);

  // 缓存管理函数
  const saveMainWindowState = useCallback(async (state: WindowState) => {
    setMainWindowState(state);
    await storageService.set(STORAGE_KEYS.MAIN_WINDOW_STATE, state);
  }, []);

  const loadMainWindowState = useCallback(async () => {
    try {
      const state = await storageService.get<WindowState>(STORAGE_KEYS.MAIN_WINDOW_STATE);
      if (state) {
        setMainWindowState(state);
        return state;
      }
    } catch (error) {
      console.error('加载主窗口状态失败:', error);
    }
    return null;
  }, []);

  const saveCompareWindowState = useCallback(async (state: WindowState) => {
    await storageService.set(STORAGE_KEYS.COMPARE_WINDOW_STATE, state);
  }, []);

  const loadCompareWindowState = useCallback(async () => {
    try {
      const state = await storageService.get<WindowState>(STORAGE_KEYS.COMPARE_WINDOW_STATE);
      return state || null;
    } catch (error) {
      console.error('加载对比窗口状态失败:', error);
    }
    return null;
  }, []);

  // 进入对比模式
  const enterCompareMode = useCallback(async () => {
    try {
      if (!isTauriEnvironment) return true;

      // 保存当前主窗口状态
      const [currentWidth, currentHeight] = await invoke('get_window_size') as [number, number];
      const [currentX, currentY] = await invoke('get_window_position') as [number, number];

      await saveMainWindowState({
        size: { width: currentWidth, height: currentHeight },
        position: { x: currentX, y: currentY }
      });

      // 获取对比窗口缓存状态
      const cachedCompareState = await loadCompareWindowState();

      if (cachedCompareState) {
        // 使用缓存的对比窗口状态
        await invoke('set_window_size', {
          width: cachedCompareState.size.width,
          height: cachedCompareState.size.height
        });

        await invoke('set_window_position', {
          x: cachedCompareState.position.x,
          y: cachedCompareState.position.y
        });
      } else {
        // 首次使用，设置默认宽度750px，位置保持不变
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
  }, [saveMainWindowState, loadCompareWindowState]);

  // 退出对比模式
  const exitCompareMode = useCallback(async () => {
    try {
      if (!isTauriEnvironment) return;

      // 保存当前对比窗口状态
      const [currentWidth, currentHeight] = await invoke('get_window_size') as [number, number];
      const [currentX, currentY] = await invoke('get_window_position') as [number, number];

      await saveCompareWindowState({
        size: { width: currentWidth, height: currentHeight },
        position: { x: currentX, y: currentY }
      });

      // 恢复主窗口状态
      if (mainWindowState) {
        await invoke('set_window_size', {
          width: mainWindowState.size.width,
          height: mainWindowState.size.height
        });

        await invoke('set_window_position', {
          x: mainWindowState.position.x,
          y: mainWindowState.position.y
        });
      }

      return true;
    } catch (error) {
      console.error('退出对比模式失败:', error);
      return false;
    }
  }, [mainWindowState, saveCompareWindowState]);

  // 应用启动时加载缓存
  useEffect(() => {
    const initializeState = async () => {
      await loadMainWindowState();
    };

    initializeState();
  }, [loadMainWindowState]);

  return {
    mainWindowState,
    enterCompareMode,
    exitCompareMode
  };
};