import React, { useState, useCallback, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import CompareWindow from './CompareWindow';
import './App.css';

interface ImageData {
  name: string;
  url: string;
  file: Uint8Array;
}

function App() {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [opacity, setOpacity] = useState(0.7);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1000, height: 700 });
  const [isDragging, setIsDragging] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择 - 使用HTML input作为备选方案
  const handleFileSelect = useCallback(async () => {
    try {
      // 尝试使用Tauri对话框
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const file = await open({
          title: '选择设计稿图片',
          multiple: false,
          filters: [
            {
              name: 'Images',
              extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']
            }
          ]
        });

        if (file) {
          const fileData = await readFile(file);
          const blob = new Blob([fileData]);
          const url = URL.createObjectURL(blob);
          
          setSelectedImage({
            name: file.split('/').pop() || 'unknown',
            url,
            file: fileData
          });
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
  }, []);

  // 处理HTML文件输入
  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const url = URL.createObjectURL(file);

      setSelectedImage({
        name: file.name,
        url,
        file: uint8Array
      });
    }
  }, []);

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

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => 
      file.type.startsWith('image/')
    );

    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = new Blob([uint8Array], { type: imageFile.type });
      const url = URL.createObjectURL(blob);

      setSelectedImage({
        name: imageFile.name,
        url,
        file: uint8Array
      });
    }
  }, []);

  // 透明度调节 (通过CSS控制)
  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    setOpacity(newOpacity);
    // 注意：在Tauri v2中，窗口透明度通过CSS控制而非API
  }, []);

  // 窗口置顶切换
  const handleAlwaysOnTopToggle = useCallback(async () => {
    try {
      const newValue = !alwaysOnTop;
      if (typeof window !== 'undefined' && window.__TAURI__) {
        await invoke('set_always_on_top', { alwaysOnTop: newValue });
      }
      setAlwaysOnTop(newValue);
    } catch (error) {
      console.error('设置窗口置顶失败:', error);
    }
  }, [alwaysOnTop]);

  // 窗口大小调节
  const handleSizeChange = useCallback(async (dimension: 'width' | 'height', value: number) => {
    const newSize = {
      ...windowSize,
      [dimension]: value
    };
    
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        await invoke('set_window_size', { 
          width: newSize.width, 
          height: newSize.height 
        });
      }
      setWindowSize(newSize);
    } catch (error) {
      console.error('设置窗口大小失败:', error);
    }
  }, [windowSize]);

  // 进入对比模式
  const enterCompareMode = useCallback(() => {
    if (selectedImage) {
      setIsCompareMode(true);
    }
  }, [selectedImage]);

  // 退出对比模式
  const exitCompareMode = useCallback(async () => {
    setIsCompareMode(false);
    // 取消窗口置顶
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        await invoke('set_always_on_top', { alwaysOnTop: false });
      }
      setAlwaysOnTop(false);
    } catch (error) {
      console.error('取消窗口置顶失败:', error);
    }
  }, []);

  // 如果在对比模式，显示对比窗口
  if (isCompareMode && selectedImage) {
    return (
      <CompareWindow
        imageUrl={selectedImage.url}
        imageName={selectedImage.name}
        opacity={opacity}
        onOpacityChange={setOpacity}
        onClose={exitCompareMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Pixels - 设计稿对比工具
          </h1>
          <p className="text-gray-600">
            导入设计稿，调整透明度和窗口大小，实现像素级对比
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 控制面板 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">图片导入</h2>
              
              {/* 文件选择区域 */}
              <div
                className={`drag-area rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragging ? 'dragover' : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleFileSelect}
              >
                <div className="space-y-4">
                  <div className="text-4xl">📁</div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      点击选择或拖拽图片到此处
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      支持 PNG, JPG, JPEG, GIF, BMP, WebP, SVG
                    </p>
                  </div>
                </div>
              </div>

              {selectedImage && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800">
                    ✅ 已选择: {selectedImage.name}
                  </p>
                </div>
              )}
            </div>

            {/* 透明度控制 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">透明度控制</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700 w-16">
                    透明度:
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={opacity}
                    onChange={handleOpacityChange}
                    className="flex-1 opacity-control"
                  />
                  <span className="text-sm font-medium text-gray-700 w-12">
                    {Math.round(opacity * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 窗口控制 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">窗口控制</h2>
              <div className="space-y-4">
                {/* 置顶控制 */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    窗口置顶
                  </label>
                  <button
                    onClick={handleAlwaysOnTopToggle}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      alwaysOnTop
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {alwaysOnTop ? '已启用' : '已禁用'}
                  </button>
                </div>

                {/* 窗口大小控制 */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700 w-12">
                      宽度:
                    </label>
                    <input
                      type="number"
                      min="400"
                      max="3000"
                      value={windowSize.width}
                      onChange={(e) => handleSizeChange('width', parseInt(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500">px</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700 w-12">
                      高度:
                    </label>
                    <input
                      type="number"
                      min="300"
                      max="2000"
                      value={windowSize.height}
                      onChange={(e) => handleSizeChange('height', parseInt(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500">px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 预览区域 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">预览区域</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg aspect-video flex items-center justify-center">
              {selectedImage ? (
                <div className="image-container w-full h-full relative">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.name}
                    style={{ opacity }}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🖼️</div>
                  <p>选择图片后将在此处预览</p>
                </div>
              )}
            </div>
            
            {selectedImage && (
              <div className="mt-4 space-y-3">
                <div className="text-sm text-gray-600">
                  <p>当前透明度: {Math.round(opacity * 100)}%</p>
                  <p>窗口大小: {windowSize.width} × {windowSize.height}</p>
                  <p>置顶状态: {alwaysOnTop ? '已启用' : '已禁用'}</p>
                </div>
                
                {/* 进入对比模式按钮 */}
                <button
                  onClick={enterCompareMode}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  🎯 进入对比模式
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">使用说明</h3>
          <ol className="text-blue-700 space-y-2 list-decimal list-inside">
            <li>点击或拖拽导入设计稿图片</li>
            <li>调整透明度滑块设置合适的透明度</li>
            <li>调整窗口大小以适配设计稿尺寸</li>
            <li>点击"进入对比模式"开始像素级对比</li>
            <li>在对比模式中，窗口将变为透明，设计稿覆盖在其他应用上</li>
            <li>使用快捷键：空格键切换控制面板，↑↓键调整透明度，Esc键退出</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;