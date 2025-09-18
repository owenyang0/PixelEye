use tauri::Window;

// 设置窗口置顶
#[tauri::command]
async fn set_always_on_top(window: Window, always_on_top: bool) -> Result<(), String> {
    window.set_always_on_top(always_on_top).map_err(|e| e.to_string())
}

// 设置窗口透明
#[tauri::command]
async fn set_window_transparent(_window: Window, _transparent: bool) -> Result<(), String> {
    // 透明度已在窗口配置中设置，这里只是为了API兼容性
    Ok(())
}

// 获取窗口透明度状态
#[tauri::command]
async fn get_window_opacity() -> Result<f64, String> {
    // 返回默认透明度值，实际透明度通过CSS控制
    Ok(1.0)
}

// 获取窗口大小
#[tauri::command]
async fn get_window_size(window: Window) -> Result<(u32, u32), String> {
    let size = window.outer_size().map_err(|e| e.to_string())?;
    Ok((size.width, size.height))
}

// 设置窗口大小
#[tauri::command]
async fn set_window_size(window: Window, width: u32, height: u32) -> Result<(), String> {
    let size = tauri::Size::Physical(tauri::PhysicalSize { width, height });
    window.set_size(size).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            set_always_on_top,
            set_window_transparent,
            get_window_opacity,
            get_window_size,
            set_window_size
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
