import React, { useState, useCallback, useRef, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import CompareWindow from './CompareWindow';
import AboutDialog from './components/AboutDialog';
import { useWindowCache } from './hooks/useWindowCache';
import { storageService, STORAGE_KEYS } from './utils/StorageService';
import { isTauriEnvironment } from './utils/environmentUtils';
import './App.css';

interface ImageData {
  name: string;
  url: string;
  file: Uint8Array;
  path?: string; // 可选的文件路径
}

interface RecentImage extends ImageData {
  id: string; // 唯一标识符
  lastUsed: number; // 最后使用时间戳
}

// 支持的图片格式
const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
const IMAGE_REGEX = /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i;

// Base64 转换辅助函数
const uint8ArrayToBase64 = async (uint8Array: Uint8Array): Promise<string> => {
  const blob = new Blob([uint8Array]);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:image/...;base64, 前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

function App() {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [opacity, setOpacity] = useState(0.7);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [recentImages, setRecentImages] = useState<RecentImage[]>([]);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdUrlsRef = useRef<Set<string>>(new Set()); // 跟踪创建的URL
  const isStoringRef = useRef(false); // 防止重复存储
  const isStoringRecentRef = useRef(false); // 防止重复存储最近图片
  const saveRecentTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 防抖定时器

  // 使用窗口缓存 Hook
  const { enterCompareMode, exitCompareMode } = useWindowCache();

  // 创建图片数据对象
  const createImageData = (name: string, fileData: Uint8Array): ImageData => {
    const blob = new Blob([fileData]);
    const url = URL.createObjectURL(blob);
    createdUrlsRef.current.add(url); // 跟踪URL

    return {
      name,
      url,
      file: fileData
    };
  };

  // 清理URL资源
  const cleanupUrls = useCallback(() => {
    createdUrlsRef.current.forEach(url => {
      URL.revokeObjectURL(url);
    });
    createdUrlsRef.current.clear();
  }, []);

  // 生成图片唯一ID（基于文件名和大小）
  const generateImageId = (name: string, fileData: Uint8Array): string => {
    const size = fileData.length;
    return `${name}_${size}`;
  };

  // 添加到最近使用列表
  const addToRecentImages = useCallback((image: ImageData) => {
    const imageId = generateImageId(image.name, image.file);
    const now = Date.now();

    setRecentImages(prev => {
      // 移除已存在的相同图片（如果存在）
      const filtered = prev.filter(img => img.id !== imageId);

      // 添加新图片到最前面
      const newRecent: RecentImage = {
        ...image,
        id: imageId,
        lastUsed: now
      };

      // 保持最多10个最近图片
      const updated = [newRecent, ...filtered].slice(0, 10);

      // 防抖保存到本地存储，避免频繁操作
      if (saveRecentTimeoutRef.current) {
        clearTimeout(saveRecentTimeoutRef.current);
      }
      saveRecentTimeoutRef.current = setTimeout(() => {
        saveRecentImagesToStorage(updated);
      }, 300); // 300ms 防抖

      return updated;
    });
  }, []);

  // 保存最近图片到本地存储
  const saveRecentImagesToStorage = useCallback(async (images: RecentImage[]) => {
    // 防止重复存储操作
    if (isStoringRecentRef.current) return;
    
    isStoringRecentRef.current = true;
    
    try {
      if (isTauriEnvironment) {
        // Tauri 环境：使用 storageService
        const imagesData = await Promise.all(
          images.map(async (img) => ({
            id: img.id,
            name: img.name,
            file: Array.from(img.file),
            path: img.path,
            lastUsed: img.lastUsed
          }))
        );
        await storageService.set('pixels_recent_images', imagesData);
      } else {
        // Web 环境：使用 localStorage
        const imagesData = await Promise.all(
          images.map(async (img) => ({
            id: img.id,
            name: img.name,
            data: await uint8ArrayToBase64(img.file),
            path: img.path,
            lastUsed: img.lastUsed
          }))
        );
        localStorage.setItem('pixels_recent_images', JSON.stringify(imagesData));
      }
    } catch (error) {
      console.error('保存最近图片失败:', error);
    } finally {
      isStoringRecentRef.current = false;
    }
  }, []);

  // 从本地存储加载最近图片
  const loadRecentImagesFromStorage = useCallback(async () => {
    try {
      if (isTauriEnvironment) {
        // Tauri 环境
        const imagesData = await storageService.get<any[]>('pixels_recent_images');
        if (!imagesData) return [];

        const images = imagesData.map((data) => {
          const fileData = new Uint8Array(data.file);
          const blob = new Blob([fileData]);
          const url = URL.createObjectURL(blob);
          createdUrlsRef.current.add(url); // 跟踪URL

          return {
            id: data.id,
            name: data.name,
            file: fileData,
            path: data.path,
            lastUsed: data.lastUsed,
            url
          };
        });
        return images;
      } else {
        // Web 环境
        const imagesDataStr = localStorage.getItem('pixels_recent_images');
        if (!imagesDataStr) return [];

        const imagesData = JSON.parse(imagesDataStr);
        const images = imagesData.map((data: any) => {
          const fileData = base64ToUint8Array(data.data);
          const blob = new Blob([fileData]);
          const url = URL.createObjectURL(blob);
          createdUrlsRef.current.add(url); // 跟踪URL

          return {
            id: data.id,
            name: data.name,
            file: fileData,
            path: data.path,
            lastUsed: data.lastUsed,
            url
          };
        });
        return images;
      }
    } catch (error) {
      console.error('加载最近图片失败:', error);
      return [];
    }
  }, []);

  // 保存当前选择的图片（支持 Tauri 和 Web 环境）
  const saveSelectedImage = useCallback(async (image: ImageData | null) => {
    // 立即更新UI状态
    setSelectedImage(image);

    if (image) {
      // 异步添加到最近使用列表，不阻塞UI
      setTimeout(() => {
        addToRecentImages(image);
      }, 0);

      // 防止重复存储操作
      if (!isStoringRef.current) {
        isStoringRef.current = true;

        // 异步保存到存储，不阻塞UI
        setTimeout(async () => {
          try {
            if (isTauriEnvironment) {
              // Tauri 环境：使用 storageService 缓存二进制数据
              await storageService.set(STORAGE_KEYS.LAST_IMAGE, {
                name: image.name,
                file: Array.from(image.file)
              });
            } else {
              // Web 环境：使用 localStorage 缓存 base64 数据
              const base64 = await uint8ArrayToBase64(image.file);
              localStorage.setItem('pixels_last_image', JSON.stringify({
                name: image.name,
                data: base64
              }));
            }
          } catch (error) {
            console.error('保存图片到存储失败:', error);
          } finally {
            isStoringRef.current = false;
          }
        }, 0);
      }
    } else {
      // 清除缓存
      setTimeout(async () => {
        try {
          if (isTauriEnvironment) {
            await storageService.remove(STORAGE_KEYS.LAST_IMAGE);
          } else {
            localStorage.removeItem('pixels_last_image');
          }
        } catch (error) {
          console.error('清除图片存储失败:', error);
        }
      }, 0);
    }
  }, [addToRecentImages]);

  // 加载上次使用的图片（支持 Tauri 和 Web 环境）
  const loadLastImage = useCallback(async () => {
    try {
      if (isTauriEnvironment) {
        // Tauri 环境：从 storageService 加载二进制数据
        const savedImage = await storageService.get<{ name: string, file: number[] }>(STORAGE_KEYS.LAST_IMAGE);
        if (!savedImage?.file) return;

        const fileData = new Uint8Array(savedImage.file);
        setSelectedImage(createImageData(savedImage.name, fileData));
      } else {
        // Web 环境：从 localStorage 加载 base64 数据
        const savedImageStr = localStorage.getItem('pixels_last_image');
        if (!savedImageStr) return;

        const savedImage = JSON.parse(savedImageStr);
        if (!savedImage?.data) return;

        const fileData = base64ToUint8Array(savedImage.data);
        setSelectedImage(createImageData(savedImage.name, fileData));
      }
    } catch (error) {
      console.error('加载上次使用的图片失败:', error);
    }
  }, []);

  // 应用启动时加载上次使用的图片和最近图片
  useEffect(() => {
    const loadData = async () => {
      await loadLastImage();
      const recent = await loadRecentImagesFromStorage();
      setRecentImages(recent);
    };
    loadData();
  }, [loadLastImage, loadRecentImagesFromStorage]);

  // 组件卸载时清理URL资源
  useEffect(() => {
    return () => {
      cleanupUrls();
    };
  }, [cleanupUrls]);

  // 监听 Tauri v2 文件拖拽事件
  useEffect(() => {
    if (isTauriEnvironment) {
      let unlisten: (() => void) | undefined;

      const setupDragDropListener = async () => {
        try {
          const webview = getCurrentWebview();

          // 监听拖拽事件
          unlisten = await webview.onDragDropEvent((event) => {
            const dragData = event.payload;

            switch (dragData.type) {
              case 'enter':
              case 'over':
                setIsDragging(true);
                break;

              case 'drop':
                setIsDragging(false);

                const paths = (dragData as any).paths;
                if (paths && paths.length > 0) {
                  const imageFile = paths.find((file: string) => IMAGE_REGEX.test(file));

                  if (imageFile) {
                    handleTauriFileDrop(imageFile);
                  }
                }
                break;

              case 'leave':
                setIsDragging(false);
                break;
            }
          });
        } catch (error) {
          console.error('设置 Tauri v2 拖拽事件监听器失败:', error);
        }
      };

      setupDragDropListener();

      return () => {
        unlisten?.();
      };
    }
  }, []);

  // 处理 Tauri 文件拖拽
  const handleTauriFileDrop = useCallback(async (filePath: string) => {
    try {
      const fileData = await readFile(filePath);
      const fileName = filePath.split('/').pop() || 'unknown';

      await saveSelectedImage(createImageData(fileName, fileData));
      setIsDragging(false);
    } catch (error) {
      console.error('处理 Tauri 文件拖拽失败:', error);
      setIsDragging(false);
    }
  }, [saveSelectedImage]);

  // 处理文件选择 - 使用HTML input作为备选方案
  const handleFileSelect = useCallback(async () => {
    try {
      // 尝试使用Tauri对话框
      if (isTauriEnvironment) {
        const file = await open({
          title: '选择设计稿图片',
          multiple: false,
          filters: [
            {
              name: 'Images',
              extensions: SUPPORTED_IMAGE_EXTENSIONS
            }
          ]
        });

        if (file) {
          const fileData = await readFile(file);
          const fileName = file.split('/').pop() || 'unknown';
          await saveSelectedImage(createImageData(fileName, fileData));
        }
      } else {
        // 备选方案：使用HTML文件输入
        fileInputRef.current?.click();
      }
    } catch (error) {
      console.error('文件选择错误:', error);
      // 回退到HTML文件输入
      fileInputRef.current?.click();
    }
  }, [saveSelectedImage]);

  // 处理HTML文件输入
  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    await saveSelectedImage(createImageData(file.name, uint8Array));
  }, [saveSelectedImage]);

  // 处理拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    try {
      const files = e.dataTransfer.files && e.dataTransfer.files.length > 0
        ? Array.from(e.dataTransfer.files)
        : e.dataTransfer.items && e.dataTransfer.items.length > 0
          ? Array.from(e.dataTransfer.items)
            .filter((item) => item.kind === 'file')
            .map((item) => item.getAsFile()!)
          : [];

      const imageFile = files.find((f): f is File => !!f && 'type' in f && f.type.startsWith('image/'));
      if (!imageFile) return;

      const buffer = await imageFile.arrayBuffer();
      await saveSelectedImage(createImageData(imageFile.name, new Uint8Array(buffer)));
    } catch (error) {
      console.error('拖拽文件处理失败:', error);
      alert('拖拽文件失败，请使用"选择文件"按钮');
    }
  }, [saveSelectedImage]);

  // 进入对比模式
  const handleEnterCompareMode = useCallback(async () => {
    if (selectedImage) {
      const success = await enterCompareMode();
      if (success) {
        setIsCompareMode(true);
        if (!success) {
          // 如果窗口操作失败，回退到主页面
          setIsCompareMode(false);
        }
      }
    }
  }, [selectedImage, enterCompareMode]);

  // 退出对比模式
  const handleExitCompareMode = useCallback(async () => {
    await exitCompareMode();
    setIsCompareMode(false);
  }, [exitCompareMode]);

  // 快速切换图片
  const handleQuickSwitch = useCallback(async (recentImage: RecentImage) => {
    // 直接设置图片，立即生效
    setSelectedImage(recentImage);

    // 只更新最近使用时间，不触发存储操作
    setRecentImages(prev => {
      const imageId = generateImageId(recentImage.name, recentImage.file);
      const now = Date.now();
      
      return prev.map(img => 
        img.id === imageId 
          ? { ...img, lastUsed: now }
          : img
      );
    });
  }, []);

  // 删除最近图片
  const handleRemoveRecentImage = useCallback((imageId: string) => {
    setRecentImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      saveRecentImagesToStorage(updated);
      return updated;
    });
  }, [saveRecentImagesToStorage]);

  // 渲染文件选择区域
  const renderFileSelector = () => (
    <div
      className={`relative rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 border-2 border-dashed ${isDragging
        ? 'border-blue-400 bg-blue-50 scale-105'
        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleFileSelect}
    >
      <div className="space-y-6">
        <div className="text-6xl">
          {isDragging ? '📥' : '🖼️'}
        </div>
        <div>
          <p className="text-xl font-medium text-gray-700 mb-2">
            {isDragging ? '放开以导入图片' : '点击选择或拖拽图片到此处'}
          </p>
          <p className="text-gray-500">
            支持 PNG, JPG, JPEG, GIF, BMP, WebP, SVG
          </p>
        </div>
      </div>
    </div>
  );

  // 渲染图片预览区域
  const renderImagePreview = () => (
    <div className="space-y-6">
      {/* 图片显示 */}
      <div className="group relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex items-center justify-center max-h-72">
          <img
            src={selectedImage!.url}
            alt={selectedImage!.name}
            style={{ opacity }}
            className="object-contain transition-opacity duration-300"
          />
        </div>

        {/* 透明度指示器 */}
        <div title="透明度" className="absolute top-4 left-4 bg-black/80 text-white px-3 py-1 rounded-full text-sm font-medium">
          {Math.round(opacity * 100)}%
        </div>
        <button
          onClick={() => saveSelectedImage(null)}
          className="group-hover:opacity-100 opacity-0 duration-300 absolute top-4 right-4 bg-black/80 text-white px-3 py-1 rounded-full text-sm font-medium hover:text-red-400 transition-all"
          title="重新选择图片"
        >
          ✗
        </button>
      </div>

      {/* 控制面板 */}
      <div className="flex justify-center p-6 bg-gray-50 rounded-xl">
        <div className="space-y-3 max-w-sm">
          <button
            onClick={handleEnterCompareMode}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <span className="flex items-center justify-center">
              <span className="text-xl mr-3">🎯</span>
              进入对比模式
            </span>
          </button>
          {/* <p className="text-xs text-gray-500 text-center">
            将以透明窗口覆盖进行像素级对比
          </p> */}
        </div>
      </div>
    </div>
  );

  // 渲染最近设计稿
  const renderRecentImages = () => {
    if (recentImages.length === 0) return null;

  return (
      <div className="mt-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">🕒</span>
            <h3 className="text-lg font-semibold text-gray-800">最近设计稿</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {recentImages.map((image, index) => (
              <div
                key={image.id}
                className="group relative bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 flex-shrink-0"
                style={{ width: '120px', height: '100px' }}
                onClick={() => handleQuickSwitch(image)}
              >
                {/* 背景图片 */}
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${image.url})`,
                    filter: 'brightness(0.9)'
                  }}
                />

                {/* 悬停遮罩层 */}
                <div className="absolute inset-0 bg-transparent group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-medium px-3 py-1 rounded-full shadow-lg">
                      选择
                    </button>
                  </div>
                </div>

                {/* 图片信息 - 固定在底部 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs text-white truncate font-medium" title={image.name}>
                    {image.name}
                  </p>
                  <p className="text-xs text-gray-200">
                    {index === 0 ? '刚刚使用' : `${Math.floor((Date.now() - image.lastUsed) / 60000)}分钟前`}
                  </p>
      </div>

                {/* 删除按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveRecentImage(image.id);
                  }}
                  className="absolute top-1 right-1 bg-black/80 text-white px-2 py-1 rounded-full text-xs font-medium hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 duration-300"
                  title="删除"
                >
                  ✗
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 渲染使用说明
  const renderInstructions = () => (
    <div className="mt-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">💡</span>
          <h3 className="text-lg font-semibold text-gray-800">快速上手</h3>
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            <span>拖拽图片到上方区域，或点击选择文件</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            <span>调整透明度和窗口置顶设置</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            <span>点击"进入对比模式"开始像素级对比</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            <span>对比模式中：<kbd className="bg-gray-100 px-1 py-0.5 rounded text-xs mx-1">空格</kbd> 切换面板，<kbd className="bg-gray-100 px-1 py-0.5 rounded text-xs mx-1">↑↓</kbd> 调透明度，<kbd className="bg-gray-100 px-1 py-0.5 rounded text-xs mx-1">Esc</kbd> 退出</span>
          </div>
          {isTauriEnvironment && (
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              <span>桌面版特性：上次使用的图片将自动保存并在下次启动时恢复</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 对比模式窗口 */}
      {isCompareMode && selectedImage && (
        <CompareWindow
          imageUrl={selectedImage.url}
          imageName={selectedImage.name}
          opacity={opacity}
          onOpacityChange={setOpacity}
          onClose={handleExitCompareMode}
        />
      )}

      {/* About 对话框 */}
      <AboutDialog
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* 主页面 */}
      {!isCompareMode && (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
          {/* 隐藏的文件输入 */}
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <div className="max-w-5xl mx-auto">
            <header className="mb-10 text-center relative">
              {/* About 按钮 */}
              <div className="absolute top-0 right-0">
                <button
                  onClick={() => setIsAboutOpen(true)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2"
                  title="关于应用"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>

              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
                <span className="text-2xl">🎯</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                PixelEye
              </h1>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">设计之眼，洞见开发</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                专业的像素级设计稿对比工具，支持透明覆盖、实时调节，让设计还原更精确
              </p>
            </header>

            {/* 主工作区 */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {/* 图片导入和预览区域 */}
                <div className="p-8">
                  <div className="flex items-center mb-6">
                    <span className="text-3xl mr-3">🎯</span>
                    <h2 className="text-2xl font-bold text-gray-800">设计稿对比</h2>
                  </div>

                  {!selectedImage ? renderFileSelector() : renderImagePreview()}
                </div>
              </div>
            </div>

            {renderRecentImages()}
            {renderInstructions()}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
