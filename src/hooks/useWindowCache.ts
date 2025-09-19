import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LazyStore } from '@tauri-apps/plugin-store';

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

// 检测是否在Tauri环境中运行
const isTauriEnvironment = typeof window !== 'undefined' && window.__TAURI__ !== undefined;

// 创建存储服务类
class StorageService {
  private store: LazyStore | null = null;
  private initialized = false;

  constructor() {
    if (isTauriEnvironment) {
      this.initTauriStore();
    }
  }

  private async initTauriStore(): Promise<void> {
    try {
      this.store = new LazyStore('pixels-config.json');
      this.initialized = true;
    } catch (error) {
      console.error('初始化Tauri Store失败:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (isTauriEnvironment && !this.initialized) {
      await this.initTauriStore();
    }

    try {
      if (isTauriEnvironment && this.store) {
        // 使用Tauri Store
        const value = await this.store.get(key);
        return value as T || null;
      } else {
        // 使用localStorage
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      }
    } catch (error) {
      console.error(`获取${key}失败:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (isTauriEnvironment && !this.initialized) {
      await this.initTauriStore();
    }

    try {
      if (isTauriEnvironment && this.store) {
        // 使用Tauri Store
        await this.store.set(key, value);
        await this.store.save();
      } else {
        // 使用localStorage
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`保存${key}失败:`, error);
    }
  }
}

// 创建存储服务实例
const storageService = new StorageService();

// 窗口缓存Hook
export const useWindowCache = () => {
  const [mainWindowState, setMainWindowState] = useState<WindowState | null>(null);

  // 缓存管理函数
  const saveMainWindowState = useCallback(async (state: WindowState) => {
    setMainWindowState(state);
    await storageService.set('pixels_main_window_state', state);
  }, []);

  const loadMainWindowState = useCallback(async () => {
    try {
      const state = await storageService.get<WindowState>('pixels_main_window_state');
      if (state) {
        console.log('loadMainWindowState state', state);

        setMainWindowState(state);
        return state;
      }
    } catch (error) {
      console.error('加载主窗口状态失败:', error);
    }
    return null;
  }, []);

  const saveCompareWindowState = useCallback(async (state: WindowState) => {
    await storageService.set('pixels_compare_window_state', state);
  }, []);

  const loadCompareWindowState = useCallback(async () => {
    try {
      const state = await storageService.get<WindowState>('pixels_compare_window_state');
      return state || null;
    } catch (error) {
      console.error('加载对比窗口状态失败:', error);
    }
    return null;
  }, []);

  // 进入对比模式
  const enterCompareMode = useCallback(async () => {
    try {
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
      await loadCompareWindowState();


      initializeState();

    }
  }, [loadMainWindowState, loadCompareWindowState]);

  return {
    mainWindowState,
    enterCompareMode,
    exitCompareMode
  };
};