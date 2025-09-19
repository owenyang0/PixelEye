import React, { useState, useCallback, useRef, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile, exists } from '@tauri-apps/plugin-fs';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import CompareWindow from './CompareWindow';
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

// 支持的图片格式
const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
const IMAGE_REGEX = /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i;

function App() {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [opacity, setOpacity] = useState(0.7);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 使用窗口缓存 Hook
  const { enterCompareMode, exitCompareMode } = useWindowCache();

  // 创建图片数据对象
  const createImageData = (name: string, fileData: Uint8Array, path?: string): ImageData => {
    const blob = new Blob([fileData]);
    const url = URL.createObjectURL(blob);

    return {
      name,
      url,
      file: fileData,
      path
    };
  };

  // 保存当前选择的图片（仅在 Tauri 中缓存路径）
  const saveSelectedImage = useCallback(async (image: ImageData | null) => {
    setSelectedImage(image);

    if (!isTauriEnvironment) return;

    if (image?.path) {
      await storageService.set(STORAGE_KEYS.LAST_IMAGE_PATH, image.path);
    } else {
      await storageService.remove(STORAGE_KEYS.LAST_IMAGE_PATH);
    }
  }, []);

  // 加载上次使用的图片（仅通过路径）
  const loadLastImage = useCallback(async () => {
    if (!isTauriEnvironment) return;

    try {
      const lastImagePath = await storageService.get<string>(STORAGE_KEYS.LAST_IMAGE_PATH);
      if (!lastImagePath) return;

      const fileExists = await exists(lastImagePath);
      if (!fileExists) return;

      const fileData = await readFile(lastImagePath);
      const fileName = lastImagePath.split('/').pop() || 'unknown';
      setSelectedImage(createImageData(fileName, fileData, lastImagePath));
    } catch (error) {
      console.error('加载上次使用的图片失败:', error);
    }
  }, []);

  // 应用启动时加载上次使用的图片
  useEffect(() => {
    loadLastImage();
  }, [loadLastImage]);

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
      
      await saveSelectedImage(createImageData(fileName, fileData, filePath));
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
          await saveSelectedImage(createImageData(fileName, fileData, file));
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
      }
    }
  }, [selectedImage, enterCompareMode]);

  // 退出对比模式
  const handleExitCompareMode = useCallback(async () => {
    await exitCompareMode();
    setIsCompareMode(false);
  }, [exitCompareMode]);

  // 渲染文件选择区域
  const renderFileSelector = () => (
    <div
      className={`relative rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 border-2 border-dashed ${
        isDragging
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
        <div className="flex items-center justify-center max-h-80">
          <img
            src={selectedImage!.url}
            alt={selectedImage!.name}
            style={{ opacity }}
            className="object-contain transition-opacity duration-300"
          />
        </div>

        {/* 透明度指示器 */}
        <div title="透明度" className="absolute top-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm font-medium">
          {Math.round(opacity * 100)}%
        </div>
        <button
          onClick={() => saveSelectedImage(null)}
          className="group-hover:opacity-100 opacity-0 duration-300 absolute top-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm font-medium hover:text-red-400 transition-all"
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
          <p className="text-xs text-gray-500 text-center">
            将以透明窗口覆盖进行像素级对比
          </p>
        </div>
      </div>
    </div>
  );

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
            <header className="mb-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
                <span className="text-2xl">🎯</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Pixels
              </h1>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">设计稿对比工具</h2>
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

            {renderInstructions()}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
