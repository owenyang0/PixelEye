import { useState, useEffect } from 'react';

export const useImageLoader = (imageUrl: string) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageSize({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
      setIsInitialized(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  return {
    imageSize,
    isInitialized
  };
};