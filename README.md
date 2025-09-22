# PixelEye - 设计之眼，洞见开发

> 专业的像素级设计稿对比工具，支持透明覆盖、颜色反转、实时调节，让设计还原更精确

## ✨ 主要功能

### 🎯 像素级精确对比
- **透明覆盖模式**：将设计稿以透明窗口形式覆盖在实际页面上
- **实时透明度调节**：支持 0-100% 透明度实时调节，精确对比细节
- **窗口状态记忆**：自动保存窗口大小和位置，提升使用体验

### 📁 智能文件管理
- **多格式支持**：支持 PNG、JPG、JPEG、GIF、BMP、WebP、SVG 等主流图片格式
- **拖拽上传**：支持直接拖拽图片文件到应用窗口
- **最近使用**：智能记录最近使用的图片，快速切换对比
- **文件缓存**：自动缓存图片数据，提升加载速度

### 🎨 优雅的用户体验
- **现代化界面**：采用渐变设计和毛玻璃效果
- **响应式布局**：适配不同屏幕尺寸
- **直观操作**：简洁明了的操作流程
- **状态反馈**：清晰的操作状态提示

## 🛠️ 技术栈

- **前端框架**：React 18 + TypeScript
- **桌面应用**：Tauri 2.0
- **样式方案**：Tailwind CSS
- **状态管理**：React Hooks
- **文件处理**：Tauri File System API
- **存储方案**：Tauri Store + LocalStorage

## 📦 安装与使用

### 环境要求
- Node.js 22+
- Rust 1.70+
- 支持的操作系统：Windows、macOS、Linux

### 开发环境
```bash
# 克隆项目
git clone git@github.com:owenyang0/PixelEye.git
cd PixelEye

# 安装依赖
pnpm install

# 启动开发服务器
pnpm tauri dev
```

### 生产构建
```bash
# 构建应用
pnpm tauri build:all
```

## 🎮 使用指南

### 1. 加载设计稿
- **方式一**：点击"选择文件"按钮选择图片
- **方式二**：直接拖拽图片文件到应用窗口
- **方式三**：从最近使用列表快速选择

### 2. 进入对比模式
- 点击"进入对比模式"按钮
- 应用窗口将变为透明覆盖模式
- 可以调节透明度进行精确对比

### 3. 调节透明度
- 使用滑块实时调节透明度（0-100%）
- 支持键盘快捷键快速调节
- 透明度变化实时生效

### 4. 退出对比模式
- 点击"退出对比模式"按钮
- 窗口恢复原始大小和位置
- 返回主界面继续操作


## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者们！

---

**PixelEye** - 让设计还原更精确，让开发更高效！ 🎨✨
