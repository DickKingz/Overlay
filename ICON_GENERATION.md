# DataKingz Logo Icon Generation

To properly set up the DataKingz branding for the Tauri application, you need to generate the required icon formats from the DataKingzLogo.png file.

## Required Icon Formats

The following icon files need to be generated from `public/DataKingzLogo.png`:

### PNG Icons (Square formats)
- `src-tauri/icons/32x32.png` - 32x32 pixels
- `src-tauri/icons/128x128.png` - 128x128 pixels  
- `src-tauri/icons/128x128@2x.png` - 256x256 pixels (retina)

### Windows Icons
- `src-tauri/icons/icon.ico` - Multi-resolution ICO file (16, 32, 48, 256px)

### macOS Icons  
- `src-tauri/icons/icon.icns` - Apple icon format

### Microsoft Store Icons (if publishing to MS Store)
- `src-tauri/icons/Square30x30Logo.png` - 30x30 pixels
- `src-tauri/icons/Square44x44Logo.png` - 44x44 pixels
- `src-tauri/icons/Square71x71Logo.png` - 71x71 pixels
- `src-tauri/icons/Square89x89Logo.png` - 89x89 pixels
- `src-tauri/icons/Square107x107Logo.png` - 107x107 pixels
- `src-tauri/icons/Square142x142Logo.png` - 142x142 pixels
- `src-tauri/icons/Square150x150Logo.png` - 150x150 pixels
- `src-tauri/icons/Square284x284Logo.png` - 284x284 pixels
- `src-tauri/icons/Square310x310Logo.png` - 310x310 pixels
- `src-tauri/icons/StoreLogo.png` - 50x50 pixels

## Manual Generation Steps

### Using Online Tools (Recommended)
1. Go to https://favicon.io/favicon-converter/
2. Upload `public/DataKingzLogo.png`
3. Download the generated ICO file and rename to `icon.ico`

### Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Windows: choco install imagemagick
# macOS: brew install imagemagick

# Generate PNG icons
magick public/DataKingzLogo.png -resize 32x32 src-tauri/icons/32x32.png
magick public/DataKingzLogo.png -resize 128x128 src-tauri/icons/128x128.png
magick public/DataKingzLogo.png -resize 256x256 src-tauri/icons/128x128@2x.png

# Generate ICO file
magick public/DataKingzLogo.png -resize 256x256 -define icon:auto-resize=256,128,64,48,32,16 src-tauri/icons/icon.ico

# Generate Microsoft Store icons
magick public/DataKingzLogo.png -resize 30x30 src-tauri/icons/Square30x30Logo.png
magick public/DataKingzLogo.png -resize 44x44 src-tauri/icons/Square44x44Logo.png
magick public/DataKingzLogo.png -resize 71x71 src-tauri/icons/Square71x71Logo.png
magick public/DataKingzLogo.png -resize 89x89 src-tauri/icons/Square89x89Logo.png
magick public/DataKingzLogo.png -resize 107x107 src-tauri/icons/Square107x107Logo.png
magick public/DataKingzLogo.png -resize 142x142 src-tauri/icons/Square142x142Logo.png
magick public/DataKingzLogo.png -resize 150x150 src-tauri/icons/Square150x150Logo.png
magick public/DataKingzLogo.png -resize 284x284 src-tauri/icons/Square284x284Logo.png
magick public/DataKingzLogo.png -resize 310x310 src-tauri/icons/Square310x310Logo.png
magick public/DataKingzLogo.png -resize 50x50 src-tauri/icons/StoreLogo.png
```

### Using GIMP/Photoshop
1. Open `public/DataKingzLogo.png` in your image editor
2. For each required size:
   - Resize the image to the target dimensions
   - Export as PNG with the exact filename
3. For the ICO file, use a plugin or online converter

## macOS ICNS Generation
For macOS icons, use the `iconutil` command:
```bash
# Create iconset directory
mkdir DataKingz.iconset

# Generate required sizes
sips -z 16 16 public/DataKingzLogo.png --out DataKingz.iconset/icon_16x16.png
sips -z 32 32 public/DataKingzLogo.png --out DataKingz.iconset/icon_16x16@2x.png
sips -z 32 32 public/DataKingzLogo.png --out DataKingz.iconset/icon_32x32.png
sips -z 64 64 public/DataKingzLogo.png --out DataKingz.iconset/icon_32x32@2x.png
sips -z 128 128 public/DataKingzLogo.png --out DataKingz.iconset/icon_128x128.png
sips -z 256 256 public/DataKingzLogo.png --out DataKingz.iconset/icon_128x128@2x.png
sips -z 256 256 public/DataKingzLogo.png --out DataKingz.iconset/icon_256x256.png
sips -z 512 512 public/DataKingzLogo.png --out DataKingz.iconset/icon_256x256@2x.png
sips -z 512 512 public/DataKingzLogo.png --out DataKingz.iconset/icon_512x512.png
sips -z 1024 1024 public/DataKingzLogo.png --out DataKingz.iconset/icon_512x512@2x.png

# Convert to ICNS
iconutil -c icns DataKingz.iconset -o src-tauri/icons/icon.icns
```

## After Generation
Once all icons are generated:
1. Run `npm run tauri:build` to build with new branding
2. The installer will now feature DataKingz branding and disclaimers
3. The desktop app will show the DataKingz logo in the taskbar and window 