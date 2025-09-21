import React from 'react';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">PixelEye 设计之眼</h2>
                <p className="text-blue-100 text-sm">Version 0.1.1</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">关于应用</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              设计之眼，洞见开发！专业的像素级设计稿对比工具，支持透明覆盖、实时调节透明度、窗口置顶等功能，
              让设计还原更精确。
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-800 mb-2">技术特性</h3>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>• 支持多种图片格式 (PNG, JPG, GIF, WebP 等)</li>
              <li>• 实时透明度调节</li>
              <li>• 窗口置顶功能</li>
              <li>• 最近设计稿历史记录</li>
              <li>• 颜色反转</li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-800 mb-2">开发信息</h3>
            <div className="text-gray-600 text-sm space-y-1">
              <p><strong>开发者:</strong> yangsong13</p>
              {/* <p><strong>许可证:</strong> MIT License</p> */}
              {/* <p><strong>开源地址:</strong> 
                <a 
                  href="https://github.com/yangsong13/pixels" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-1"
                >
                  GitHub
                </a>
              </p> */}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-gray-500 text-xs text-center">
              Copyright © 2025 Song Yang. All rights reserved.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutDialog;