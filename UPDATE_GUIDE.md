# DataKingz Illuvium Guide - Update Guide

## 🚀 **Automatic Updates (Recommended)**

Your app is configured with **automatic updates**! Users will receive update notifications and can install them with one click.

### **How It Works:**
1. **Built-in Auto-Updater** - Tauri automatically checks for updates
2. **Update Notifications** - Users see a dialog when updates are available
3. **One-Click Installation** - Updates install automatically
4. **Seamless Experience** - No manual intervention required

### **Current Configuration:**
- **Update Endpoint**: `https://github.com/DickKingz/Overlay/releases/latest/download/update.json`
- **Update Dialog**: Enabled (users see update notifications)
- **Public Key**: Configured for security verification

---

## 📦 **Manual Update Distribution**

If you prefer manual distribution, here are your options:

### **Option 1: GitHub Releases (Recommended)**
1. **Create a new release** on GitHub
2. **Upload the new installer**:
   - `DataKingz Illuvium Meta Guide_0.3.1_x64-setup.exe` (Windows)
   - `DataKingz Illuvium Meta Guide_0.3.1_x64_en-US.msi` (Windows MSI)
3. **Users download and install** the new version

### **Option 2: Direct File Sharing**
- **Share the installer** directly with users
- **Location**: `src-tauri/target/release/bundle/`
- **Files**:
  - `nsis/DataKingz Illuvium Meta Guide_0.3.1_x64-setup.exe`
  - `msi/DataKingz Illuvium Meta Guide_0.3.1_x64_en-US.msi`

---

## 🔄 **Update Process**

### **For You (Developer):**
1. **Make changes** to the code
2. **Increment version** in `src-tauri/tauri.conf.json`
3. **Build the app**: `npm run tauri build`
4. **Upload to GitHub** or distribute manually

### **For Users:**
1. **Automatic**: App checks for updates and notifies users
2. **Manual**: Users download and install new version
3. **Data**: All user data and settings are preserved

---

## 📋 **What's New in v0.3.1**

### **UI Improvements:**
- ✅ **Larger viewing window** (600x800 pixels vs 400x600)
- ✅ **Beautiful modern scrollbars** with purple gradient theme
- ✅ **Better content spacing** and improved grid layouts
- ✅ **Enhanced visual design** with smooth animations

### **Functionality Changes:**
- ✅ **Removed manual refresh buttons** to prevent API abuse
- ✅ **Automatic daily updates** at 2:00 AM
- ✅ **Improved error messages** that inform about automatic updates
- ✅ **Better user experience** with cleaner interface

### **Technical Improvements:**
- ✅ **Cross-browser scrollbar support** (WebKit + Firefox)
- ✅ **Performance optimizations** with efficient CSS
- ✅ **Responsive design** maintained for all screen sizes
- ✅ **Accessibility improvements** with proper contrast ratios

---

## 🛠 **Troubleshooting Updates**

### **If Auto-Updates Don't Work:**
1. **Check internet connection**
2. **Verify GitHub repository access**
3. **Check Windows Firewall settings**
4. **Run as administrator** if needed

### **If Manual Installation Fails:**
1. **Close the app** completely
2. **Uninstall old version** (optional)
3. **Install new version** as administrator
4. **Restart the app**

### **Data Preservation:**
- ✅ **User settings** are preserved
- ✅ **API configurations** are maintained
- ✅ **Window positions** are saved
- ✅ **Transparency settings** are kept

---

## 📞 **Support**

If users have issues with updates:
1. **Check the logs** in the app settings
2. **Verify the GitHub release** is accessible
3. **Provide manual installer** as backup
4. **Guide users through** manual installation if needed

---

## 🎯 **Best Practices**

### **For Regular Updates:**
1. **Test thoroughly** before releasing
2. **Increment version numbers** properly
3. **Update release notes** with changes
4. **Monitor user feedback** after updates

### **For Major Updates:**
1. **Announce changes** to users
2. **Provide migration guides** if needed
3. **Test on different systems**
4. **Have rollback plan** ready

---

**The app now provides a much better user experience with automatic updates and a cleaner, more professional interface!** 🎉 