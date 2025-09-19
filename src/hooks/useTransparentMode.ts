import { useEffect } from 'react';

export const useTransparentMode = () => {
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
};