<div align="center">

# 🎵 Lyrics Plus

**AI-Powered Lyrics Extension for Spicetify**

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/ivLis-Studio/lyrics-plus/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Spicetify](https://img.shields.io/badge/spicetify-compatible-1DB954.svg)](https://spicetify.app)
[![Discord](https://img.shields.io/badge/discord-join-5865F2.svg)](https://discord.gg/2fu36fUzdE)

[한국어](#) | [English](README_EN.md)

<img width="80%" alt="preview" src="https://github.com/user-attachments/assets/679830cb-2bad-485f-9b22-9fed6f2e1773" />

</div>

---

## ✨ What's New in v1.1.0

### 🆕 Contextual Annotations (맥락 기반 주석)

Gemini 번역 시 문화적/언어적 맥락을 설명하는 **스마트 주석** 기능이 추가되었습니다.

```
예시: "flex on my ex" → "전 애인한테 자랑해" 
      💡 flex: 힙합 슬랭으로 '과시하다'의 의미
```

| 설정 | 동작 |
|------|------|
| `ON` (기본값) | 슬랭, 문화적 레퍼런스, 은유 등에 자동 주석 |
| `OFF` | 깔끔한 번역만 표시 |

> **Settings → Advanced → Enable Contextual Annotations (Gemini)**

---

## 🚀 Features

### Core
| Feature | Description |
|---------|-------------|
| **AI Translation** | Google Gemini API 기반 실시간 가사 번역 |
| **Smart Romanization** | 일본어/한국어/중국어 → 로마자 변환 |
| **Furigana Support** | 일본어 가사 위에 히라가나 표시 |
| **Contextual Annotations** | 문화적 맥락 자동 주석 (NEW) |

### UI/UX
| Feature | Description |
|---------|-------------|
| **Karaoke Mode** | 단어별 실시간 하이라이트 |
| **Fullscreen Mode** | 몰입형 전체화면 가사 뷰 |
| **YouTube Background** | 뮤직비디오 배경 재생 |
| **Community Sync** | 커뮤니티 기반 싱크 오프셋 공유 |

### Supported Languages
```
ko | en | ja | zh-CN | zh-TW | es | fr | de | it | pt | ru | ar | fa | hi | bn | th | vi | id
```

---

## 📦 Installation

### Prerequisites

> ⚠️ 공식 Spotify 최신 버전은 Spicetify와 호환되지 않을 수 있습니다.

<details>
<summary><b>1. Spotify 호환 버전 설치</b></summary>

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
<summary><b>2. Spicetify 설치</b></summary>

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

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 API 키 발급
2. **Settings → Advanced → Gemini API Key** 입력
3. (선택) 모델 변경: `gemini-3-flash-preview` (기본값)

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
# 설정 초기화
spicetify enable-devtools
# Spotify → 우클릭 → 개발자 도구 → Application → Clear site data
# Ctrl+Shift+R (새로고침)

# Spotify 실행 안됨
spicetify restore && spicetify apply
```

| Issue | Solution |
|-------|----------|
| 가사 미표시 | Settings에서 가사 제공자 활성화 확인 |
| 번역 실패 | Gemini API 키 유효성 확인 |
| 앱 크래시 | `spicetify restore && spicetify apply` |

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
