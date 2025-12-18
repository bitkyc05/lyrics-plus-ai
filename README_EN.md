<div align="center">

# 🎵 Lyrics Plus

**AI-Powered Lyrics Extension for Spicetify**

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/ivLis-Studio/lyrics-plus/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Spicetify](https://img.shields.io/badge/spicetify-compatible-1DB954.svg)](https://spicetify.app)
[![Discord](https://img.shields.io/badge/discord-join-5865F2.svg)](https://discord.gg/2fu36fUzdE)

[한국어](README.md) | [English](#)

<img width="80%" alt="preview" src="https://github.com/user-attachments/assets/f42d4732-4960-4f2b-99e6-a68973b00f7d" />

</div>

---

## ✨ What's New in v1.1.0

### 🆕 Contextual Annotations

Smart annotations that explain cultural/linguistic context during Gemini translations.

```
Example: "flex on my ex" → "Show off to my ex" 
         💡 flex: Hip-hop slang meaning 'to show off'
```

| Setting | Behavior |
|---------|----------|
| `ON` (default) | Auto-annotates slang, cultural references, metaphors |
| `OFF` | Clean translation only |

> **Settings → Advanced → Enable Contextual Annotations (Gemini)**

---

## 🚀 Features

### Core
| Feature | Description |
|---------|-------------|
| **AI Translation** | Real-time lyrics translation via Google Gemini API |
| **Smart Romanization** | Japanese/Korean/Chinese → Romanized text |
| **Furigana Support** | Hiragana displayed above Japanese lyrics |
| **Contextual Annotations** | Automatic cultural context notes (NEW) |

### UI/UX
| Feature | Description |
|---------|-------------|
| **Karaoke Mode** | Real-time word-by-word highlighting |
| **Fullscreen Mode** | Immersive fullscreen lyrics view |
| **YouTube Background** | Music video background playback |
| **Community Sync** | Community-based sync offset sharing |

### Supported Languages
```
ko | en | ja | zh-CN | zh-TW | es | fr | de | it | pt | ru | ar | fa | hi | bn | th | vi | id
```

---

## 📦 Installation

### Prerequisites

> ⚠️ The latest official Spotify version may not be compatible with Spicetify.

<details>
<summary><b>1. Install Compatible Spotify Version</b></summary>

#### Windows (PowerShell)
```powershell
iex "& { $(iwr -useb 'https://amd64fox.github.io/Rollback-Spotify/run.ps1') } -version 1.2.76.298-x64"
```

#### macOS (Terminal)
```bash
bash <(curl -sSL https://raw.githubusercontent.com/jetfir3/TBZify/main/tbzify.sh) -v 1.2.76.298
```

</details>

<details>
<summary><b>2. Install Spicetify</b></summary>

#### Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex
```

#### macOS / Linux (Terminal)
```bash
curl -fsSL https://raw.githubusercontent.com/spicetify/cli/main/install.sh | sh
```

</details>

### Quick Install

```bash
# Windows (PowerShell)
iwr -useb https://ivlis.kr/lyrics-plus/install.ps1 | iex

# macOS / Linux (Terminal)
curl -fsSL https://ivlis.kr/lyrics-plus/install.sh | sh
```

<details>
<summary><b>Manual Installation</b></summary>

```bash
# 1. Download from releases
# 2. Extract to CustomApps directory
#    - Windows: %LocalAppData%\spicetify\CustomApps\lyrics-plus
#    - macOS/Linux: ~/.config/spicetify/CustomApps/lyrics-plus

# 3. Apply
spicetify config custom_apps lyrics-plus
spicetify apply
```

</details>

---

## ⚙️ Configuration

### Gemini API Setup

1. Get API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Enter in **Settings → Advanced → Gemini API Key**
3. (Optional) Change model: `gemini-3-flash-preview` (default)

### Feature Toggles

| Setting | Key | Default |
|---------|-----|---------|
| Contextual Annotations | `gemini-annotations` | `true` |
| Karaoke Mode | `karaoke-mode-enabled` | `true` |
| Community Sync | `community-sync-enabled` | `true` |
| Video Background | `video-background` | `false` |

---

## 🔧 Troubleshooting

```bash
# Reset settings
spicetify enable-devtools
# Spotify → Right-click → Developer Tools → Application → Clear site data
# Ctrl+Shift+R (refresh)

# Spotify won't launch
spicetify restore && spicetify apply
```

| Issue | Solution |
|-------|----------|
| Lyrics not showing | Check lyrics providers in Settings |
| Translation fails | Verify Gemini API key |
| App crashes | `spicetify restore && spicetify apply` |

---

## 🏗️ Architecture

```
lyrics-plus/
├── index.js              # Main entry point
├── Translator.js         # Gemini API integration & prompt engineering
├── Settings.js           # Configuration UI components
├── Providers.js          # Lyrics data providers
├── I18n.js              # Internationalization
└── FullscreenOverlay.js  # Fullscreen mode UI
```

---

## 📝 License

MIT © [ivLis Studio](https://github.com/ivLis-Studio)

---

<div align="center">

**[Issues](https://github.com/ivLis-Studio/lyrics-plus/issues)** · **[Discord](https://discord.gg/2fu36fUzdE)** · **[Releases](https://github.com/ivLis-Studio/lyrics-plus/releases)**

</div>
