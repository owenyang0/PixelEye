import { useState, useCallback } from 'react';

export const useControlPanel = () => {
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const [isInvertMode, setIsInvertMode] = useState(false);

  // 切换控制面板显示
  const toggleControls = useCallback(() => {
    setIsControlsVisible(!isControlsVisible);
  }, [isControlsVisible]);

  // 反色模式切换
  const toggleInvertMode = useCallback(() => {
    setIsInvertMode(!isInvertMode);
  }, [isInvertMode]);

  // // 自动隐藏控制面板 - 5秒后自动隐藏
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setIsControlsVisible(false);
  //   }, 5000);

  //   return () => {
  //     clearTimeout(timer);
  //   };
  // }, []);

  return {
    isControlsVisible,
    isInvertMode,
    toggleControls,
    toggleInvertMode
  };
};