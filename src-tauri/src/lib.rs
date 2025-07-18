use headless_chrome::{Browser, LaunchOptions};
use scraper::{Html, Selector};
use std::time::Duration;
use tauri::{Manager, Window};
use tauri_plugin_global_shortcut::ShortcutState;
use tauri_plugin_updater::UpdaterExt;
use reqwest::Client;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn test_tauri_connection() -> String {
    "Tauri backend is working!".to_string()
}

#[tauri::command]
fn toggle_overlay(window: Window) -> Result<(), String> {
    let is_visible = window.is_visible().map_err(|e| e.to_string())?;

    if is_visible {
        window.hide().map_err(|e| e.to_string())?;
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn show_overlay(window: Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn hide_overlay(window: Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<String, String> {
    match app.updater() {
        Ok(updater) => {
            match updater.check().await {
                Ok(update) => {
                    if let Some(update_info) = update {
                        let version = update_info.version;
                        Ok(format!("Update available: {}", version))
                    } else {
                        Ok("No update available".to_string())
                    }
                }
                Err(e) => Err(format!("Update check failed: {}", e))
            }
        }
        Err(e) => Err(format!("Updater not available: {}", e))
    }
}

#[tauri::command]
fn get_debug_log() -> Result<String, String> {
    use std::fs;
    match fs::read_to_string("guideoverlay_debug.log") {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read debug log: {}", e))
    }
}

#[tauri::command]
fn force_quit_app(app: tauri::AppHandle) -> Result<(), String> {
    // Clean up any background processes
    std::process::exit(0);
}

#[tauri::command]
async fn fetch_with_proxy(url: String) -> Result<String, String> {
    // Write to a log file for debugging
    use std::fs::OpenOptions;
    use std::io::Write;
    
    let log_message = format!("🔄 Rust proxy: Starting request to {}\n", url);
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("guideoverlay_debug.log") {
        let _ = file.write_all(log_message.as_bytes());
    }
    
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| {
            let error_msg = format!("Failed to create HTTP client: {}", e);
            if let Ok(mut file) = OpenOptions::new()
                .create(true)
                .append(true)
                .open("guideoverlay_debug.log") {
                let _ = file.write_all(format!("❌ Rust proxy: {}\n", error_msg).as_bytes());
            }
            error_msg
        })?;
    
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("guideoverlay_debug.log") {
        let _ = file.write_all("🔄 Rust proxy: Sending GET request...\n".as_bytes());
    }
    
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            let error_msg = format!("HTTP request failed: {}", e);
            if let Ok(mut file) = OpenOptions::new()
                .create(true)
                .append(true)
                .open("guideoverlay_debug.log") {
                let _ = file.write_all(format!("❌ Rust proxy: {}\n", error_msg).as_bytes());
            }
            error_msg
        })?;
    
    let status_msg = format!("🔄 Rust proxy: Response status: {}\n", response.status());
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("guideoverlay_debug.log") {
        let _ = file.write_all(status_msg.as_bytes());
    }
    
    if !response.status().is_success() {
        let error_msg = format!("HTTP {}: {}", response.status(), response.status().as_str());
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open("guideoverlay_debug.log") {
            let _ = file.write_all(format!("❌ Rust proxy: {}\n", error_msg).as_bytes());
        }
        return Err(error_msg);
    }
    
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("guideoverlay_debug.log") {
        let _ = file.write_all("🔄 Rust proxy: Reading response text...\n".as_bytes());
    }
    
    let text = response
        .text()
        .await
        .map_err(|e| {
            let error_msg = format!("Failed to read response text: {}", e);
            if let Ok(mut file) = OpenOptions::new()
                .create(true)
                .append(true)
                .open("guideoverlay_debug.log") {
                let _ = file.write_all(format!("❌ Rust proxy: {}\n", error_msg).as_bytes());
            }
            error_msg
        })?;
    
    let success_msg = format!("✅ Rust proxy: Successfully fetched {} characters\n", text.len());
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("guideoverlay_debug.log") {
        let _ = file.write_all(success_msg.as_bytes());
    }
    
    Ok(text)
}

#[tauri::command]
async fn fetch_tierlist_data() -> Result<String, String> {
    // First try to get data with browser automation (for SPA)
    match fetch_with_browser().await {
        Ok(data) => {
            if !data.is_empty() {
                return Ok(format!("JSON_DATA:{}", data));
            }
        }
        Err(e) => {
            eprintln!("Browser automation failed: {}", e);
        }
    }

    // Fallback to regular HTTP request
    fetch_with_http().await
}

async fn fetch_with_browser() -> Result<String, String> {
    // Launch headless browser
    let browser = Browser::new(LaunchOptions {
        headless: true,
        idle_browser_timeout: Duration::from_secs(30),
        ..Default::default()
    })
    .map_err(|e| format!("Failed to launch browser: {}", e))?;

    let tab = browser
        .new_tab()
        .map_err(|e| format!("Failed to create tab: {}", e))?;

    // Navigate to the tierlist page
    tab.navigate_to("https://illuvilytics.web.app/tierlist/comps")
        .map_err(|e| format!("Failed to navigate: {}", e))?;

    // Wait for the page to load and JavaScript to execute
    if let Err(_) = tab.wait_for_element_with_custom_timeout(
        "[data-testid='tierlist'], .tierlist, .comp-list, .build-list",
        Duration::from_secs(10),
    ) {
        // If no specific tierlist elements found, wait for any content to load
        std::thread::sleep(Duration::from_secs(3));
    }

    // Get the final rendered HTML
    let html = tab
        .get_content()
        .map_err(|e| format!("Failed to get content: {}", e))?;

    // Try to extract JSON data from the rendered page
    if let Some(json_data) = extract_json_from_html(&html) {
        return Ok(json_data);
    }

    // If no JSON found, try to parse the HTML structure
    let builds_data = parse_tierlist_html(&html)?;

    // Convert builds data to JSON
    serde_json::to_string(&builds_data).map_err(|e| format!("Failed to serialize builds: {}", e))
}

fn extract_json_from_html(html: &str) -> Option<String> {
    // Look for common patterns where SPAs store data
    let patterns = vec![
        r#"window\.__INITIAL_STATE__\s*=\s*({.*?});"#,
        r#"window\.__DATA__\s*=\s*({.*?});"#,
        r#"window\.__NEXT_DATA__\s*=\s*({.*?});"#,
        r#"window\.APP_STATE\s*=\s*({.*?});"#,
        r#"window\.INITIAL_DATA\s*=\s*({.*?});"#,
        r#"const\s+initialData\s*=\s*({.*?});"#,
    ];

    for pattern in patterns {
        if let Ok(regex) = regex::Regex::new(pattern) {
            if let Some(captures) = regex.captures(html) {
                if let Some(json_str) = captures.get(1) {
                    return Some(json_str.as_str().to_string());
                }
            }
        }
    }

    None
}

fn parse_tierlist_html(html: &str) -> Result<Vec<serde_json::Value>, String> {
    let document = Html::parse_document(html);
    let mut builds = Vec::new();

    // Try different selectors for build/comp elements
    let selectors = vec![
        ".build-card, .comp-card, .tierlist-item",
        "[data-testid='build'], [data-testid='comp']",
        ".build, .comp, .team-comp",
        ".card, .item",
    ];

    for selector_str in selectors {
        if let Ok(selector) = Selector::parse(selector_str) {
            for element in document.select(&selector) {
                let mut build = serde_json::Map::new();

                // Extract build name/title
                if let Some(title_elem) = element
                    .select(&Selector::parse(".title, .name, h3, h4, .build-name").unwrap())
                    .next()
                {
                    build.insert(
                        "name".to_string(),
                        serde_json::Value::String(
                            title_elem.text().collect::<String>().trim().to_string(),
                        ),
                    );
                }

                // Extract composition/illuvials
                let mut composition = Vec::new();
                if let Ok(comp_selector) =
                    Selector::parse(".illuvial, .champion, .unit, .comp-unit")
                {
                    for comp_elem in element.select(&comp_selector) {
                        let name = comp_elem.text().collect::<String>().trim().to_string();
                        if !name.is_empty() {
                            composition.push(serde_json::Value::String(name));
                        }
                    }
                }
                if !composition.is_empty() {
                    build.insert(
                        "composition".to_string(),
                        serde_json::Value::Array(composition),
                    );
                }

                // Extract win rate
                if let Some(wr_elem) = element
                    .select(&Selector::parse(".win-rate, .winrate, .rate").unwrap())
                    .next()
                {
                    let wr_text = wr_elem.text().collect::<String>();
                    if let Ok(wr) = wr_text.replace('%', "").parse::<f64>() {
                        build.insert(
                            "winRate".to_string(),
                            serde_json::Value::Number(
                                serde_json::Number::from_f64(wr / 100.0)
                                    .unwrap_or(serde_json::Number::from(0)),
                            ),
                        );
                    }
                }

                if !build.is_empty() {
                    builds.push(serde_json::Value::Object(build));
                }
            }

            if !builds.is_empty() {
                break; // Found data with this selector
            }
        }
    }

    Ok(builds)
}

async fn fetch_with_http() -> Result<String, String> {
    use tauri_plugin_http::reqwest;

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Try multiple possible API endpoints based on common patterns
    let possible_urls = vec![
        // Firebase/Firestore endpoints
        "https://illuvilytics.web.app/api/tierlist",
        "https://illuvilytics.web.app/api/comps",
        "https://illuvilytics.web.app/api/builds",
        "https://illuvilytics.web.app/api/v1/tierlist",
        "https://illuvilytics.web.app/api/v1/comps",
        
        // Firebase project endpoints (common pattern)
        "https://firestore.googleapis.com/v1/projects/illuvilytics/databases/(default)/documents/tierlist",
        "https://firestore.googleapis.com/v1/projects/illuvilytics/databases/(default)/documents/comps",
        
        // Static data files
        "https://illuvilytics.web.app/data/tierlist.json",
        "https://illuvilytics.web.app/data/comps.json",
        "https://illuvilytics.web.app/data/builds.json",
        "https://illuvilytics.web.app/assets/data/tierlist.json",
        "https://illuvilytics.web.app/assets/data/comps.json",
        
        // GraphQL endpoints
        "https://illuvilytics.web.app/graphql",
        
        // REST API endpoints
        "https://illuvilytics.web.app/rest/tierlist",
        "https://illuvilytics.web.app/rest/comps",
        
        // Backend server endpoints
        "https://api.illuvilytics.web.app/tierlist",
        "https://api.illuvilytics.web.app/comps",
        "https://backend.illuvilytics.web.app/tierlist",
        "https://server.illuvilytics.web.app/tierlist",
        
        // CDN endpoints
        "https://cdn.illuvilytics.web.app/data/tierlist.json",
        "https://storage.googleapis.com/illuvilytics.appspot.com/tierlist.json",
        
        // The original page (fallback)
        "https://illuvilytics.web.app/tierlist/comps"
    ];

    println!("Trying {} different API endpoints...", possible_urls.len());

    for (index, url) in possible_urls.iter().enumerate() {
        println!(
            "Testing endpoint {}/{}: {}",
            index + 1,
            possible_urls.len(),
            url
        );

        match client.get(*url).send().await {
            Ok(response) => {
                println!("Response from {}: Status {}", url, response.status());

                if response.status().is_success() {
                    let content_type = response
                        .headers()
                        .get("content-type")
                        .and_then(|ct| ct.to_str().ok())
                        .unwrap_or("")
                        .to_lowercase();

                    let content = response
                        .text()
                        .await
                        .map_err(|e| format!("Failed to read response: {}", e))?;

                    println!(
                        "Content type: {}, Content length: {}",
                        content_type,
                        content.len()
                    );

                    // Check if we found JSON data
                    if content_type.contains("application/json")
                        || content.trim().starts_with("{")
                        || content.trim().starts_with("[")
                    {
                        println!("Found JSON data at: {}", url);
                        return Ok(format!("JSON_DATA:{}", content));
                    }

                    // Check if it's a Firebase/Firestore response
                    if content.contains("documents") && content.contains("fields") {
                        println!("Found Firestore data at: {}", url);
                        return Ok(format!("FIRESTORE_DATA:{}", content));
                    }

                    // Check if it's rich HTML with embedded data
                    if content.len() > 5000 && content.contains("tierlist") {
                        println!("Found rich HTML with potential embedded data at: {}", url);
                        return Ok(format!("HTML_DATA:{}", content));
                    }

                    // Continue to next URL if this one doesn't look promising
                    println!("No useful data found at: {}", url);
                }
            }
            Err(e) => {
                println!("Error accessing {}: {}", url, e);
                continue;
            }
        }
    }

    // If no API endpoints worked, get the main page and try to extract data
    println!("No API endpoints found, falling back to main page...");
    let response = client
        .get("https://illuvilytics.web.app/tierlist/comps")
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("HTTP error: {}", status));
    }

    let content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    Ok(format!("HTML_SHELL:{}", content))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            test_tauri_connection,
            toggle_overlay,
            show_overlay,
            hide_overlay,
            fetch_tierlist_data,
            check_for_updates,
            fetch_with_proxy,
            get_debug_log,
            force_quit_app
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                let handle = app.handle().clone();

                // Initialize global shortcut plugin with handler (with error handling)
                if let Err(e) = app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcuts(["CmdOrCtrl+Shift+G"])?
                        .with_handler(move |_app, _shortcut, event| {
                            if event.state == ShortcutState::Pressed {
                                if let Some(window) = handle.get_webview_window("main") {
                                    let is_visible = window.is_visible().unwrap_or(false);
                                    if is_visible {
                                        let _ = window.hide();
                                    } else {
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                }
                            }
                        })
                        .build(),
                ) {
                    eprintln!("Warning: Could not register global shortcut: {}", e);
                    // Continue running even if shortcut registration fails
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
