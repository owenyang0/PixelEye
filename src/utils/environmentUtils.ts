/**
 * 环境工具类 - 提供环境检测相关的工具函数
 */

/**
 * 检测当前是否在Tauri桌面应用环境中运行
 * @returns {boolean} 如果在Tauri环境中运行则返回true，否则返回false
 */
export const isTauriEnvironment = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
