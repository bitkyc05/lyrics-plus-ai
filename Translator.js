const kuroshiroPath =
  "https://cdn.jsdelivr.net/npm/kuroshiro@1.2.0/dist/kuroshiro.min.js";
const kuromojiPath =
  "https://cdn.jsdelivr.net/npm/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js";
const aromanize =
  "https://cdn.jsdelivr.net/npm/aromanize@0.1.5/aromanize.min.js";
const openCCPath =
  "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.min.js";
const pinyinProPath =
  "https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.min.js";
const tinyPinyinPath =
  "https://cdn.jsdelivr.net/npm/tiny-pinyin/dist/tiny-pinyin.min.js";

const dictPath = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict";

// 최적화 #7 - 에러 메시지 표준화
const API_ERROR_MESSAGES = {
  400: {
    MISSING_API_KEY: I18n.t("translator.missingApiKey"),
    INVALID_API_KEY_FORMAT: I18n.t("translator.invalidApiKeyFormat"),
    DEFAULT: I18n.t("translator.invalidRequestFormat")
  },
  401: I18n.t("translator.invalidApiKey"),
  403: I18n.t("translator.accessForbidden"),
  429: I18n.t("translator.rateLimitExceeded"),
  500: I18n.t("translator.serviceUnavailable"),
  502: I18n.t("translator.serviceUnavailable"),
  503: I18n.t("translator.serviceUnavailable")
};

// 최적화 #7 - 에러 처리 헬퍼 함수
function handleAPIError(status, errorData) {
  const errorConfig = API_ERROR_MESSAGES[status];

  if (typeof errorConfig === 'object') {
    // 400 에러 - 코드별 메시지
    const code = errorData?.code;
    return errorConfig[code] || errorConfig.DEFAULT;
  }

  // 기타 에러 - 직접 메시지 반환
  return errorConfig || `${I18n.t("translator.requestFailed")} (${status})`;
}

// 전역 요청 상태 관리 (중복 요청 방지)
const _inflightRequests = new Map();
const _pendingRetries = new Map();

// 진행 중인 요청 키 생성
function getRequestKey(trackId, wantSmartPhonetic, lang) {
  return `${trackId}:${wantSmartPhonetic ? 'phonetic' : 'translation'}:${lang}`;
}

class Translator {
  // 메타데이터 번역 캐시 (메모리)
  static _metadataCache = new Map();
  static _metadataInflightRequests = new Map();

  // 특정 trackId에 대한 진행 중인 요청 정리 (곡 변경 시 호출)
  static clearInflightRequests(trackId) {
    if (!trackId) return;

    // _inflightRequests에서 해당 trackId로 시작하는 키 제거
    for (const key of _inflightRequests.keys()) {
      if (key.startsWith(`${trackId}:`)) {
        _inflightRequests.delete(key);
      }
    }

    // _pendingRetries에서도 제거
    for (const key of _pendingRetries.keys()) {
      if (key.startsWith(`${trackId}:`)) {
        _pendingRetries.delete(key);
      }
    }
  }

  // 모든 진행 중인 요청 정리
  static clearAllInflightRequests() {
    _inflightRequests.clear();
    _pendingRetries.clear();
  }

  // 메모리 캐시 초기화 (특정 trackId)
  static clearMemoryCache(trackId) {
    if (!trackId) return;
    for (const key of this._metadataCache.keys()) {
      if (key.startsWith(`${trackId}:`)) {
        this._metadataCache.delete(key);
      }
    }
  }

  // 모든 메모리 캐시 초기화
  static clearAllMemoryCache() {
    this._metadataCache.clear();
  }

  /**
   * 메타데이터 번역 (제목/아티스트)
   * @param {Object} options - 옵션
   * @param {string} options.trackId - Spotify Track ID
   * @param {string} options.title - 노래 제목
   * @param {string} options.artist - 아티스트 이름
   * @param {boolean} options.ignoreCache - 캐시 무시 여부
   * @returns {Promise<Object>} - 번역 결과
   */
  static async translateMetadata({ trackId, title, artist, ignoreCache = false }) {
    if (!title || !artist) {
      return null;
    }

    // trackId가 없으면 현재 재생 중인 곡에서 가져옴
    let finalTrackId = trackId;
    if (!finalTrackId) {
      finalTrackId = Spicetify.Player.data?.item?.uri?.split(':')[2];
    }
    if (!finalTrackId) {
      return null;
    }

    // API 키 확인
    const apiKey = StorageManager.getItem("lyrics-plus:visual:gemini-api-key");
    if (!apiKey || apiKey.trim() === "") {
      return null;
    }

    // 사용자 언어
    const userLang = I18n.getCurrentLanguage();
    const cacheKey = `${finalTrackId}:${userLang}`;

    // 메모리 캐시 확인
    if (!ignoreCache && this._metadataCache.has(cacheKey)) {
      return this._metadataCache.get(cacheKey);
    }

    // 로컬 캐시 (IndexedDB) 확인
    if (!ignoreCache) {
      try {
        const localCached = await LyricsCache.getMetadata(finalTrackId, userLang);
        if (localCached) {
          console.log(`[Translator] Using local metadata cache for ${cacheKey}`);
          this._metadataCache.set(cacheKey, localCached);
          return localCached;
        }
      } catch (e) {
        console.warn('[Translator] Local metadata cache check failed:', e);
      }
    }

    // 중복 요청 방지
    if (this._metadataInflightRequests.has(cacheKey)) {
      return this._metadataInflightRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      const url = "https://lyrics.api.ivl.is/lyrics/translate/metadata";

      // API 요청 로깅 시작
      let logId = null;
      if (window.ApiTracker) {
        logId = window.ApiTracker.logRequest('metadata', url, { trackId: finalTrackId, title, artist, lang: userLang });
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            trackId: finalTrackId,
            title,
            artist,
            lang: userLang,
            apiKey,
            ignore_cache: ignoreCache,
          }),
        });

        if (!response.ok) {
          if (window.ApiTracker && logId) {
            window.ApiTracker.logResponse(logId, { status: response.status }, 'error', `HTTP ${response.status}`);
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          if (window.ApiTracker && logId) {
            window.ApiTracker.logResponse(logId, data, 'error', data.message || "Translation failed");
          }
          throw new Error(data.message || "Translation failed");
        }

        if (data.success && data.data) {
          // 성공 로깅
          if (window.ApiTracker && logId) {
            window.ApiTracker.logResponse(logId, {
              translatedTitle: data.data.translatedTitle,
              translatedArtist: data.data.translatedArtist,
              romanizedTitle: data.data.romanizedTitle,
              romanizedArtist: data.data.romanizedArtist
            }, 'success');
          }
          // 메모리 캐시에 저장
          this._metadataCache.set(cacheKey, data.data);
          // 로컬 캐시(IndexedDB)에도 저장 (백그라운드)
          LyricsCache.setMetadata(finalTrackId, userLang, data.data).catch(() => { });
          return data.data;
        }

        if (window.ApiTracker && logId) {
          window.ApiTracker.logResponse(logId, data, 'error', "No data returned");
        }
        return null;
      } catch (error) {
        if (window.ApiTracker && logId) {
          window.ApiTracker.logResponse(logId, null, 'error', error.message);
        }
        console.warn(`[Translator] Metadata translation failed:`, error.message);
        return null;
      } finally {
        this._metadataInflightRequests.delete(cacheKey);
      }
    })();

    this._metadataInflightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * 메타데이터 캐시에서 가져오기 (동기)
   */
  static getMetadataFromCache(trackId) {
    const userLang = I18n.getCurrentLanguage();
    const cacheKey = `${trackId}:${userLang}`;
    return this._metadataCache.get(cacheKey) || null;
  }

  /**
   * 메타데이터 캐시 클리어
   */
  static clearMetadataCache() {
    this._metadataCache.clear();
    this._metadataInflightRequests.clear();
  }

  constructor(lang, isUsingNetease = false) {
    this.finished = {
      ja: false,
      ko: false,
      zh: false,
      ru: false,
      vi: false,
      de: false,
      en: false,
      es: false, // Spanish
      fr: false, // French
      it: false, // Italian
      pt: false, // Portuguese
      nl: false, // Dutch
      pl: false, // Polish
      tr: false, // Turkish
      ar: false, // Arabic
      hi: false, // Hindi
      th: false, // Thai
      id: false, // Indonesian
    };
    this.isUsingNetease = isUsingNetease;
    this.initializationPromise = null;

    this.applyKuromojiFix();
    // Start initialization asynchronously but don't await in constructor
    this.initializationPromise = this.initializeAsync(lang);
  }

  /**
   * Async initialization method that can be awaited
   * @param {string} lang - Language code
   * @returns {Promise<void>}
   */
  async initializeAsync(lang) {
    try {
      await this.injectExternals(lang);
      await this.createTranslator(lang);
    } catch (error) {
      throw error;
    }
  }

  static async callGemini({
    trackId,
    artist,
    title,
    text,
    wantSmartPhonetic = false,
    provider = null,
    ignoreCache = false,
    model = "gemini-3-flash-preview",
  }) {
    if (!text?.trim()) throw new Error("No text provided for translation");

    // Get API key from localStorage
    const apiKeyRaw = StorageManager.getItem("lyrics-plus:visual:gemini-api-key");
    let apiKeys = [];

    // Parse API keys (support both single string and JSON array)
    try {
      if (apiKeyRaw) {
        const trimmed = apiKeyRaw.trim();
        if (trimmed.startsWith('[')) {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            apiKeys = parsed;
          } else {
            apiKeys = [trimmed];
          }
        } else {
          apiKeys = [trimmed];
        }
      }
    } catch (e) {
      console.warn("Failed to parse API keys, treating as single key", e);
      apiKeys = [apiKeyRaw];
    }

    // Filter empty keys
    apiKeys = apiKeys.filter(k => k && k.trim().length > 0);

    // Check if API key is provided
    if (apiKeys.length === 0) {
      throw new Error(
        I18n.t("translator.missingApiKey")
      );
    }

    // trackId가 전달되지 않으면 현재 재생 중인 곡에서 가져옴
    let finalTrackId = trackId;
    if (!finalTrackId) {
      finalTrackId = Spicetify.Player.data?.item?.uri?.split(':')[2];
    }
    if (!finalTrackId) {
      throw new Error("No track ID available");
    }

    // 사용자의 현재 언어 가져오기
    const userLang = I18n.getCurrentLanguage();
    const selectedModel =
      model ||
      StorageManager.getItem("lyrics-plus:visual:gemini-model") ||
      "gemini-3-flash-preview";

    // 1. 로컬 캐시 먼저 확인 (ignoreCache가 아닌 경우)
    if (!ignoreCache) {
      try {
        const localCached = await LyricsCache.getTranslation(finalTrackId, userLang, wantSmartPhonetic);
        if (localCached) {
          console.log(`[Translator] Using local cache for ${finalTrackId}:${userLang}:${wantSmartPhonetic ? 'phonetic' : 'translation'}`);
          // 캐시 히트 로깅
          if (window.ApiTracker) {
            window.ApiTracker.logCacheHit(
              wantSmartPhonetic ? 'phonetic' : 'translation',
              `${finalTrackId}:${userLang}`,
              { lineCount: localCached.phonetic?.length || localCached.translation?.length || 0 }
            );
          }
          return localCached;
        }
      } catch (e) {
        console.warn('[Translator] Local cache check failed:', e);
      }
    }

    // 중복 요청 방지: 동일한 trackId + type + lang 조합에 대한 요청이 진행 중이면 해당 Promise 반환
    const requestKey = getRequestKey(finalTrackId, wantSmartPhonetic, userLang);

    // ignoreCache가 아닌 경우에만 중복 요청 체크
    if (!ignoreCache && _inflightRequests.has(requestKey)) {
      console.log(`[Translator] Deduplicating request for: ${requestKey}`);
      return _inflightRequests.get(requestKey);
    }

    // 실제 API 호출을 수행하는 함수
    const executeRequest = async (currentApiKey) => {
      const statusUrl = `https://lyrics.api.ivl.is/lyrics/translate?action=status&trackId=${finalTrackId}&lang=${userLang}&isPhonetic=${wantSmartPhonetic}`;
      let serverHasData = false;

      try {
        const statusRes = await fetch(statusUrl);
        const statusData = await statusRes.json();
        if (statusData.status === "completed") {
          serverHasData = true;
        }
      } catch (e) {
        console.warn("[Translator] Status check failed, fallback to local:", e);
      }

      // [2단계 - A] 서버에 데이터가 있고, "강제 재생성(ignoreCache)" 요청이 아닐 때만!
      if (serverHasData && !ignoreCache) {
        console.log("[Translator] Found on server! Fetching from centralized DB...");
        const serverUrl = "https://lyrics.api.ivl.is/lyrics/translate";

        const res = await fetch(serverUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackId: finalTrackId,
            artist,
            title,
            text,
            wantSmartPhonetic,
            provider,
            apiKey: currentApiKey,
            ignore_cache: ignoreCache,
            lang: userLang,
            userHash: Utils.getUserHash(),
          }),
        });

        if (!res.ok) throw new Error("Server fetch failed");
        const data = await res.json();

        LyricsCache.setTranslation(finalTrackId, userLang, wantSmartPhonetic, data).catch(() => { });
        return data;
      }

      console.log(`[Translator] Not on server. Using Local Model: ${selectedModel}`);

      const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${currentApiKey}`;

      // [Task 2-1] Retrieve user setting value (default: true)
      const useAnnotations = StorageManager.get("lyrics-plus:visual:gemini-annotations", true);

      // [Task 2-2] Dynamic annotation instruction generation
      // ON: Include detailed instructions for annotations with HTML styling
      // OFF: Include prohibition instructions against annotations
      const annotationInstruction = useAnnotations ? `
      3. **Annotate (Crucial)**: 
         - If a line contains specific cultural references, slang, complex metaphors, or wordplay that might be missed by ${userLang} speakers, add a brief explanation.
         - **Formatting Rule**: Append the explanation to the end of the translation string using the following HTML format exactly:
           \`<br><span style="font-size: 0.5em; opacity: 0.7; display: block; line-height: 1.2; margin-top: 2px;">(💡 Explanation)</span>\`
         - Only add annotations when necessary. Do not add them for every line.
      ` : `
      3. **No Annotations**: Do NOT add any explanations, footnotes, or parentheses. Just translate the lyrics text only.
      `;

      // [Task 2-3] Assemble final system prompt
      const systemPrompt = `
      You are a professional lyrics translator specializing in cultural localization.

      [Task Definitions]
      1. **Analyze Context**: Before translating, read the entire lyrics to understand the mood, story, and speaker's emotion.
      2. **Translate**: Translate the lyrics into ${userLang}. Prioritize natural flow and emotional delivery over literal translation.
      ${annotationInstruction}

      [Constraints]
      - Output format: JSON object with a key "${wantSmartPhonetic ? 'phonetic' : 'translation'}" containing an array of strings.
      - **Line Count Rule**: The output array length MUST match the input line count exactly.
      - No markdown code blocks in the output. Just raw JSON.
      `;

      const userPrompt = `
      Input Line Count: ${text.split('\n').length}
      
      Lyrics to Translate:
      ${text}
      `;

      const requestBody = {
        contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      };

      const localRes = await fetch(googleUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (!localRes.ok) {
        const errText = await localRes.text();
        throw new Error(`Google API Error (${localRes.status}): ${errText}`);
      }

      const rawData = await localRes.json();

      try {
        let textResponse = rawData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        textResponse = textResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");

        const parsedData = JSON.parse(textResponse);

        if (!parsedData.vi && parsedData.translation) {
          parsedData.vi = parsedData.translation;
        }
        if (wantSmartPhonetic && parsedData.translation && !parsedData.phonetic) {
          parsedData.phonetic = parsedData.translation;
        }

        LyricsCache.setTranslation(finalTrackId, userLang, wantSmartPhonetic, parsedData).catch(() => { });

        return parsedData;
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError, rawData);
        throw new Error("Failed to parse Gemini response");
      }
    };

    // 로테이션 실행 로직
    const runWithRotation = async () => {
      let lastError;
      for (let i = 0; i < apiKeys.length; i++) {
        const key = apiKeys[i];
        try {
          return await executeRequest(key);
        } catch (error) {
          lastError = error;
          // 429(Rate Limit) 또는 403(Forbidden/Invalid)인 경우 다음 키로 시도
          const isRateLimit = error.message.includes("429") || error.message.includes("Rate Limit");
          const isForbidden = error.message.includes("403") || error.message.includes("Forbidden") || error.message.includes("API key not valid");

          if (isRateLimit || isForbidden) {
            console.warn(`[Translator] API Key ${key.substring(0, 8)}... failed (${isRateLimit ? 'Rate Limit' : 'Invalid'}). Rotating...`);
            if (i === apiKeys.length - 1) {
              break; // 마지막 키였으면 중단
            }
            continue; // 다음 키 시도
          }

          // 그 외 에러는 즉시 중단
          throw error;
        }
      }
      throw new Error(`${I18n.t("translator.failedPrefix")}: ${lastError ? lastError.message : "All keys failed"}`);
    };

    // Promise를 생성하고 Map에 저장
    const requestPromise = runWithRotation().finally(() => {
      // 요청 완료 후 Map에서 제거
      _inflightRequests.delete(requestKey);
    });

    // ignoreCache가 아닌 경우에만 중복 요청 방지 등록
    if (!ignoreCache) {
      _inflightRequests.set(requestKey, requestPromise);
    }

    return requestPromise;
  }

  includeExternal(url) {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${url}"]`);
      if (existingScript) {
        if (existingScript.dataset)
          existingScript.dataset.loaded =
            existingScript.dataset.loaded || "true";
        return resolve();
      }

      const script = document.createElement("script");
      script.setAttribute("type", "text/javascript");
      script.setAttribute("src", url);

      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      });

      script.addEventListener("error", () => {
        reject(new Error(`Failed to load script: ${url}`));
      });

      document.head.appendChild(script);
    });
  }

  async injectExternals(lang) {
    const langCode = lang?.slice(0, 2);
    try {
      switch (langCode) {
        case "ja":
          await Promise.all([
            this.includeExternal(kuromojiPath),
            this.includeExternal(kuroshiroPath),
          ]);
          break;
        case "ko":
          await this.includeExternal(aromanize);
          break;
        case "zh":
          await this.includeExternal(openCCPath);
          this.includeExternal(pinyinProPath).catch(() => { });
          this.includeExternal(tinyPinyinPath).catch(() => { });
          break;
        case "ru":
        case "vi":
        case "de":
        case "en":
        case "es":
        case "fr":
        case "it":
        case "pt":
        case "nl":
        case "pl":
        case "tr":
        case "ar":
        case "hi":
        case "th":
        case "id":
          // These languages will use Gemini API for translation
          // No external libraries needed
          this.finished[langCode] = true;
          break;
      }
    } catch (error) {
      throw error;
    }
  }
  async awaitFinished(language) {
    const langCode = language?.slice(0, 2);
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    if (langCode && !this.finished[langCode]) {
      await this.injectExternals(language);
      await this.createTranslator(language);
    }
  }

  /**
   * Fix an issue with kuromoji when loading dict from external urls
   * Adapted from: https://github.com/mobilusoss/textlint-browser-runner/pull/7
   */
  applyKuromojiFix() {
    if (typeof XMLHttpRequest.prototype.realOpen !== "undefined") return;
    XMLHttpRequest.prototype.realOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, bool) {
      if (url.indexOf(dictPath.replace("https://", "https:/")) === 0) {
        this.realOpen(method, url.replace("https:/", "https://"), bool);
      } else {
        this.realOpen(method, url, bool);
      }
    };
  }

  async createTranslator(lang) {
    const langCode = lang.slice(0, 2);

    switch (langCode) {
      case "ja":
        if (this.kuroshiro) return;

        // Wait for libraries to be available with timeout
        await this.waitForGlobals(["Kuroshiro", "KuromojiAnalyzer"], 10000);

        this.kuroshiro = new Kuroshiro.default();
        await this.kuroshiro.init(new KuromojiAnalyzer({ dictPath }));
        this.finished.ja = true;
        break;

      case "ko":
        if (this.Aromanize) return;

        await this.waitForGlobals(["Aromanize"], 5000);

        this.Aromanize = Aromanize;
        this.finished.ko = true;
        break;

      case "zh":
        if (this.OpenCC) return;

        await this.waitForGlobals(["OpenCC"], 5000);

        this.OpenCC = OpenCC;
        this.finished.zh = true;
        break;

      case "ru":
      case "vi":
      case "de":
      case "en":
      case "es":
      case "fr":
      case "it":
      case "pt":
      case "nl":
      case "pl":
      case "tr":
      case "ar":
      case "hi":
      case "th":
      case "id":
        // These languages use Gemini API for translation
        this.finished[langCode] = true;
        break;
    }
  }

  /**
   * Wait for global variables to become available
   * @param {string[]} globalNames - Array of global variable names to wait for
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async waitForGlobals(globalNames, timeoutMs = 5000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkGlobals = () => {
        const allAvailable = globalNames.every(
          (name) => typeof window[name] !== "undefined"
        );

        if (allAvailable) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          reject(
            new Error(`Timeout waiting for globals: ${globalNames.join(", ")}`)
          );
          return;
        }

        setTimeout(checkGlobals, 50);
      };

      checkGlobals();
    });
  }

  // 최적화 #12 - Romaji character map
  static _romajiMap = { 'ō': 'ou', 'ū': 'uu', 'ā': 'aa', 'ī': 'ii', 'ē': 'ee' };
  static _romajiPattern = /[ōūāīē]/g;

  static normalizeRomajiString(s) {
    if (typeof s !== "string") return "";
    // 최적화 #12 - 단일 replace로 변경
    return s
      .replace(this._romajiPattern, match => this._romajiMap[match])
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  async romajifyText(text, target = "romaji", mode = "spaced") {
    // Ensure initialization is complete
    await this.awaitFinished("ja");

    const out = await this.kuroshiro.convert(text, {
      to: target,
      mode: mode,
      romajiSystem: "hepburn",
    });
    return Translator.normalizeRomajiString(out);
  }

  async convertToRomaja(text, target) {
    // Ensure initialization is complete
    await this.awaitFinished("ko");

    if (target === "hangul") return text;
    if (!this.Aromanize || typeof this.Aromanize.hangulToLatin !== "function") {
      throw new Error("Korean converter not initialized");
    }
    return this.Aromanize.hangulToLatin(text, "rr-translit");
  }

  async convertChinese(text, from, target) {
    // Ensure initialization is complete
    await this.awaitFinished("zh");

    const converter = this.OpenCC.Converter({
      from: from,
      to: target,
    });

    return converter(text);
  }

  async loadPinyinPro() {
    if (typeof pinyinPro !== "undefined") return true;
    const urls = [
      pinyinProPath,
      "https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.js",
      "https://unpkg.com/pinyin-pro@3.19.7/dist/index.min.js",
      "https://unpkg.com/pinyin-pro@3.19.7/dist/index.js",
      "https://fastly.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.min.js",
      "https://fastly.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.js",
    ];
    for (const url of urls) {
      try {
        await this.includeExternal(url);
        await this.waitForGlobals(["pinyinPro"], 8000);
        return true;
      } catch { }
    }
    return false;
  }

  async loadTinyPinyin() {
    if (typeof TinyPinyin !== "undefined") return true;
    const urls = [
      tinyPinyinPath,
      "https://unpkg.com/tiny-pinyin/dist/tiny-pinyin.min.js",
      "https://fastly.jsdelivr.net/npm/tiny-pinyin/dist/tiny-pinyin.min.js",
    ];
    for (const url of urls) {
      try {
        await this.includeExternal(url);
        await this.waitForGlobals(["TinyPinyin"], 8000);
        return true;
      } catch { }
    }
    return false;
  }

  async convertToPinyin(text, options = {}) {
    try {
      if (await this.loadTinyPinyin()) {
        return TinyPinyin.convertToPinyin(text || "");
      }
      if (await this.loadPinyinPro()) {
        const toneType = options.toneType || "mark";
        const type = options.type || "string";
        const nonZh = options.nonZh || "consecutive";
        return pinyinPro.pinyin(text || "", { toneType, type, nonZh });
      }
      return text || "";
    } catch {
      return text || "";
    }
  }
}
