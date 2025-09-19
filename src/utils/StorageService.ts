import { LazyStore } from '@tauri-apps/plugin-store';
import { isTauriEnvironment } from './environmentUtils';

/**
 * 存储服务类 - 提供统一的存储接口，自动根据环境选择存储方式
 * 在Tauri环境中使用LazyStore，在浏览器环境中使用localStorage
 */
export class StorageService {
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

  /**
   * 获取存储的值
   * @param key 键名
   * @returns 存储的值，如果不存在则返回null
   */
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

  /**
   * 设置存储的值
   * @param key 键名
   * @param value 要存储的值
   */
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

  /**
   * 删除存储的值
   * @param key 键名
   */
  async remove(key: string): Promise<void> {
    if (isTauriEnvironment && !this.initialized) {
      await this.initTauriStore();
    }

    try {
      if (isTauriEnvironment && this.store) {
        // 使用Tauri Store
        await this.store.delete(key);
        await this.store.save();
      } else {
        // 使用localStorage
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`删除${key}失败:`, error);
    }
  }
}

// 创建并导出存储服务实例
export const storageService = new StorageService();

// 存储键名常量
export const STORAGE_KEYS = {
  MAIN_WINDOW_STATE: 'pixels_main_window_state',
  COMPARE_WINDOW_STATE: 'pixels_compare_window_state',
  LAST_IMAGE: 'pixels_last_image',
  LAST_IMAGE_PATH: 'pixels_last_image_path'
};
