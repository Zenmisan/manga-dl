use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

pub struct BackendProcess(pub Mutex<Option<Child>>);
pub struct DiscordRpc(pub Mutex<Option<DiscordIpcClient>>);

// Discord application ID for manga-dl (replace with your own from discord.com/developers)
const DISCORD_APP_ID: &str = "1515346416430485785";

// ── Backend discovery ─────────────────────────────────────────────────────────

fn find_backend_dir() -> Option<PathBuf> {
    let candidates = [
        // Dev mode: CARGO_MANIFEST_DIR is src-tauri/, backend is two levels up
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../backend"),
        // Packaged: backend next to / near the executable
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("backend")))
            .unwrap_or_default(),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().and_then(|d| d.parent()).map(|d| d.join("backend")))
            .unwrap_or_default(),
    ];
    candidates.into_iter().find(|p| p.join("app/main.py").exists())
}

fn is_backend_running() -> bool {
    std::net::TcpStream::connect("127.0.0.1:8000").is_ok()
}

fn start_backend() -> Option<Child> {
    if is_backend_running() {
        eprintln!("[manga-dl] Backend already running on :8000, skipping auto-start");
        return None;
    }

    let backend_dir = match find_backend_dir() {
        Some(d) => d,
        None => {
            eprintln!("[manga-dl] Backend directory not found — start it manually");
            return None;
        }
    };

    // Try python then python3
    for python in &["python", "python3"] {
        match Command::new(python)
            .args([
                "-m", "uvicorn",
                "app.main:app",
                "--host", "127.0.0.1",
                "--port", "8000",
                "--no-access-log",
            ])
            .current_dir(&backend_dir)
            .spawn()
        {
            Ok(child) => {
                eprintln!("[manga-dl] Backend started via {} (pid {})", python, child.id());
                return Some(child);
            }
            Err(e) => eprintln!("[manga-dl] {} failed: {}", python, e),
        }
    }

    eprintln!("[manga-dl] Could not start backend — Python not in PATH");
    None
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
fn get_backend_url() -> &'static str {
    "http://127.0.0.1:8000"
}

#[tauri::command]
fn discord_update_presence(
    state: tauri::State<DiscordRpc>,
    details: String,
    state_text: String,
) {
    if let Ok(mut guard) = state.0.lock() {
        let client = guard.get_or_insert_with(|| {
            let mut c = DiscordIpcClient::new(DISCORD_APP_ID);
            let _ = c.connect();
            c
        });
        let payload = activity::Activity::new()
            .details(&details)
            .state(&state_text)
            .assets(
                activity::Assets::new()
                    .large_image("manga_logo")
                    .large_text("manga-dl"),
            );
        let _ = client.set_activity(payload);
    }
}

#[tauri::command]
fn discord_clear_presence(state: tauri::State<DiscordRpc>) {
    if let Ok(mut guard) = state.0.lock() {
        if let Some(client) = guard.as_mut() {
            let _ = client.clear_activity();
        }
    }
}

#[tauri::command]
fn get_downloads_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn reveal_in_file_manager(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    Command::new("open")
        .args(["-R", &path])
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    {
        let launched = ["nautilus", "dolphin", "thunar", "nemo"]
            .iter()
            .any(|mgr| Command::new(mgr).arg(&path).spawn().is_ok());
        if !launched {
            let parent = std::path::Path::new(&path)
                .parent()
                .unwrap_or(std::path::Path::new(&path));
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

// ── System tray ───────────────────────────────────────────────────────────────

fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "Show manga-dl", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &sep, &quit_i])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("manga-dl")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                kill_backend(app);
                app.exit(0);
            }
            "show" => show_main_window(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { .. } = event {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    if w.is_visible().unwrap_or(false) {
                        let _ = w.hide();
                    } else {
                        show_main_window(app);
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn kill_backend(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<BackendProcess>() {
        if let Ok(mut guard) = state.0.lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
                eprintln!("[manga-dl] Backend process killed");
            }
        }
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let backend_child = start_backend();

    tauri::Builder::default()
        .manage(BackendProcess(Mutex::new(backend_child)))
        .manage(DiscordRpc(Mutex::new(None)))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_backend_url,
            get_downloads_path,
            reveal_in_file_manager,
            discord_update_presence,
            discord_clear_presence,
        ])
        .setup(|app| {
            setup_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide to tray instead of closing, so backend keeps running
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap_or(());
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
