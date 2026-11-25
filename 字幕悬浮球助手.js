// ==UserScript==
// @name         字幕悬浮球助手 (多站增强版 + 宽屏/画中画/智能适配)
// @namespace    https://greasyfork.org/
// @version      2.0.0
// @author
// @description  支持更多主流站点及镜像。新增：Tab 分组面板、字幕微调快捷键与同步校准、按番号记忆字幕、拖放加载、自动匹配最优字幕、双语双轨、广告行清洗、样式预设、粘贴字幕直链一键加载、宽屏/画中画/智能适配/恢复原始大小
// @match        *://*.missav.com/*
// @match        *://*.missav.ws/*
// @match        *://*.missav.ai/*
// @match        *://*.missav.li/*
// @match        *://*.missav.tw/*
// @match        *://missav123.com/*
// @match        *://*.missav123.com/*
// @match        *://*.jable.tv/*
// @match        *://*.fs1.app/*
// @match        *://*.netflav.com/*
// @match        *://*.supjav.com/*
// @match        *://*.javdb.com/*
// @match        *://*.hanime1.me/*
// @match        *://*.7tv095.com/*
// @match        *://*.javbus.com/*
// @match        *://*.javlibrary.com/*
// @match        *://*.avgle.com/*
// @match        *://*.fc2.com/*
// @match        *://*.xvideos.com/*
// @match        *://*.spankbang.com/*
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.openInTab
// @grant        GM_openInTab
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  const PLAYER_STATE_EVENT = "missav-player-state";
  const PLAYER_STATE_ATTR = "data-missav-player-state";
  const PLAYER_BRIDGE_ID = "missav-player-bridge";
  const FLOATING_BUTTON_POSITION_KEY = "missavFloatingButtonPosition";
  const FLOATING_UI_GAP = 8;
  const VIDEO_QUERY_SELECTORS = [
    ".jwplayer video",
    ".dplayer-video",
    ".art-video",
    "#vjs_video_3_html5_api",
    "video",
    "#player_html5_api",
    ".video-js video",
    ".plyr video",
    "iframe",
    "canvas",
  ];
  const VIDEO_CONTAINER_SELECTORS = [
    ".plyr__video-wrapper",
    ".player-container",
    "#player-container",
    ".video-js",
    ".jwplayer",
    ".jw-wrapper",
    ".video-img-box",
    ".video-player",
  ];
  const VIDEO_ANCESTOR_SELECTORS = [
    ...VIDEO_CONTAINER_SELECTORS,
    ".plyr",
    ".player",
    '[class*="video-player"]',
    '[class*="player"]',
  ];

  // --- Styles ---
  addStyle(`
        .custom-control-panel {
            position: fixed;
            left: 12px;
            bottom: 78px;
            background: linear-gradient(135deg, rgba(30, 30, 40, 0.95), rgba(40, 40, 55, 0.95));
            color: white;
            padding: 10px 12px;
            z-index: 9999;
            border-radius: 10px;
            width: min(292px, calc(100vw - 24px));
            max-height: min(420px, calc(100vh - 120px));
            overflow-y: auto;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            display: none;
        }
        .custom-control-panel label {
            margin-right: 0;
            display: block;
            min-width: 0;
            text-align: left;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
            font-size: 11px;
            line-height: 1.2;
        }
        .custom-control-panel input[type="number"],
        .custom-control-panel input[type="text"],
        .custom-control-panel input[type="color"] {
            width: 100%;
            margin-right: 0;
            color: white;
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(100, 150, 255, 0.3);
            border-radius: 6px;
            padding: 4px 6px;
            box-sizing: border-box;
            transition: all 0.2s ease;
            font-size: 12px;
            height: 30px;
        }
        .custom-control-panel input[type="number"]:focus,
        .custom-control-panel input[type="text"]:focus {
            outline: none;
            border-color: rgba(100, 150, 255, 0.6);
            background: rgba(255, 255, 255, 0.18);
            box-shadow: 0 0 8px rgba(100, 150, 255, 0.3);
        }
        .custom-control-panel input[data-key-name="subtitleOffset"],
        .custom-control-panel input[data-key-name="subtitlePosition"] {
             width: 100%;
        }
        .custom-control-panel button {
            background: linear-gradient(135deg, #4a90e2, #357abd);
            border: none;
            color: white;
            padding: 7px 8px;
            border-radius: 6px;
            cursor: pointer;
            margin: 0;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(58, 123, 200, 0.3);
            white-space: nowrap;
            min-height: 30px;
        }
        .custom-control-panel button:hover {
            background: linear-gradient(135deg, #5aa0f2, #4589cd);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(58, 123, 200, 0.4);
        }
        .custom-control-panel button:active {
            transform: translateY(0);
            box-shadow: 0 1px 4px rgba(58, 123, 200, 0.3);
        }
        .custom-control-panel .input-group {
            margin-bottom: 0;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 56px;
            align-items: center;
            gap: 6px;
            min-width: 0;
        }
        .custom-control-panel .button-group {
            grid-column: 1 / -1;
            margin-top: 2px;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            padding-top: 8px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
        }
        .custom-control-panel button:disabled {
            opacity: 0.55;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        .custom-control-panel .panel-tabs {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr)) 26px;
            gap: 4px;
            margin-bottom: 8px;
        }
        .custom-control-panel .panel-tabs button {
            min-height: 26px;
            padding: 4px 2px;
            font-size: 11px;
        }
        .custom-control-panel .panel-tabs button.active {
            background: linear-gradient(135deg, #2c7ad9, #1f5fae);
            box-shadow: inset 0 0 0 1px rgba(160, 210, 255, 0.7);
        }
        .custom-control-panel .panel-page {
            display: none;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px 10px;
            align-items: end;
        }
        .custom-control-panel .panel-page.active {
            display: grid;
        }
        .custom-control-panel .preset-group {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
        }
        .custom-control-panel .drop-hint {
            grid-column: 1 / -1;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.55);
            text-align: center;
            margin-top: 2px;
        }
        .custom-control-panel .url-load-group {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 76px;
            gap: 6px;
            align-items: end;
            min-width: 0;
        }
        .custom-control-panel .url-load-group label {
            grid-column: 1 / -1;
            margin-bottom: 0;
        }
        .custom-control-panel .url-load-group input[type="text"] {
            height: 30px;
            min-width: 0;
        }
        .custom-control-panel .url-load-group button {
            height: 30px;
            min-height: 30px;
            padding: 0 6px;
        }
        .custom-subtitle .subtitle-line {
            white-space: pre-wrap;
        }
        .custom-subtitle .subtitle-secondary {
            font-size: 0.76em;
            opacity: 0.92;
            margin-top: 3px;
        }
        .custom-subtitle {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-size: 26px;
            font-weight: bold;
            text-shadow: 2px 2px 5px rgba(0,0,0,0.9);
            background: rgba(0,0,0,0.0);
            padding: 5px 10px;
            border-radius: 5px;
            max-width: 85%;
            text-align: center;
            transition: opacity 0.3s, bottom 0.2s ease-out;
            z-index: 10000;
            pointer-events: none;
        }
        .subtitle-list {
            position: fixed;
            left: 12px;
            bottom: 140px;
            background: linear-gradient(135deg, rgba(30, 30, 40, 0.95), rgba(40, 40, 55, 0.95));
            color: white;
            max-height: min(320px, calc(100vh - 180px));
            width: min(280px, calc(100vw - 24px));
            overflow-y: auto;
            padding: 10px;
            border-radius: 10px;
            z-index: 10001;
            border: 1px solid rgba(100, 150, 255, 0.3);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
        }
        .subtitle-item {
            padding: 7px 8px;
            cursor: pointer;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 11px;
            border-radius: 6px;
            margin-bottom: 4px;
            transition: all 0.2s ease;
        }
        .subtitle-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .subtitle-item:hover {
            background: rgba(100, 150, 255, 0.25);
            transform: translateX(4px);
            border-color: rgba(100, 150, 255, 0.3);
        }
        .show-controls-button {
            position: fixed;
            left: 14px;
            bottom: 16px;
            background: linear-gradient(135deg, #4a90e2, #357abd);
            color: white;
            width: 52px;
            height: 52px;
            padding: 0;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            z-index: 9998;
            font-size: 11px;
            font-weight: 500;
            box-shadow: 0 4px 16px rgba(58, 123, 200, 0.4);
            transition: all 0.3s ease;
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            cursor: grab;
        }
        .show-controls-button:hover {
            background: linear-gradient(135deg, #5aa0f2, #4589cd);
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 6px 20px rgba(58, 123, 200, 0.5);
        }
        .show-controls-button.dragging {
            transition: none;
            transform: none;
            cursor: grabbing;
        }
        .custom-control-panel button.full-width {
            grid-column: 1 / -1;
        }
        @media (max-width: 640px) {
            .custom-control-panel {
                left: 10px;
                width: auto;
                max-height: calc(100vh - 108px);
                bottom: 74px;
            }
            .subtitle-list {
                left: 10px;
                width: auto;
            }
            .show-controls-button {
                left: 12px;
                bottom: 14px;
            }
        }
    `);

  // --- Storage Utility ---
  const StorageUtil = {
    async get(key, defaultValue) {
      if (typeof GM !== "undefined" && typeof GM.getValue === "function") {
        return await GM.getValue(key, defaultValue);
      }
      if (typeof GM_getValue === "function") {
        return GM_getValue(key, defaultValue);
      }
      const val = localStorage.getItem(key);
      return val !== null ? val : defaultValue;
    },
    async set(key, value) {
      if (typeof GM !== "undefined" && typeof GM.setValue === "function") {
        return await GM.setValue(key, value);
      }
      if (typeof GM_setValue === "function") {
        return GM_setValue(key, value);
      }
      localStorage.setItem(key, value);
    }
  };

  // --- Utility Functions ---
  function throttle(func, wait) {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= wait) {
        lastCall = now;
        return func.apply(this, args);
      }
    };
  }

  function el(tag, props = {}, children = []) {
    const element = document.createElement(tag);
    Object.assign(element, props);
    if (props.style) {
      Object.assign(element.style, props.style);
    }
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child) {
        element.appendChild(child);
      }
    });
    return element;
  }

  // --- State Management ---
  const State = {
    config: {
      accelerationRate: 3,
      skipTime: 5,
      subtitleOffset: 0,
      subtitleVerticalPositionPercent: 15,
      subtitleFontSize: 26,
      subtitleColor: "#ffffff",
      subtitleOutlineColor: "#000000",
      subtitleOutlineWidth: "2px",
      subtitleShadowColor: "rgba(0, 0, 0, 0.9)",
      subtitleShadowBlur: "5px",
      subtitleShadowOffsetX: "2px",
      subtitleShadowOffsetY: "2px",
      subtitleBackgroundColor: "rgba(0, 0, 0, 0.0)",
      shortcutKeys: {
        accelerate: "z",
        forward: "x",
        backward: "c",
      },
      wideScreenEnabled: false,
      autoAdaptEnabled: true,
      subtitleSearchSources: [
        {
          name: "Subtitlecat",
          url: "https://subtitlecat.com/index.php?search={query}",
          type: "external",
        },
        {
          name: "Xunlei",
          url: "https://api-shoulei-ssl.xunlei.com/oracle/subtitle?name={query}",
          type: "api",
        },
        {
          name: "OpenSubtitles",
          url: "https://www.opensubtitles.com/en/search/sublanguageid-all/query-{query}",
          type: "external",
        },
        {
          name: "Addic7ed",
          url: "https://www.addic7ed.com/search.php?search={query}",
          type: "external",
        },
        {
          name: "TVSubtitles",
          url: "https://www.tvsubtitles.net/search.php?q={query}",
          type: "external",
        },
        {
          name: "SUBDL",
          url: "https://subdl.com/search?q={query}",
          type: "external",
        },
      ]
    },
    runtime: {
      isAccelerating: false,
      secondarySubtitles: [],
      secondarySubtitleText: "",
      secondaryIndex: -1,
      subtitleRestoreAttempted: false,
      subtitleOffsetApplying: false,
      floatingButtonPosition: null,
      floatingButtonDragState: null,
      suppressFloatingButtonClick: false,
      videoElement: null,
      playerMonitorInterval: null,
      hasShownPlayerReadyToast: false,
      subtitleTrack: null,
      subtitleTrackOwner: null,
      playerBridgeState: {
        currentTime: 0,
        paused: true,
        ended: false,
        seeking: false,
        reason: "",
      },
      isBridgeActive: false,
      subtitles: [],
      currentSubIndex: -1,
      originalSubtitleText: "",
      currentToast: null
    }
  };

  // Load settings from GM storage
  async function loadSettings() {
    try {
      State.config.accelerationRate = parseFloat(await StorageUtil.get("missavAccelerationRate", "3")) || 3;
      State.config.skipTime = parseFloat(await StorageUtil.get("missavSkipTime", "5")) || 5;
      State.config.subtitleOffset = parseFloat(await StorageUtil.get("missavSubtitleOffset", "0")) || 0;
      State.config.subtitleVerticalPositionPercent = parseFloat(await StorageUtil.get("missavSubtitlePosition", "15")) || 15;
      State.config.subtitleFontSize = parseFloat(await StorageUtil.get("missavSubtitleFontSize", "26")) || 26;
      State.config.subtitleColor = await StorageUtil.get("missavSubtitleColor", "#ffffff");
      State.config.subtitleOutlineColor = await StorageUtil.get("missavSubtitleOutlineColor", "#000000");
      State.config.subtitleOutlineWidth = await StorageUtil.get("missavSubtitleOutlineWidth", "2px");
      State.config.subtitleShadowColor = await StorageUtil.get("missavSubtitleShadowColor", "rgba(0, 0, 0, 0.9)");
      State.config.subtitleShadowBlur = await StorageUtil.get("missavSubtitleShadowBlur", "5px");
      State.config.subtitleShadowOffsetX = await StorageUtil.get("missavSubtitleShadowOffsetX", "2px");
      State.config.subtitleShadowOffsetY = await StorageUtil.get("missavSubtitleShadowOffsetY", "2px");
      State.config.subtitleBackgroundColor = await StorageUtil.get("missavSubtitleBackgroundColor", "rgba(0, 0, 0, 0.0)");
      State.config.shortcutKeys.accelerate = await StorageUtil.get("missavAccelerateKey", "z");
      State.config.shortcutKeys.forward = await StorageUtil.get("missavForwardKey", "x");
      State.config.shortcutKeys.backward = await StorageUtil.get("missavBackwardKey", "c");
      State.config.wideScreenEnabled = (await StorageUtil.get("missavWideScreenEnabled", "false")) === "true";
    } catch (error) {
      console.warn("Missav Script: Failed to load settings from GM storage, using defaults.", error);
    }
  }

  // --- UI Elements ---
  let controlPanel;
  let subtitleElement;
  let videoContainer;
  let subtitleList = null;
  let showControlsButton = null;
  let floatingButtonPosition = null;
  let subtitleTrack = null;
  let subtitleTrackOwner = null;
  let subtitleObserver = null;
  let lastVideoContainer = null;

  // --- Functions ---

  function addStyle(css) {
    const style = document.createElement("style");
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
    return style;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getViewportMargin() {
    return window.innerWidth <= 640 ? 10 : 12;
  }

  function loadFloatingButtonPosition() {
    try {
      const raw = localStorage.getItem(FLOATING_BUTTON_POSITION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Number.isFinite(parsed?.left) || !Number.isFinite(parsed?.top)) {
        return null;
      }
      return { left: parsed.left, top: parsed.top };
    } catch (error) {
      console.warn("Missav Script: Failed to load floating button position.", error);
      return null;
    }
  }

  function saveFloatingButtonPosition() {
    if (!floatingButtonPosition) return;
    try {
      localStorage.setItem(FLOATING_BUTTON_POSITION_KEY, JSON.stringify(floatingButtonPosition));
    } catch (error) {
      console.warn("Missav Script: Failed to save floating button position.", error);
    }
  }

  function clampFloatingButtonPosition(position) {
    const margin = getViewportMargin();
    const buttonWidth = showControlsButton?.offsetWidth || 52;
    const buttonHeight = showControlsButton?.offsetHeight || 52;
    return {
      left: clamp(position.left, margin, Math.max(margin, window.innerWidth - buttonWidth - margin)),
      top: clamp(position.top, margin, Math.max(margin, window.innerHeight - buttonHeight - margin)),
    };
  }

  function getDefaultFloatingButtonPosition() {
    const margin = getViewportMargin();
    const buttonHeight = showControlsButton?.offsetHeight || 52;
    return clampFloatingButtonPosition({
      left: margin + 2,
      top: window.innerHeight - buttonHeight - 16,
    });
  }

  function applyFloatingButtonPosition() {
    if (!showControlsButton) return;
    if (!floatingButtonPosition) {
      floatingButtonPosition = loadFloatingButtonPosition() || getDefaultFloatingButtonPosition();
    }
    floatingButtonPosition = clampFloatingButtonPosition(floatingButtonPosition);
    showControlsButton.style.left = `${floatingButtonPosition.left}px`;
    showControlsButton.style.top = `${floatingButtonPosition.top}px`;
    showControlsButton.style.right = "auto";
    showControlsButton.style.bottom = "auto";
  }

  function getBallAnchorRect() {
    if (!showControlsButton) return null;
    applyFloatingButtonPosition();
    if (showControlsButton.style.display !== "none") {
      const rect = showControlsButton.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return rect;
      }
    }
    const buttonWidth = showControlsButton.offsetWidth || 52;
    const buttonHeight = showControlsButton.offsetHeight || 52;
    const position = floatingButtonPosition || getDefaultFloatingButtonPosition();
    return {
      left: position.left,
      top: position.top,
      right: position.left + buttonWidth,
      bottom: position.top + buttonHeight,
      width: buttonWidth,
      height: buttonHeight,
    };
  }

  function positionControlPanel() {
    if (!controlPanel || controlPanel.style.display === "none") return;
    const anchorRect = getBallAnchorRect();
    if (!anchorRect) return;
    const margin = getViewportMargin();
    const gap = FLOATING_UI_GAP;
    const panelWidth = Math.min(controlPanel.offsetWidth || 292, Math.max(220, window.innerWidth - margin * 2));
    controlPanel.style.width = `${panelWidth}px`;
    controlPanel.style.maxHeight = `${Math.max(200, window.innerHeight - margin * 2)}px`;
    const panelHeight = Math.min(controlPanel.scrollHeight, window.innerHeight - margin * 2);
    const alignRight = anchorRect.left > window.innerWidth / 2;
    const preferredLeft = alignRight ? anchorRect.right - panelWidth : anchorRect.left;
    const left = clamp(preferredLeft, margin, Math.max(margin, window.innerWidth - panelWidth - margin));
    const spaceAbove = anchorRect.top - margin - gap;
    const spaceBelow = window.innerHeight - anchorRect.bottom - margin - gap;
    const shouldOpenAbove = spaceAbove >= panelHeight || spaceAbove >= spaceBelow;
    const preferredTop = shouldOpenAbove ? anchorRect.top - panelHeight - gap : anchorRect.bottom + gap;
    const top = clamp(preferredTop, margin, Math.max(margin, window.innerHeight - panelHeight - margin));
    controlPanel.style.left = `${left}px`;
    controlPanel.style.top = `${top}px`;
    controlPanel.style.right = "auto";
    controlPanel.style.bottom = "auto";
  }

  function cleanupFloatingButtonDrag() {
    document.removeEventListener("pointermove", throttledHandleFloatingButtonPointerMove);
    document.removeEventListener("pointerup", handleFloatingButtonPointerUp);
    document.removeEventListener("pointercancel", handleFloatingButtonPointerUp);
  }

  function handleFloatingButtonPointerMove(event) {
    if (!State.runtime.floatingButtonDragState) return;
    const deltaX = event.clientX - State.runtime.floatingButtonDragState.startX;
    const deltaY = event.clientY - State.runtime.floatingButtonDragState.startY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      State.runtime.suppressFloatingButtonClick = true;
    }
    floatingButtonPosition = clampFloatingButtonPosition({
      left: State.runtime.floatingButtonDragState.originLeft + deltaX,
      top: State.runtime.floatingButtonDragState.originTop + deltaY,
    });
    applyFloatingButtonPosition();
    positionControlPanel();
    positionSubtitleList();
  }

  const throttledHandleFloatingButtonPointerMove = throttle(handleFloatingButtonPointerMove, 16);

  function handleFloatingButtonPointerUp(event) {
    if (showControlsButton?.classList.contains("dragging")) {
      showControlsButton.classList.remove("dragging");
    }
    if (showControlsButton && State.runtime.floatingButtonDragState && event.pointerId !== undefined && showControlsButton.hasPointerCapture?.(event.pointerId)) {
      showControlsButton.releasePointerCapture(event.pointerId);
    }
    cleanupFloatingButtonDrag();
    if (State.runtime.floatingButtonDragState && State.runtime.suppressFloatingButtonClick) {
      saveFloatingButtonPosition();
    }
    State.runtime.floatingButtonDragState = null;
  }

  function handleFloatingButtonPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (!showControlsButton) return;
    applyFloatingButtonPosition();
    const rect = showControlsButton.getBoundingClientRect();
    State.runtime.floatingButtonDragState = {
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
    };
    State.runtime.suppressFloatingButtonClick = false;
    showControlsButton.classList.add("dragging");
    if (event.pointerId !== undefined) {
      showControlsButton.setPointerCapture?.(event.pointerId);
    }
    document.addEventListener("pointermove", throttledHandleFloatingButtonPointerMove);
    document.addEventListener("pointerup", handleFloatingButtonPointerUp);
    document.addEventListener("pointercancel", handleFloatingButtonPointerUp);
  }

  function handleFloatingButtonClick(event) {
    if (State.runtime.suppressFloatingButtonClick) {
      State.runtime.suppressFloatingButtonClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    showControlPanel();
  }

  function handleViewportChange() {
    applyFloatingButtonPosition();
    positionControlPanel();
    positionSubtitleList();
  }

  const throttledHandleViewportChange = throttle(handleViewportChange, 16);

  function openInNewTab(url) {
    try {
      if (typeof GM !== "undefined" && typeof GM.openInTab === "function") {
        return GM.openInTab(url, true);
      }
      if (typeof GM_openInTab === "function") {
        return GM_openInTab(url, { active: true, insert: true });
      }
    } catch (error) {
      console.warn("Missav Script: GM.openInTab failed, falling back to window.open.", error);
    }
    return window.open(url, "_blank", "noopener");
  }

  function gmRequest(details) {
    return new Promise((resolve, reject) => {
      const timeoutSeconds = details.timeout ? Math.ceil(details.timeout / 1000) : 0;
      const request = {
        ...details,
        onload: (response) => resolve(response),
        onerror: (error) => reject(error instanceof Error ? error : new Error("网络错误或请求被阻止")),
        ontimeout: () => reject(new Error(`请求超时${timeoutSeconds ? ` (${timeoutSeconds}秒)` : ""}`)),
      };
      try {
        if (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function") {
          GM.xmlHttpRequest(request);
          return;
        }
        if (typeof GM_xmlhttpRequest === "function") {
          GM_xmlhttpRequest(request);
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }
      reject(new Error("当前脚本管理器不支持 GM.xmlHttpRequest"));
    });
  }

  function parseJsonResponse(response) {
    if (response?.response && typeof response.response === "object") {
      return response.response;
    }
    if (typeof response?.responseText === "string" && response.responseText.trim()) {
      return JSON.parse(response.responseText);
    }
    throw new Error("无法解析服务器响应 (JSON)");
  }

  function getResponseText(response) {
    if (typeof response?.responseText === "string") {
      return response.responseText;
    }
    if (typeof response?.response === "string") {
      return response.response;
    }
    return "";
  }

  function findPageVideo(root = document) {
    for (const selector of VIDEO_QUERY_SELECTORS) {
      const candidate = root.querySelector(selector);
      if (candidate instanceof HTMLVideoElement) {
        return candidate;
      }
    }
    const fallbackVideo = root.querySelector("video");
    return fallbackVideo instanceof HTMLVideoElement ? fallbackVideo : null;
  }

  function findVideoContainer(video = null) {
    const currentVideo = video || findVideoElement() || findPageVideo();
    if (currentVideo) {
      for (const selector of VIDEO_ANCESTOR_SELECTORS) {
        const candidate = currentVideo.closest(selector);
        if (candidate && candidate !== document.body && candidate !== document.documentElement) {
          return candidate;
        }
      }
      if (currentVideo.parentElement) {
        return currentVideo.parentElement;
      }
    }
    for (const selector of VIDEO_CONTAINER_SELECTORS) {
      const candidate = document.querySelector(selector);
      if (candidate) {
        return candidate;
      }
    }
    return null;
  }

  function scoreVideoElement(video) {
    if (!video) return -Infinity;
    const rect = video.getBoundingClientRect();
    const style = getComputedStyle(video);
    const isVisible = style.display !== "none" && style.visibility !== "hidden" && parseFloat(style.opacity || "1") !== 0 && rect.width >= 160 && rect.height >= 90;
    const hasSource = Boolean(video.currentSrc || video.src);
    const isLikelyPlayer = video.id === "player" || video.closest(".plyr") || video.closest(".player") || video.closest(".video-js") || video.closest(".jwplayer") || video.closest('[class*="video-player"]');
    const isPlaying = !video.paused && !video.ended;
    return (isLikelyPlayer ? 1_000_000 : 0) + (isVisible ? 100_000 : 0) + (isPlaying ? 10_000 : 0) + (hasSource ? 1_000 : 0) + Math.round(rect.width * rect.height);
  }

  function injectPlayerBridge() {
    if (document.getElementById(PLAYER_BRIDGE_ID)) return;
    const bridgeScript = document.createElement("script");
    bridgeScript.id = PLAYER_BRIDGE_ID;
    bridgeScript.textContent = `
            (() => {
                const EVENT_NAME = ${JSON.stringify(PLAYER_STATE_EVENT)};
                const STATE_ATTR = ${JSON.stringify(PLAYER_STATE_ATTR)};
                const VIDEO_SELECTORS = ${JSON.stringify(VIDEO_QUERY_SELECTORS)};
                if (window.__MISSAV_PLAYER_BRIDGE__) return;
                window.__MISSAV_PLAYER_BRIDGE__ = true;
                let boundPlayer = null;
                let media = null;
                let rafId = null;
                let rvfcId = null;
                const mediaEvents = ['play', 'playing', 'pause', 'seeking', 'seeked', 'waiting', 'ended', 'loadedmetadata', 'ratechange'];
                const findMediaElement = () => {
                    for (const selector of VIDEO_SELECTORS) {
                        const candidate = document.querySelector(selector);
                        if (candidate instanceof HTMLVideoElement) {
                            return candidate;
                        }
                    }
                    return document.querySelector('video');
                };
                const emit = (reason) => {
                    const currentTime = media && typeof media.currentTime === 'number'
                        ? media.currentTime
                        : boundPlayer && typeof boundPlayer.currentTime === 'number'
                            ? boundPlayer.currentTime
                            : 0;
                    const root = document.documentElement;
                    if (root) {
                        root.setAttribute(STATE_ATTR, JSON.stringify({
                            currentTime,
                            paused: media ? !!media.paused : !(boundPlayer && !boundPlayer.paused),
                            ended: media ? !!media.ended : false,
                            seeking: media ? !!media.seeking : false,
                            reason
                        }));
                    }
                    document.dispatchEvent(new CustomEvent(EVENT_NAME));
                };
                const stopLoop = () => {
                    if (media && typeof media.cancelVideoFrameCallback === 'function' && rvfcId !== null) {
                        try { media.cancelVideoFrameCallback(rvfcId); } catch (error) {}
                    }
                    if (rafId !== null) {
                        cancelAnimationFrame(rafId);
                    }
                    rafId = null;
                    rvfcId = null;
                };
                const frameStep = () => {
                    emit('frame');
                    startLoop();
                };
                const startLoop = () => {
                    stopLoop();
                    if (!media || media.paused || media.ended || document.visibilityState === 'hidden') {
                        return;
                    }
                    if (typeof media.requestVideoFrameCallback === 'function') {
                        rvfcId = media.requestVideoFrameCallback(() => frameStep());
                    } else {
                        rafId = requestAnimationFrame(frameStep);
                    }
                };
                const onMediaEvent = (event) => {
                    emit(event.type);
                    if (event.type === 'pause' || event.type === 'waiting' || event.type === 'ended') {
                        stopLoop();
                        return;
                    }
                    startLoop();
                };
                const cleanupMedia = () => {
                    stopLoop();
                    if (media) {
                        mediaEvents.forEach((eventName) => media.removeEventListener(eventName, onMediaEvent));
                    }
                };
                const bindMedia = (nextMedia, player = null) => {
                    if (!nextMedia) return false;
                    if (boundPlayer === player && media === nextMedia && nextMedia.isConnected) {
                        return true;
                    }
                    cleanupMedia();
                    boundPlayer = player;
                    media = nextMedia;
                    mediaEvents.forEach((eventName) => media.addEventListener(eventName, onMediaEvent, { passive: true }));
                    emit('bind');
                    startLoop();
                    return true;
                };
                const bindPlayer = (player) => {
                    if (!player) return false;
                    const nextMedia = player.media || findMediaElement();
                    return bindMedia(nextMedia, player);
                };
                const getPlayerCandidates = () => {
                    const candidates = [];
                    if (window.player) candidates.push(window.player);
                    if (window.plyr) candidates.push(window.plyr);
                    if (typeof window.videojs === 'function' && typeof window.videojs.getPlayers === 'function') {
                        candidates.push(...Object.values(window.videojs.getPlayers()));
                    }
                    return candidates.filter(Boolean);
                };
                document.addEventListener('visibilitychange', () => {
                    emit('visibilitychange');
                    if (document.visibilityState === 'hidden') {
                        stopLoop();
                    } else {
                        startLoop();
                    }
                });
                setInterval(() => {
                    for (const candidate of getPlayerCandidates()) {
                        if (bindPlayer(candidate)) {
                            return;
                        }
                    }
                    if (bindMedia(findMediaElement())) {
                        return;
                    }
                    if (media && media.isConnected) {
                        emit('poll');
                    }
                }, 1000);
            })();
        `;
    (document.documentElement || document.head || document.body).appendChild(bridgeScript);
    bridgeScript.remove();
  }

  function handlePlayerStateEvent() {
    const detailText = document.documentElement?.getAttribute(PLAYER_STATE_ATTR);
    if (!detailText) return;
    let detail;
    try {
      detail = JSON.parse(detailText);
    } catch (error) {
      console.warn("Missav Script: Failed to parse bridged player state.", error);
      return;
    }
    State.runtime.playerBridgeState = {
      currentTime: Number.isFinite(detail.currentTime) ? detail.currentTime : 0,
      paused: Boolean(detail.paused),
      ended: Boolean(detail.ended),
      seeking: Boolean(detail.seeking),
      reason: typeof detail.reason === "string" ? detail.reason : "",
    };
    State.runtime.isBridgeActive = true;
    const currentVideo = findVideoElement();
    if (currentVideo) {
      bindVideoElement(currentVideo);
    }
    updateSubtitle();
  }

  function setupPlayerBridge() {
    document.removeEventListener(PLAYER_STATE_EVENT, handlePlayerStateEvent);
    document.addEventListener(PLAYER_STATE_EVENT, handlePlayerStateEvent);
    injectPlayerBridge();
  }

  function getCueConstructor() {
    if (typeof VTTCue !== "undefined") return VTTCue;
    if (typeof TextTrackCue !== "undefined") return TextTrackCue;
    return null;
  }

  let lastRenderedPrimary = null;
  let lastRenderedSecondary = null;

  function setSubtitleText(text, secondaryText = "") {
    if (!subtitleElement) return;
    const primary = typeof text === "string" ? text : "";
    const secondary = typeof secondaryText === "string" ? secondaryText : "";
    if (primary === lastRenderedPrimary && secondary === lastRenderedSecondary) return;
    lastRenderedPrimary = primary;
    lastRenderedSecondary = secondary;
    subtitleElement.textContent = "";
    if (primary) {
      const line = document.createElement("div");
      line.className = "subtitle-line subtitle-primary";
      line.textContent = primary;
      subtitleElement.appendChild(line);
    }
    if (secondary) {
      const line = document.createElement("div");
      line.className = "subtitle-line subtitle-secondary";
      line.textContent = secondary;
      subtitleElement.appendChild(line);
    }
    subtitleElement.style.display = primary || secondary ? "block" : "none";
  }

  function handleTrackCueChange() {
    if (!subtitleTrack) {
      setSubtitleText("");
      return;
    }
    const activeText = Array.from(subtitleTrack.activeCues || [])
      .map((cue) => cue.text)
      .filter(Boolean)
      .join("\n");
    setSubtitleText(activeText);
  }

  function positionSubtitleList() {
    if (!subtitleList) return;
    const margin = getViewportMargin();
    const gap = FLOATING_UI_GAP;
    const panelVisible = controlPanel && controlPanel.style.display !== "none";
    const anchorRect = panelVisible ? controlPanel.getBoundingClientRect() : getBallAnchorRect();
    if (!anchorRect) return;
    subtitleList.style.width = `${Math.min(280, Math.max(220, window.innerWidth - margin * 2))}px`;
    const listWidth = subtitleList.offsetWidth || 280;
    const maxHeight = Math.max(160, window.innerHeight - margin * 2);
    subtitleList.style.maxHeight = `${maxHeight}px`;
    const listHeight = Math.min(subtitleList.scrollHeight, maxHeight);
    let left = anchorRect.left;
    let top = anchorRect.top - listHeight - gap;
    if (panelVisible && window.innerWidth > 640) {
      const spaceRight = window.innerWidth - anchorRect.right - margin;
      const spaceLeft = anchorRect.left - margin;
      if (spaceRight >= listWidth + gap) {
        left = anchorRect.right + gap;
        top = anchorRect.top;
      } else if (spaceLeft >= listWidth + gap) {
        left = anchorRect.left - listWidth - gap;
        top = anchorRect.top;
      }
    }
    left = clamp(left, margin, Math.max(margin, window.innerWidth - listWidth - margin));
    top = clamp(top, margin, Math.max(margin, window.innerHeight - listHeight - margin));
    subtitleList.style.left = `${left}px`;
    subtitleList.style.top = `${top}px`;
    subtitleList.style.right = "auto";
    subtitleList.style.bottom = "auto";
  }

  function clearSubtitleTrack() {
    if (!subtitleTrack) return;
    try {
      subtitleTrack.removeEventListener("cuechange", handleTrackCueChange);
      Array.from(subtitleTrack.cues || []).forEach((cue) => {
        try {
          subtitleTrack.removeCue(cue);
        } catch (error) {
          console.warn("Missav Script: Failed to remove cue.", error);
        }
      });
    } catch (error) {
      console.warn("Missav Script: Failed to clear subtitle track.", error);
    }
    subtitleTrack = null;
    subtitleTrackOwner = null;
    setSubtitleText("");
  }

  function syncSubtitleTrack() {
    if (!State.runtime.videoElement || !State.runtime.subtitles.length) {
      clearSubtitleTrack();
      return false;
    }
    const CueConstructor = getCueConstructor();
    if (!CueConstructor) {
      console.warn("Missav Script: VTTCue/TextTrackCue is not available, falling back to manual sync.");
      return false;
    }
    if (!subtitleTrack || subtitleTrackOwner !== State.runtime.videoElement) {
      clearSubtitleTrack();
      subtitleTrack = State.runtime.videoElement.addTextTrack("subtitles", "Missav Subtitle", "zh");
      subtitleTrack.mode = "hidden";
      subtitleTrack.addEventListener("cuechange", handleTrackCueChange);
      subtitleTrackOwner = State.runtime.videoElement;
    } else {
      Array.from(subtitleTrack.cues || []).forEach((cue) => {
        try {
          subtitleTrack.removeCue(cue);
        } catch (error) {
          console.warn("Missav Script: Failed to reset cue.", error);
        }
      });
    }
    State.runtime.subtitles.forEach((sub) => {
      const startTime = Math.max(0, sub.start);
      const endTime = Math.max(startTime + 0.01, sub.end);
      const cue = new CueConstructor(startTime, endTime, sub.text);
      subtitleTrack.addCue(cue);
    });
    subtitleTrack.mode = "hidden";
    handleTrackCueChange();
    return true;
  }

  function findVideoElement() {
    const videos = Array.from(document.querySelectorAll("video"));
    if (videos.length === 0) return null;
    return videos.sort((left, right) => scoreVideoElement(right) - scoreVideoElement(left))[0] || null;
  }

  function handleVideoTimeUpdate() {
    requestAnimationFrame(updateSubtitle);
  }

  function bindVideoElement(video) {
    if (!video) return false;
    if (State.runtime.videoElement && State.runtime.videoElement !== video) {
      State.runtime.videoElement.removeEventListener("timeupdate", handleVideoTimeUpdate);
      State.runtime.videoElement.removeEventListener("seeking", handleVideoTimeUpdate);
      State.runtime.videoElement.removeEventListener("seeked", handleVideoTimeUpdate);
      State.runtime.videoElement.removeEventListener("loadedmetadata", handleVideoTimeUpdate);
    }
    if (State.runtime.videoElement === video) {
      return true;
    }
    State.runtime.videoElement = video;
    State.runtime.videoElement.addEventListener("timeupdate", handleVideoTimeUpdate);
    State.runtime.videoElement.addEventListener("seeking", handleVideoTimeUpdate);
    State.runtime.videoElement.addEventListener("seeked", handleVideoTimeUpdate);
    State.runtime.videoElement.addEventListener("loadedmetadata", handleVideoTimeUpdate);
    console.log("Missav Script: HTML5 video element bound.", State.runtime.videoElement);
    requestAnimationFrame(updateSubtitle);
    if (!State.runtime.hasShownPlayerReadyToast) {
      State.runtime.hasShownPlayerReadyToast = true;
      showToast("播放器初始化完成", 1500);
    }
    setTimeout(() => {
      tryRestoreSubtitle().catch((error) => {
        console.warn("Missav Script: Subtitle restore skipped.", error);
      });
    }, 600);
    return true;
  }

  function updateSubtitlePositionStyle(positionPercent) {
    if (subtitleElement && typeof positionPercent === "number") {
      const clampedPosition = Math.max(0, Math.min(90, positionPercent));
      subtitleElement.style.bottom = `${clampedPosition}%`;
    }
  }

  function updateSubtitleFontStyle(size) {
    if (subtitleElement && typeof size === "number") {
      const clampedSize = Math.max(10, Math.min(60, size));
      subtitleElement.style.fontSize = `${clampedSize}px`;
    }
  }

  function updateSubtitleStyle() {
    if (!subtitleElement) return;
    updateSubtitleFontStyle(State.config.subtitleFontSize);
    subtitleElement.style.color = State.config.subtitleColor;
    subtitleElement.style.webkitTextStroke = `${State.config.subtitleOutlineWidth} ${State.config.subtitleOutlineColor}`;
    subtitleElement.style.textShadow = `${State.config.subtitleShadowOffsetX} ${State.config.subtitleShadowOffsetY} ${State.config.subtitleShadowBlur} ${State.config.subtitleShadowColor}`;
    subtitleElement.style.background = State.config.subtitleBackgroundColor;
  }

  // ========== 核心修复：确保字幕元素始终挂载 ==========
  function ensureSubtitleElementAttached() {
    if (!subtitleElement) return;
    const container = findVideoContainer();
    if (!container) return;
    lastVideoContainer = container;
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    if (!container.contains(subtitleElement)) {
      container.appendChild(subtitleElement);
      console.log("🎉 Missav Script: 字幕元素已重新挂载");
    }
    subtitleElement.style.zIndex = "10000";
    subtitleElement.style.pointerEvents = "none";
  }

  function getCurrentVideoTime() {
    if (State.runtime.isBridgeActive && Number.isFinite(State.runtime.playerBridgeState.currentTime)) {
      return State.runtime.playerBridgeState.currentTime;
    }
    return State.runtime.videoElement?.currentTime ?? 0;
  }

  function updateSubtitle() {
    ensureSubtitleElementAttached();
    if (!subtitleElement) return;
    const primarySubs = State.runtime.subtitles || [];
    const secondarySubs = State.runtime.secondarySubtitles || [];
    if (!primarySubs.length && !secondarySubs.length) {
      setSubtitleText("");
      return;
    }
    try {
      const currentTime = getCurrentVideoTime();
      if (!Number.isFinite(currentTime)) {
        setSubtitleText("");
        return;
      }
      let primaryText = "";
      if (primarySubs.length) {
        if (State.runtime.currentSubIndex === -1 ||
            currentTime < (primarySubs[State.runtime.currentSubIndex]?.start ?? 0) ||
            currentTime > (primarySubs[State.runtime.currentSubIndex]?.end ?? 0)) {
          State.runtime.currentSubIndex = primarySubs.findIndex(sub =>
            currentTime >= sub.start && currentTime <= sub.end
          );
        }
        const currentSub = State.runtime.currentSubIndex !== -1 ? primarySubs[State.runtime.currentSubIndex] : null;
        primaryText = currentSub ? currentSub.text : "";
      }
      let secondaryText = "";
      if (secondarySubs.length) {
        if (State.runtime.secondaryIndex === -1 ||
            currentTime < (secondarySubs[State.runtime.secondaryIndex]?.start ?? 0) ||
            currentTime > (secondarySubs[State.runtime.secondaryIndex]?.end ?? 0)) {
          State.runtime.secondaryIndex = secondarySubs.findIndex(sub =>
            currentTime >= sub.start && currentTime <= sub.end
          );
        }
        const secondarySub = State.runtime.secondaryIndex !== -1 ? secondarySubs[State.runtime.secondaryIndex] : null;
        secondaryText = secondarySub ? secondarySub.text : "";
      }
      setSubtitleText(primaryText, secondaryText);
    } catch (e) {
      console.error("Error updating subtitle:", e);
    }
  }

  /**
   * Creates and appends the main control panel to the page.
   */
  function createControlPanel() {
    if (document.querySelector(".custom-control-panel")) return;

    controlPanel = document.createElement("div");
    controlPanel.className = "custom-control-panel";

    const createInputGroup = (labelText, inputType, value, onInputHandler, keyName, options = {}) => {
      const group = document.createElement("div");
      group.className = "input-group";
      const label = document.createElement("label");
      label.textContent = labelText;
      const input = document.createElement("input");
      input.type = inputType;
      input.value = value;
      input.setAttribute("data-key-name", keyName);
      if (inputType === "number") {
        input.min = options.min ?? "";
        input.max = options.max ?? "";
        input.step = options.step ?? "any";
      }
      input.oninput = onInputHandler;
      group.append(label, input);
      return group;
    };

    const createButton = (text, onClickHandler) => {
      const button = document.createElement("button");
      button.textContent = text;
      button.onclick = onClickHandler;
      return button;
    };

    // --- Tab bar ---
    const tabs = document.createElement("div");
    tabs.className = "panel-tabs";
    const pages = {};
    const switchTab = (name) => {
      Object.entries(pages).forEach(([key, page]) => {
        page.classList.toggle("active", key === name);
      });
      tabs.querySelectorAll("button[data-tab]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === name);
      });
      positionControlPanel();
    };
    [["play", "播放"], ["subtitle", "字幕"], ["player", "播放器"]].forEach(([key, label]) => {
      const tabButton = createButton(label, () => switchTab(key));
      tabButton.dataset.tab = key;
      tabs.appendChild(tabButton);
    });
    const collapseButton = createButton("×", hideControlPanel);
    collapseButton.title = "收起面板";
    tabs.appendChild(collapseButton);

    const playPage = document.createElement("div");
    playPage.className = "panel-page active";
    const subtitlePage = document.createElement("div");
    subtitlePage.className = "panel-page";
    const playerPage = document.createElement("div");
    playerPage.className = "panel-page";
    pages.play = playPage;
    pages.subtitle = subtitlePage;
    pages.player = playerPage;

    controlPanel.append(tabs, playPage, subtitlePage, playerPage);
    document.body.appendChild(controlPanel);

    // --- 播放页 ---
    playPage.append(
      createInputGroup("加速键", "text", State.config.shortcutKeys.accelerate, (e) => {
        State.config.shortcutKeys.accelerate = e.target.value.toLowerCase();
      }, "accelerate"),
      createInputGroup("快进键", "text", State.config.shortcutKeys.forward, (e) => {
        State.config.shortcutKeys.forward = e.target.value.toLowerCase();
      }, "forward"),
      createInputGroup("倒退键", "text", State.config.shortcutKeys.backward, (e) => {
        State.config.shortcutKeys.backward = e.target.value.toLowerCase();
      }, "backward"),
      createInputGroup("加速倍率", "number", State.config.accelerationRate, (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) State.config.accelerationRate = val;
      }, "accelerationRate", { min: 0.1, step: 0.1 }),
      createInputGroup("步进秒数", "number", State.config.skipTime, (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) State.config.skipTime = val;
      }, "skipTime", { min: 0.1, step: 0.1 }),
    );
    const playHint = document.createElement("div");
    playHint.className = "drop-hint";
    playHint.textContent = "按住加速键变速 · ,/. 微调 0.5 秒 · Shift+,/. 微调 0.1 秒 · T 校准 · 0 归零";
    playPage.appendChild(playHint);

    // --- 字幕页 ---
    const subtitleInput = document.createElement("input");
    subtitleInput.type = "file";
    subtitleInput.accept = ".srt,.vtt";
    subtitleInput.style.display = "none";
    subtitleInput.onchange = handleLocalSubtitleFile;

    const secondaryInput = document.createElement("input");
    secondaryInput.type = "file";
    secondaryInput.accept = ".srt,.vtt";
    secondaryInput.style.display = "none";
    secondaryInput.onchange = handleSecondarySubtitleFile;

    subtitlePage.append(
      createInputGroup("字幕偏移", "number", State.config.subtitleOffset, (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) applySubtitleOffset(val);
      }, "subtitleOffset", { step: 0.1 }),
      createInputGroup("字幕位置", "number", State.config.subtitleVerticalPositionPercent, (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          State.config.subtitleVerticalPositionPercent = val;
          updateSubtitlePositionStyle(State.config.subtitleVerticalPositionPercent);
        }
      }, "subtitlePosition", { min: 0, max: 90, step: 1 }),
      createInputGroup("字幕字体大小", "number", State.config.subtitleFontSize, (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) {
          State.config.subtitleFontSize = val;
          updateSubtitleStyle();
        }
      }, "subtitleFontSize", { min: 10, max: 60, step: 1 }),
      createInputGroup("字幕颜色", "color", State.config.subtitleColor, (e) => {
        State.config.subtitleColor = e.target.value;
        updateSubtitleStyle();
      }, "subtitleColor"),
      createInputGroup("边框颜色", "color", State.config.subtitleOutlineColor, (e) => {
        State.config.subtitleOutlineColor = e.target.value;
        updateSubtitleStyle();
      }, "subtitleOutlineColor"),
      createInputGroup("边框宽度", "number", parseFloat(State.config.subtitleOutlineWidth), (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 0) {
          State.config.subtitleOutlineWidth = `${val}px`;
          updateSubtitleStyle();
        }
      }, "subtitleOutlineWidth", { min: 0, max: 5, step: 0.5 }),
      createInputGroup("背景颜色", "color", State.config.subtitleBackgroundColor.replace(/[^0-9a-fA-F#]/g, ""), (e) => {
        const rgbaMatch = State.config.subtitleBackgroundColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);
        if (rgbaMatch) {
          const alpha = rgbaMatch[4];
          const hex = e.target.value;
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          State.config.subtitleBackgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else {
          State.config.subtitleBackgroundColor = e.target.value;
        }
        updateSubtitleStyle();
      }, "subtitleBackgroundColor"),
    );

    const presetGroup = document.createElement("div");
    presetGroup.className = "preset-group";
    [["cinema", "影院"], ["contrast", "高对比"], ["large", "大字幕"]].forEach(([key, label]) => {
      presetGroup.appendChild(createButton(label, () => applySubtitlePreset(key)));
    });
    subtitlePage.appendChild(presetGroup);

    const urlLoadGroup = document.createElement("div");
    urlLoadGroup.className = "url-load-group";
    const urlLabel = document.createElement("label");
    urlLabel.textContent = "字幕直链 (.srt / .vtt)";
    const urlInput = document.createElement("input");
    urlInput.type = "text";
    urlInput.placeholder = "粘贴 Subtitlecat / OpenSubtitles 下载直链…";
    urlInput.setAttribute("data-key-name", "subtitleUrl");
    const urlLoadButton = createButton("加载链接", () => {
      loadSubtitleFromUrl(urlInput.value, urlLoadButton);
    });
    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadSubtitleFromUrl(urlInput.value, urlLoadButton);
      }
    });
    urlLoadGroup.append(urlLabel, urlInput, urlLoadButton);
    subtitlePage.appendChild(urlLoadGroup);

    const subtitleButtons = document.createElement("div");
    subtitleButtons.className = "button-group";
    subtitleButtons.append(
      createButton("本地字幕", () => subtitleInput.click()),
      createButton("在线搜索", searchSubtitleOnline2),
      createButton("多源搜索", showSubtitleSearchSources),
      createButton("自动匹配", autoMatchSubtitle),
      createButton("辅字幕文件", () => secondaryInput.click()),
      createButton("辅轨链接", () => loadSecondaryFromUrl(urlInput.value)),
      createButton("清空辅轨", clearSecondarySubtitles),
      createButton("清空字幕", clearSubtitles),
      createButton("🔄 刷新显示", () => {
        ensureSubtitleElementAttached();
        State.runtime.currentSubIndex = -1;
        State.runtime.secondaryIndex = -1;
        updateSubtitle();
        showToast("字幕显示已强制刷新 ✅");
      }),
    );
    subtitlePage.append(subtitleButtons, subtitleInput, secondaryInput);

    // --- 播放器页 ---
    const playerButtons = document.createElement("div");
    playerButtons.className = "button-group";
    playerButtons.append(
      createButton("🖥 宽屏模式", toggleWideScreen),
      createButton("📺 宽屏+画中画", enterWideAndPiP),
      createButton("↩ 恢复原始大小", restoreOriginalSize),
      createButton("保存设置", saveSettings),
      createButton("清除字幕记忆", clearSubtitleMemory),
    );
    playerPage.appendChild(playerButtons);
    const playerHint = document.createElement("div");
    playerHint.className = "drop-hint";
    playerHint.textContent = "W 宽屏 · P 画中画 · 把 .srt/.vtt 文件拖到页面即可加载";
    playerPage.appendChild(playerHint);

    switchTab("play");
  }

  function createShowControlsButton() {
    if (showControlsButton) return;
    showControlsButton = document.createElement("button");
    showControlsButton.className = "show-controls-button";
    showControlsButton.textContent = "字幕";
    showControlsButton.style.display = "flex";
    showControlsButton.addEventListener("pointerdown", handleFloatingButtonPointerDown);
    showControlsButton.addEventListener("click", handleFloatingButtonClick);
    document.body.appendChild(showControlsButton);
    applyFloatingButtonPosition();
  }

  function hideControlPanel() {
    if (controlPanel) controlPanel.style.display = "none";
    if (showControlsButton) showControlsButton.style.display = "flex";
    if (subtitleList) subtitleList.style.display = "none";
  }

  function showControlPanel() {
    if (controlPanel) controlPanel.style.display = "block";
    positionControlPanel();
    if (showControlsButton) showControlsButton.style.display = "none";
    if (subtitleList) {
      subtitleList.style.display = "block";
      positionSubtitleList();
    }
  }

  function setupSubtitleDisplay() {
    subtitleElement = document.createElement("div");
    subtitleElement.className = "custom-subtitle";
    subtitleElement.style.display = "none";
    updateSubtitlePositionStyle(State.config.subtitleVerticalPositionPercent);
    updateSubtitleStyle();

    const waitForContainer = setInterval(() => {
      videoContainer = findVideoContainer();
      if (videoContainer) {
        clearInterval(waitForContainer);
        if (getComputedStyle(videoContainer).position === "static") {
          videoContainer.style.position = "relative";
        }
        videoContainer.appendChild(subtitleElement);
        lastVideoContainer = videoContainer;
      } else {
        console.warn("Missav Script: Video container not found yet.");
      }
    }, 500);

    setTimeout(() => {
      if (!videoContainer) {
        clearInterval(waitForContainer);
        console.error("Missav Script: Failed to find video container after 10 seconds.");
        showToast("错误：无法找到视频容器挂载字幕", 5000);
      }
    }, 10000);
  }

  /** 统一应用字幕偏移：面板输入框、微调快捷键、同步校准共用 */
  async function applySubtitleOffset(offset) {
    if (!Number.isFinite(offset)) return;
    const next = Math.round(offset * 10) / 10;
    if (next === State.config.subtitleOffset) return;
    State.config.subtitleOffset = next;
    if (State.runtime.subtitleOffsetApplying) return;
    State.runtime.subtitleOffsetApplying = true;
    try {
      if (State.runtime.originalSubtitleText) {
        State.runtime.subtitles = await parseSRT(State.runtime.originalSubtitleText);
      }
      if (State.runtime.secondarySubtitleText) {
        State.runtime.secondarySubtitles = await parseSRT(State.runtime.secondarySubtitleText);
      }
      State.runtime.currentSubIndex = -1;
      State.runtime.secondaryIndex = -1;
      clearSubtitleTrack();
      updateSubtitle();
      syncPanelInput("subtitleOffset", next);
    } catch (error) {
      showToast(`应用字幕偏移失败: ${error.message}`);
    } finally {
      State.runtime.subtitleOffsetApplying = false;
    }
  }

  /** 把当前正在显示的字幕对齐到播放头位置 */
  function calibrateSubtitle() {
    if (!State.runtime.videoElement || !State.runtime.subtitles.length) {
      showToast("没有可校准的字幕");
      return;
    }
    const index = State.runtime.currentSubIndex;
    if (index < 0 || !State.runtime.subtitles[index]) {
      showToast("请先定位到一条字幕，再按 T 校准");
      return;
    }
    const delta = Math.round((getCurrentVideoTime() - State.runtime.subtitles[index].start) * 10) / 10;
    if (Math.abs(delta) < 0.05) {
      showToast("当前字幕已经对齐");
      return;
    }
    applySubtitleOffset(State.config.subtitleOffset + delta);
    showToast(`已校准 ${delta > 0 ? "+" : ""}${delta.toFixed(1)} 秒`);
  }

  /** 统一的“字幕文本 -> 当前视频”应用逻辑，本地文件 / 在线列表 / 粘贴直链共用 */
  async function applySubtitleText(text) {
    State.runtime.originalSubtitleText = text;
    State.runtime.subtitles = await parseSRT(text);
    State.runtime.currentSubIndex = -1;
    clearSubtitleTrack();
    ensureSubtitleElementAttached();
    updateSubtitle();
    setTimeout(() => {
      ensureSubtitleElementAttached();
      State.runtime.currentSubIndex = -1;
      updateSubtitle();
    }, 180);
    if (subtitleList) closeSubtitleList();
  }

  async function applySecondarySubtitleText(text) {
    State.runtime.secondarySubtitleText = text;
    State.runtime.secondarySubtitles = await parseSRT(text);
    State.runtime.secondaryIndex = -1;
    updateSubtitle();
  }

  async function handleSecondarySubtitleFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = null;
    try {
      await applySecondarySubtitleText(await file.text());
      showToast("✅ 辅字幕加载成功");
    } catch (error) {
      console.error("Secondary subtitle load error:", error);
      showToast(`辅字幕加载失败: ${error.message}`);
    }
  }

  function clearSecondarySubtitles() {
    State.runtime.secondarySubtitleText = "";
    State.runtime.secondarySubtitles = [];
    State.runtime.secondaryIndex = -1;
    updateSubtitle();
    showToast("辅字幕已清除", 1500);
  }

  async function downloadSubtitleText(url) {
    let origin = "";
    try { origin = `${new URL(url).origin}/`; } catch (error) {}
    const response = await gmRequest({
      method: "GET",
      url,
      headers: {
        Accept: "text/plain,application/x-subrip,*/*",
        "User-Agent": navigator.userAgent,
        ...(origin ? { Referer: origin } : {}),
        "Cache-Control": "no-cache",
      },
      responseType: "arraybuffer",
      timeout: 25000,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`下载失败 (HTTP ${response.status})`);
    }
    const text = decodeSubtitleBuffer(response);
    if (!text || !text.trim()) {
      throw new Error("字幕内容为空");
    }
    if (!looksLikeSubtitle(text)) {
      throw new Error("内容不是有效的 SRT/VTT 字幕，请确认复制的是文件直链");
    }
    return text;
  }

  async function loadSecondaryFromUrl(rawUrl) {
    const url = normalizeSubtitleUrl(rawUrl);
    if (!url) {
      showToast("请先在输入框粘贴有效的字幕直链");
      return;
    }
    showToast("正在下载辅字幕…", 1800);
    try {
      const text = await downloadSubtitleText(url);
      await applySecondarySubtitleText(text);
      showToast("✅ 辅字幕链接加载成功");
    } catch (error) {
      console.error("Error loading secondary subtitle from URL:", error);
      showToast(`辅字幕加载失败：${error.message}`);
    }
  }

  async function handleLocalSubtitleFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = null;
    try {
      const text = await file.text();
      await applySubtitleText(text);
      showToast("✅ 本地字幕加载成功并显示");
    } catch (error) {
      console.error("Subtitle load error:", error);
      showToast(`本地字幕加载失败: ${error.message}`);
      clearSubtitles();
    }
  }

  const SUBTITLE_AD_PATTERN = /(?:www\.)?[\w-]+\.(?:com|net|org|cc|tv|me|info|biz)|opensubtitles|subtitlecat|subdl|addic7ed|sync\s*(?:and|&)\s*corrections|subtitles?\s*(?:by|from)|downloaded\s*from|please\s*rate|supported\s*by|advertise|仅供学习交流|字幕组出品/i;

  function isSubtitleAdLine(line) {
    const trimmed = line.trim();
    return !trimmed || SUBTITLE_AD_PATTERN.test(trimmed);
  }

  async function parseSRT(text) {
    return new Promise((resolve) => {
      const cleanText = text
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
      const srtContent = cleanText.replace(/^WEBVTT[\s\S]*?\n\n/, "");
      const subs = srtContent
        .split(/\n\n+/)
        .filter(Boolean)
        .map((block) => {
          try {
            const lines = block.split("\n").filter(line => line.trim() !== "");
            if (lines.length < 2) return null;
            let timeLineIndex = lines.findIndex(line => line.includes("-->"));
            if (timeLineIndex === -1) return null;
            const [startStr, endStr] = lines[timeLineIndex].split(/\s*-->\s*/).map(s => s.trim());
            const start = parseTime(startStr) + State.config.subtitleOffset;
            const end = parseTime(endStr) + State.config.subtitleOffset;
            const textContent = lines
              .slice(timeLineIndex + 1)
              .join("\n")
              .replace(/<[^>]*>/g, "")
              .split("\n")
              .map(line => line.trim())
              .filter(line => !isSubtitleAdLine(line))
              .join("\n")
              .trim();
            if (isNaN(start) || isNaN(end) || start < 0 || end < 0 || start > end || !textContent) return null;
            return { start, end, text: textContent };
          } catch (e) {
            console.warn("Skipping invalid SRT block:", block, e);
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.start - b.start);
      resolve(subs);
    });
  }

  function parseTime(timeStr) {
    try {
      const [hms, msPart] = timeStr.trim().split(/\s+/)[0].split(/[,.]/);
      const ms = msPart ? parseInt(msPart.padEnd(3, "0").slice(0, 3), 10) : 0;
      const [h, m, s] = hms.split(":");
      const hours = parseInt(h, 10) || 0;
      const minutes = parseInt(m, 10) || 0;
      const seconds = parseInt(s, 10) || 0;
      if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || isNaN(ms)) {
        throw new Error("Invalid time component");
      }
      return hours * 3600 + minutes * 60 + seconds + ms / 1000;
    } catch (e) {
      console.error("Failed to parse time string:", timeStr, e);
      return NaN;
    }
  }

  function initPlayer() {
    let attempts = 0;
    if (State.runtime.playerMonitorInterval) {
      clearInterval(State.runtime.playerMonitorInterval);
      State.runtime.playerMonitorInterval = null;
    }
    const checkPlayerInterval = setInterval(() => {
      attempts += 1;
      const currentVideo = findVideoElement();
      if (currentVideo && bindVideoElement(currentVideo)) {
        clearInterval(checkPlayerInterval);
        State.runtime.playerMonitorInterval = setInterval(() => {
          const refreshedVideo = findVideoElement();
          if (!refreshedVideo) return;
          if (!State.runtime.videoElement || !State.runtime.videoElement.isConnected || refreshedVideo !== State.runtime.videoElement) {
            bindVideoElement(refreshedVideo);
          }
        }, 1000);
        return;
      }
      if (attempts >= 30) {
        clearInterval(checkPlayerInterval);
        console.error("Missav Script: Failed to find HTML5 video after 15 seconds.");
        showToast("错误：无法连接到播放器实例", 5000);
      }
    }, 500);
  }

  function setupShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.target.closest && e.target.closest(".custom-control-panel input")) {
        return;
      }
      if (!State.runtime.videoElement || typeof State.runtime.videoElement.currentTime !== "number") return;
      const key = e.key.toLowerCase();
      try {
        if (key === State.config.shortcutKeys.accelerate && !State.runtime.isAccelerating) {
          State.runtime.videoElement.playbackRate = State.config.accelerationRate;
          State.runtime.isAccelerating = true;
        } else if (key === State.config.shortcutKeys.forward) {
          State.runtime.videoElement.currentTime += State.config.skipTime;
        } else if (key === State.config.shortcutKeys.backward) {
          State.runtime.videoElement.currentTime = Math.max(0, State.runtime.videoElement.currentTime - State.config.skipTime);
        } else if (key === "," || key === "." || key === "<" || key === ">") {
          const direction = (key === "," || key === "<") ? -1 : 1;
          const step = e.shiftKey ? 0.1 : 0.5;
          applySubtitleOffset(State.config.subtitleOffset + direction * step);
          showToast(`字幕偏移 ${State.config.subtitleOffset > 0 ? "+" : ""}${State.config.subtitleOffset.toFixed(1)} 秒`, 1200);
        } else if (key === "0") {
          applySubtitleOffset(0);
          showToast("字幕偏移已归零", 1200);
        } else if (key === "t") {
          calibrateSubtitle();
        } else if (key === "w") {
          toggleWideScreen();
        } else if (key === "p") {
          enterWideAndPiP();
        }
      } catch (err) {
        console.error("Shortcut error:", err);
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.key.toLowerCase() === State.config.shortcutKeys.accelerate && State.runtime.isAccelerating) {
        if (State.runtime.videoElement) {
          try {
            State.runtime.videoElement.playbackRate = 1;
          } catch (err) {
            console.error("Error resetting speed:", err);
          }
        }
        State.runtime.isAccelerating = false;
      }
    });
  }

  function showSubtitleSearchSources() {
    closeSubtitleList();
    subtitleList = document.createElement("div");
    subtitleList.className = "subtitle-list";
    const title = document.createElement("div");
    title.textContent = "选择字幕搜索源:";
    title.style.cssText = "color:#ccc; margin-bottom:8px; font-weight: bold;";
    subtitleList.appendChild(title);
    State.config.subtitleSearchSources.forEach((source) => {
      const div = document.createElement("div");
      div.className = "subtitle-item";
      div.textContent = source.name;
      div.title = `使用 ${source.name} 搜索字幕`;
      div.onclick = (e) => {
        e.stopPropagation();
        searchSubtitleBySource(source);
      };
      subtitleList.appendChild(div);
    });
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "关闭列表";
    closeBtn.style.cssText = "margin-top: 10px; padding: 4px 6px; font-size: 11px; background: #555; border: none; color: white; border-radius: 3px; cursor: pointer; display: block; margin-left: auto; margin-right: auto;";
    closeBtn.onclick = closeSubtitleList;
    subtitleList.appendChild(closeBtn);
    document.body.appendChild(subtitleList);
    positionSubtitleList();
    setTimeout(() => {
      document.addEventListener("click", handleClickOutsideList, true);
    }, 0);
  }

  async function searchSubtitleBySource(source) {
    let videoID = getSmartVideoCode();
    if (!videoID || videoID.length < 3) {
      videoID = getCurrentVideoID();
    }
    if (!videoID) {
      showToast("无法获取当前视频番号");
      return;
    }
    closeSubtitleList();
    showToast(`正在使用 ${source.name} 搜索字幕: ${videoID}...`);
    try {
      if (source.type === "external") {
        const searchUrl = source.url.replace("{query}", encodeURIComponent(videoID));
        const newWindow = window.open(searchUrl, "_blank", "noopener,noreferrer");
        if (newWindow) {
          try { newWindow.focus(); } catch (focusError) {}
          showToast(`正在打开 ${source.name} 搜索: ${videoID}`);
        } else {
          showSearchUrlToast(source.name, searchUrl);
        }
      } else if (source.type === "api") {
        const apiUrl = source.url.replace("{query}", encodeURIComponent(videoID));
        const data = await fetchSubtitleAPI(apiUrl);
        if (data?.code === 0 && data.data?.length > 0) {
          const relevantSubs = data.data.filter((item) => item.url && item.url.toLowerCase().includes(".srt"));
          if (relevantSubs.length > 0) {
            showSubtitleList(relevantSubs);
          } else {
            showToast(`(在线搜索) 未找到 ${videoID} 的SRT字幕`);
          }
        } else {
          showToast(`(在线搜索) 未找到 ${videoID} 的匹配字幕 ${data?.code ? `(Code: ${data.code})` : ""}`);
        }
      }
    } catch (error) {
      console.error(`Subtitle search error (Source: ${source.name}):`, error);
      showToast(`(在线搜索) 字幕搜索出错: ${error.message}`);
    }
  }

  async function searchSubtitleOnline2() {
    const xunleiSource = State.config.subtitleSearchSources.find((source) => source.name === "Xunlei");
    if (xunleiSource) {
      await searchSubtitleBySource(xunleiSource);
    } else {
      showToast("Xunlei 搜索源不可用");
    }
  }

  function fetchSubtitleAPI(url) {
    return gmRequest({
      method: "GET",
      url,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Cache-Control": "no-cache",
      },
      responseType: "json",
      timeout: 15000,
    }).then((response) => {
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`服务器错误 ${response.status}`);
      }
      return parseJsonResponse(response);
    });
  }

  function showSubtitleList(items) {
    closeSubtitleList();
    subtitleList = document.createElement("div");
    subtitleList.className = "subtitle-list";
    const title = document.createElement("div");
    title.textContent = "选择在线字幕:";
    title.style.cssText = "color:#ccc; margin-bottom:8px; font-weight: bold;";
    subtitleList.appendChild(title);
    if (items.length === 0) {
      const noSubs = document.createElement("div");
      noSubs.textContent = "未找到相关字幕。";
      noSubs.style.padding = "5px";
      subtitleList.appendChild(noSubs);
    } else {
      items.forEach((item) => {
        const div = document.createElement("div");
        div.className = "subtitle-item";
        div.textContent = `${item.name}${item.extra_name ? ` (${item.extra_name})` : ""}`;
        div.title = `点击加载: ${item.name}`;
        div.onclick = (e) => {
          e.stopPropagation();
          loadRemoteSubtitle(item.url);
        };
        subtitleList.appendChild(div);
      });
    }
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "关闭列表";
    closeBtn.style.cssText = "margin-top: 10px; padding: 4px 6px; font-size: 11px; background: #555; border: none; color: white; border-radius: 3px; cursor: pointer; display: block; margin-left: auto; margin-right: auto;";
    closeBtn.onclick = closeSubtitleList;
    subtitleList.appendChild(closeBtn);
    document.body.appendChild(subtitleList);
    positionSubtitleList();
    setTimeout(() => {
      document.addEventListener("click", handleClickOutsideList, true);
    }, 0);
  }

  function handleClickOutsideList(event) {
    if (subtitleList && !subtitleList.contains(event.target) && !event.target.closest(".custom-control-panel button") && !event.target.closest(".show-controls-button")) {
      closeSubtitleList();
    }
  }

  function closeSubtitleList() {
    if (subtitleList) {
      subtitleList.remove();
      subtitleList = null;
    }
    document.removeEventListener("click", handleClickOutsideList, true);
  }

  async function loadRemoteSubtitle(url) {
    showToast("正在加载在线字幕...");
    closeSubtitleList();
    try {
      const response = await gmRequest({
        method: "GET",
        url,
        headers: { Accept: "text/plain,*/*" },
        responseType: "text",
        timeout: 20000,
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`下载失败 (HTTP ${response.status})`);
      }
      const srtContent = getResponseText(response);
      if (!srtContent.trim()) {
        throw new Error("字幕内容为空");
      }
      await applySubtitleText(srtContent);
      await saveSubtitleMemoryEntry({ url, offset: State.config.subtitleOffset });
      showToast("✅ 在线字幕加载成功并显示");
    } catch (error) {
      console.error("Error loading remote subtitle:", error);
      showToast(`在线字幕加载失败: ${error.message}`);
      clearSubtitles();
    }
  }

  // ========== 粘贴字幕直链一键加载 ==========
  function normalizeSubtitleUrl(raw) {
    if (typeof raw !== "string") return "";
    let url = raw
      .trim()
      .replace(/^["'`<>\s]+|["'`>\s]+$/g, "")
      .replace(/&amp;/g, "&")
      .trim();
    if (!/^https?:\/\//i.test(url)) return "";
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
      return parsed.href;
    } catch (error) {
      return "";
    }
  }

  function decodeSubtitleBuffer(response) {
    const buffer = response?.response;
    if (buffer instanceof ArrayBuffer) {
      const bytes = new Uint8Array(buffer);
      // UTF-8 BOM
      if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        return new TextDecoder("utf-8").decode(bytes.subarray(3));
      }
      try {
        const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (!utf8.includes("\uFFFD")) return utf8;
      } catch (error) {
        // 非 UTF-8，继续尝试中文字幕常见编码
      }
      try {
        return new TextDecoder("gb18030").decode(bytes);
      } catch (error) {
        // 浏览器不支持 GB18030 时回退到 Latin-1
      }
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return binary;
    }
    return getResponseText(response);
  }

  function looksLikeSubtitle(text) {
    const timeLine = /\d{1,2}:\d{2}:\d{2}(?:[,.]\d{1,3})?\s*-->\s*\d{1,2}:\d{2}:\d{2}(?:[,.]\d{1,3})?/;
    return timeLine.test(text) || /^\s*WEBVTT\b/m.test(text);
  }

  function shortenUrl(url, max = 60) {
    return url.length <= max ? url : `${url.slice(0, max - 3)}...`;
  }

  async function loadSubtitleFromUrl(rawUrl, sourceButton = null, options = {}) {
    const url = normalizeSubtitleUrl(rawUrl);
    if (!url) {
      if (!options.restore) showToast("请输入有效的 http/https 字幕直链（不是搜索页链接）");
      return false;
    }
    closeSubtitleList();
    const originalLabel = sourceButton ? sourceButton.textContent : null;
    if (sourceButton) {
      sourceButton.disabled = true;
      sourceButton.textContent = "加载中…";
    }
    if (!options.restore) showToast(`正在下载字幕：${shortenUrl(url)}`, 2500);
    try {
      const text = await downloadSubtitleText(url);
      await applySubtitleText(text);
      const count = State.runtime.subtitles.length;
      if (count === 0) {
        throw new Error("字幕解析失败，未识别到有效时间轴");
      }
      if (!options.skipMemory) {
        await saveSubtitleMemoryEntry({ url, offset: State.config.subtitleOffset });
      }
      if (!options.restore) showToast(`✅ 链接字幕加载成功（${count} 条）`);
      return true;
    } catch (error) {
      console.error("Error loading subtitle from pasted URL:", error);
      if (!options.restore) showToast(`字幕链接加载失败：${error.message}`);
      return false;
    } finally {
      if (sourceButton) {
        sourceButton.disabled = false;
        sourceButton.textContent = originalLabel;
      }
    }
  }

  function clearSubtitles() {
    State.runtime.subtitles = [];
    State.runtime.currentSubIndex = -1;
    State.runtime.originalSubtitleText = "";
    State.runtime.secondarySubtitles = [];
    State.runtime.secondarySubtitleText = "";
    State.runtime.secondaryIndex = -1;
    clearSubtitleTrack();
    setSubtitleText("");
    showToast("字幕已清除", 1500);
  }

  function getCurrentVideoID() {
    try {
      const path = window.location.pathname;
      const segments = path.split("/").filter((s) => s.length > 0);
      if (segments.length === 0) return "";
      const lastSegment = segments[segments.length - 1];
      let idMatch = lastSegment.match(/^([a-zA-Z]{2,6})[-_]?(\d{2,5})/i);
      if (idMatch) return `${idMatch[1].toUpperCase()}-${idMatch[2]}`;
      if (segments.length >= 2) {
        const secondLastSegment = segments[segments.length - 2];
        idMatch = secondLastSegment.match(/^([a-zA-Z]{2,6})[-_]?(\d{2,5})/i);
        if (idMatch) return `${idMatch[1].toUpperCase()}-${idMatch[2]}`;
      }
      idMatch = path.match(/([a-zA-Z]{2,6})[-_]?(\d{2,5})/i);
      if (idMatch) return `${idMatch[1].toUpperCase()}-${idMatch[2]}`;
      if (lastSegment.includes("-") && lastSegment.length > 3) return lastSegment.toUpperCase();
      console.warn("Could not determine Video ID from path:", path);
      return "";
    } catch (error) {
      console.error("Error getting Video ID:", error);
      return "";
    }
  }

  function getSmartVideoCode() {
    let siteTitle = document.title;
    let searchSource = "";
    if (window.location.host.includes("netflav.com")) {
      const netflavTitle = document.querySelector("h1.video_title, .video_title");
      searchSource = netflavTitle ? netflavTitle.innerText : siteTitle;
    } else if (window.location.host.includes("spankbang.com")) {
      const sbTitle = document.querySelector("h1");
      searchSource = sbTitle ? sbTitle.innerText : siteTitle;
    } else {
      searchSource = siteTitle;
    }
    const codeRegex = /[a-zA-Z0-9]{2,10}-\d{3,}/;
    const match = searchSource.match(codeRegex);
    if (match) {
      return match[0].toUpperCase();
    }
    return searchSource.replace(/ - SpankBang/gi, "").replace(/\| Netflav/gi, "").trim();
  }

  const SUBTITLE_PRESETS = {
    cinema: {
      subtitleFontSize: 28,
      subtitleColor: "#ffffff",
      subtitleOutlineColor: "#000000",
      subtitleOutlineWidth: "2px",
      subtitleShadowColor: "rgba(0, 0, 0, 0.9)",
      subtitleShadowBlur: "5px",
      subtitleShadowOffsetX: "2px",
      subtitleShadowOffsetY: "2px",
      subtitleBackgroundColor: "rgba(0, 0, 0, 0)",
    },
    contrast: {
      subtitleFontSize: 30,
      subtitleColor: "#ffff00",
      subtitleOutlineColor: "#000000",
      subtitleOutlineWidth: "3px",
      subtitleShadowColor: "rgba(0, 0, 0, 1)",
      subtitleShadowBlur: "6px",
      subtitleShadowOffsetX: "2px",
      subtitleShadowOffsetY: "2px",
      subtitleBackgroundColor: "rgba(0, 0, 0, 0.55)",
    },
    large: {
      subtitleFontSize: 42,
      subtitleColor: "#ffffff",
      subtitleOutlineColor: "#000000",
      subtitleOutlineWidth: "3px",
      subtitleShadowColor: "rgba(0, 0, 0, 1)",
      subtitleShadowBlur: "6px",
      subtitleShadowOffsetX: "2px",
      subtitleShadowOffsetY: "2px",
      subtitleBackgroundColor: "rgba(0, 0, 0, 0.35)",
    },
  };

  function applySubtitlePreset(name) {
    const preset = SUBTITLE_PRESETS[name];
    if (!preset) return;
    Object.assign(State.config, preset);
    updateSubtitleStyle();
    syncPanelInput("subtitleFontSize", State.config.subtitleFontSize);
    syncPanelInput("subtitleColor", State.config.subtitleColor);
    syncPanelInput("subtitleOutlineColor", State.config.subtitleOutlineColor);
    syncPanelInput("subtitleOutlineWidth", parseFloat(State.config.subtitleOutlineWidth));
    syncPanelInput("subtitleBackgroundColor", State.config.subtitleBackgroundColor);
    saveSettings().catch(() => {});
    const labels = { cinema: "影院", contrast: "高对比", large: "大字幕" };
    showToast(`已应用「${labels[name] || name}」样式`);
  }

  const SUBTITLE_MEMORY_KEY = "missavSubtitleMemory";

  async function loadSubtitleMemory() {
    try {
      const raw = await StorageUtil.get(SUBTITLE_MEMORY_KEY, "{}");
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      console.warn("Missav Script: Failed to load subtitle memory.", error);
      return {};
    }
  }

  async function saveSubtitleMemoryEntry(entry) {
    const code = getSmartVideoCode() || getCurrentVideoID();
    if (!code || !entry?.url) return;
    try {
      const memory = await loadSubtitleMemory();
      memory[code] = { ...entry, savedAt: Date.now() };
      const keys = Object.keys(memory);
      if (keys.length > 200) {
        keys.sort((a, b) => (memory[a].savedAt || 0) - (memory[b].savedAt || 0));
        keys.slice(0, keys.length - 200).forEach(key => delete memory[key]);
      }
      await StorageUtil.set(SUBTITLE_MEMORY_KEY, JSON.stringify(memory));
    } catch (error) {
      console.warn("Missav Script: Failed to save subtitle memory.", error);
    }
  }

  async function clearSubtitleMemory() {
    try {
      await StorageUtil.set(SUBTITLE_MEMORY_KEY, "{}");
      showToast("字幕记忆已清除");
    } catch (error) {
      showToast(`清除记忆失败: ${error.message}`);
    }
  }

  async function tryRestoreSubtitle() {
    if (State.runtime.subtitleRestoreAttempted) return;
    State.runtime.subtitleRestoreAttempted = true;
    const code = getSmartVideoCode() || getCurrentVideoID();
    if (!code) return;
    const memory = await loadSubtitleMemory();
    const entry = memory[code];
    if (!entry?.url) return;
    if (Number.isFinite(entry.offset)) {
      State.config.subtitleOffset = entry.offset;
      syncPanelInput("subtitleOffset", entry.offset);
    }
    const ok = await loadSubtitleFromUrl(entry.url, null, { skipMemory: true, restore: true });
    if (ok) showToast(`已恢复上次字幕：${code}`);
  }

  function syncPanelInput(keyName, value) {
    if (!controlPanel) return;
    const input = controlPanel.querySelector(`input[data-key-name="${keyName}"]`);
    if (!input) return;
    if (input.type === "color" && typeof value === "string" && value.startsWith("rgba")) {
      const match = value.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const hex = (n) => Number(n).toString(16).padStart(2, "0");
        input.value = `#${hex(match[1])}${hex(match[2])}${hex(match[3])}`;
      }
      return;
    }
    if (input.type === "number" && parseFloat(input.value) === parseFloat(value)) return;
    if (input.value !== String(value)) input.value = value;
  }

  function scoreSubtitleCandidate(item, videoCode) {
    const name = `${item.name || ""} ${item.extra_name || ""}`.toLowerCase();
    const url = (item.url || "").toLowerCase();
    const code = (videoCode || "").toLowerCase();
    let score = 0;
    if (code && name.includes(code)) score += 100;
    if (/\.srt\b/.test(name) || /\.srt\b/.test(url)) score += 25;
    if (/chinese|简体|繁体|中文|chs|cht|\bzh\b|国语/i.test(name)) score += 40;
    if (/english|\ben\b/i.test(name)) score -= 15;
    if (/多语言|multi/i.test(name)) score += 10;
    return score;
  }

  async function autoMatchSubtitle() {
    const code = getSmartVideoCode() || getCurrentVideoID();
    if (!code) {
      showToast("无法获取当前视频番号，无法自动匹配");
      return;
    }
    const apiSources = State.config.subtitleSearchSources.filter(source => source.type === "api");
    if (!apiSources.length) {
      showToast("没有可用的字幕 API 搜索源");
      return;
    }
    closeSubtitleList();
    showToast(`正在自动匹配字幕：${code}`, 2500);
    for (const source of apiSources) {
      try {
        const apiUrl = source.url.replace("{query}", encodeURIComponent(code));
        const data = await fetchSubtitleAPI(apiUrl);
        const candidates = (data?.data || []).filter(item => item.url);
        if (!candidates.length) continue;
        candidates.sort((a, b) => scoreSubtitleCandidate(b, code) - scoreSubtitleCandidate(a, code));
        showToast(`已从 ${source.name} 匹配到 ${candidates.length} 条，加载最优项…`);
        await loadRemoteSubtitle(candidates[0].url);
        return;
      } catch (error) {
        console.warn(`Auto match failed for ${source.name}:`, error);
      }
    }
    showToast("自动匹配未找到可用字幕");
  }

  function setupDragAndDrop() {
    document.addEventListener("dragover", (event) => {
      if (event.dataTransfer && Array.from(event.dataTransfer.types || []).includes("Files")) {
        event.preventDefault();
      }
    }, true);
    document.addEventListener("drop", (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file || !/\.(srt|vtt)$/i.test(file.name)) return;
      event.preventDefault();
      event.stopPropagation();
      file.text().then(async (text) => {
        await applySubtitleText(text);
        showToast(`✅ 已加载拖入的字幕：${file.name}`);
      }).catch((error) => {
        console.error("Dropped subtitle load error:", error);
        showToast(`拖入字幕加载失败: ${error.message}`);
      });
    }, true);
    console.log("📥 拖放字幕加载已启用");
  }

  async function saveSettings() {
    try {
      await Promise.all([
        StorageUtil.set("missavAccelerationRate", State.config.accelerationRate.toString()),
        StorageUtil.set("missavSkipTime", State.config.skipTime.toString()),
        StorageUtil.set("missavSubtitleOffset", State.config.subtitleOffset.toString()),
        StorageUtil.set("missavSubtitlePosition", State.config.subtitleVerticalPositionPercent.toString()),
        StorageUtil.set("missavSubtitleFontSize", State.config.subtitleFontSize.toString()),
        StorageUtil.set("missavSubtitleColor", State.config.subtitleColor),
        StorageUtil.set("missavSubtitleOutlineColor", State.config.subtitleOutlineColor),
        StorageUtil.set("missavSubtitleOutlineWidth", State.config.subtitleOutlineWidth),
        StorageUtil.set("missavSubtitleShadowColor", State.config.subtitleShadowColor),
        StorageUtil.set("missavSubtitleShadowBlur", State.config.subtitleShadowBlur),
        StorageUtil.set("missavSubtitleShadowOffsetX", State.config.subtitleShadowOffsetX),
        StorageUtil.set("missavSubtitleShadowOffsetY", State.config.subtitleShadowOffsetY),
        StorageUtil.set("missavSubtitleBackgroundColor", State.config.subtitleBackgroundColor),
        StorageUtil.set("missavAccelerateKey", State.config.shortcutKeys.accelerate),
        StorageUtil.set("missavForwardKey", State.config.shortcutKeys.forward),
        StorageUtil.set("missavBackwardKey", State.config.shortcutKeys.backward),
        StorageUtil.set("missavWideScreenEnabled", State.config.wideScreenEnabled.toString()),
      ]);
      showToast("设置已保存");
    } catch (e) {
      console.error("Error saving settings:", e);
      showToast("保存设置失败");
    }
  }

  function showToast(message, duration = 3000) {
    if (State.runtime.currentToast) {
      clearTimeout(State.runtime.currentToast.timeout);
      if (State.runtime.currentToast.element.parentNode) {
        State.runtime.currentToast.element.parentNode.removeChild(State.runtime.currentToast.element);
      }
    }
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.75);
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            z-index: 10002;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            max-width: 300px;
            text-align: center;
        `;
    document.body.appendChild(toast);
    State.runtime.currentToast = { element: toast };
    setTimeout(() => { toast.style.opacity = "1"; }, 50);
    State.runtime.currentToast.timeout = setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
          State.runtime.currentToast = null;
        }
      }, 300);
    }, duration);
  }

  function showSearchUrlToast(sourceName, searchUrl) {
    if (State.runtime.currentToast) {
      clearTimeout(State.runtime.currentToast.timeout);
      if (State.runtime.currentToast.element.parentNode) {
        State.runtime.currentToast.element.parentNode.removeChild(State.runtime.currentToast.element);
      }
    }
    const toast = document.createElement("div");
    toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10002;
            font-size: 13px;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            max-width: 400px;
            text-align: left;
            line-height: 1.4;
        `;
    const message = document.createElement("div");
    message.textContent = `无法自动打开 ${sourceName} 搜索，请手动复制以下链接到浏览器：`;
    message.style.marginBottom = "8px";
    const urlContainer = document.createElement("div");
    urlContainer.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            padding: 8px 10px;
            border-radius: 4px;
            margin-bottom: 8px;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
        `;
    const urlText = document.createElement("span");
    urlText.textContent = searchUrl;
    const copyButton = document.createElement("button");
    copyButton.textContent = "复制链接";
    copyButton.style.cssText = `
            background: #4a90e2;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 11px;
            cursor: pointer;
            margin-top: 8px;
        `;
    copyButton.addEventListener("click", () => {
      navigator.clipboard.writeText(searchUrl).then(() => {
        copyButton.textContent = "已复制";
        setTimeout(() => { copyButton.textContent = "复制链接"; }, 2000);
      }).catch(err => {
        console.error("无法复制链接:", err);
        showToast("复制链接失败");
      });
    });
    urlContainer.appendChild(urlText);
    toast.appendChild(message);
    toast.appendChild(urlContainer);
    toast.appendChild(copyButton);
    document.body.appendChild(toast);
    State.runtime.currentToast = { element: toast };
    setTimeout(() => { toast.style.opacity = "1"; }, 50);
    State.runtime.currentToast.timeout = setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
          State.runtime.currentToast = null;
        }
      }, 300);
    }, 10000);
  }

  // ========== 宽屏 / 智能适配 / 画中画 ==========
  function adjustPlayerSize() {
    const container = findVideoContainer();
    if (!container) return;

    const video = findVideoElement() || container.querySelector("video");
    const isBrowserFullscreen =
      !!document.fullscreenElement ||
      !!document.webkitFullscreenElement ||
      !!document.mozFullScreenElement ||
      !!document.msFullscreenElement;

    const shouldMaximize =
      State.config.wideScreenEnabled ||
      isBrowserFullscreen ||
      window.innerWidth <= 640;

    // 智能选择 object-fit
    let objectFit = "contain";
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      const videoRatio = video.videoWidth / video.videoHeight;
      const screenRatio = window.innerWidth / window.innerHeight;
      if (videoRatio > screenRatio * 1.15) {
        objectFit = "cover"; // 视频更宽，优先减少黑边
      } else {
        objectFit = "contain";
      }
    }

    if (shouldMaximize) {
      if (!container.dataset.originalStyle) {
        container.dataset.originalStyle = container.style.cssText;
      }
      if (video && !video.dataset.originalStyle) {
        video.dataset.originalStyle = video.style.cssText;
      }

      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.width = "100vw";
      container.style.height = "100vh";
      container.style.maxWidth = "none";
      container.style.margin = "0";
      container.style.padding = "0";
      container.style.zIndex = "9998";
      container.style.background = "#000";

      if (video) {
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = objectFit;
        video.style.maxWidth = "none";
      }

      document.body.style.overflow = "hidden";
    } else {
      // 非最大化时：尽量还原（彻底版）
      if (container) {
        if (container.dataset.originalStyle) {
          container.style.cssText = container.dataset.originalStyle;
        }
        // 额外强制清除残留
        ["position","top","left","right","bottom","width","height","maxWidth","maxHeight","zIndex","background","margin","padding"].forEach(p => {
          container.style[p] = "";
        });
      }
      if (video) {
        if (video.dataset.originalStyle) {
          video.style.cssText = video.dataset.originalStyle;
        }
        video.style.width = "";
        video.style.height = "";
        video.style.objectFit = "";
        video.style.maxWidth = "";
      }
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    ensureSubtitleElementAttached();
    positionControlPanel();
    positionSubtitleList();
    updateSubtitle();
  }

  function toggleWideScreen() {
    const container = findVideoContainer();
    if (container && !container.dataset.originalStyle) {
      container.dataset.originalStyle = container.style.cssText;
    }
    const video = findVideoElement();
    if (video && !video.dataset.originalStyle) {
      video.dataset.originalStyle = video.style.cssText;
    }

    State.config.wideScreenEnabled = !State.config.wideScreenEnabled;

    // 关闭宽屏时用更强力的恢复函数
    if (!State.config.wideScreenEnabled) {
      restoreOriginalSize();
      return;
    }

    adjustPlayerSize();
    StorageUtil.set("missavWideScreenEnabled", "true").catch(() => {});
    showToast("已进入宽屏模式");
  }

  async function enterWideAndPiP() {
    const video = findVideoElement();
    if (!video) {
      showToast("未找到视频，无法进入画中画");
      return;
    }

    // 先进入宽屏
    if (!State.config.wideScreenEnabled) {
      State.config.wideScreenEnabled = true;
      const container = findVideoContainer();
      if (container && !container.dataset.originalStyle) {
        container.dataset.originalStyle = container.style.cssText;
      }
      if (!video.dataset.originalStyle) {
        video.dataset.originalStyle = video.style.cssText;
      }
      adjustPlayerSize();
      StorageUtil.set("missavWideScreenEnabled", "true").catch(() => {});
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        showToast("已退出画中画");
        return;
      }
      if (!document.pictureInPictureEnabled) {
        showToast("当前浏览器不支持画中画");
        return;
      }
      await video.requestPictureInPicture();
      showToast("已进入「宽屏 + 画中画」模式");
    } catch (err) {
      console.error(err);
      showToast("画中画失败: " + (err.message || "未知错误"));
    }
  }

  /** 强制恢复原始大小模式（退出宽屏 + 退出画中画 + 彻底清除所有强制样式） */
  async function restoreOriginalSize() {
    // 1. 退出画中画
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (e) {
        console.warn("退出画中画失败:", e);
      }
    }

    // 2. 关闭宽屏状态并持久化
    State.config.wideScreenEnabled = false;
    try {
      await StorageUtil.set("missavWideScreenEnabled", "false");
    } catch (e) {}

    // 3. 收集所有可能被修改过的容器（多层级兼容）
    const candidates = new Set();
    const mainContainer = findVideoContainer();
    if (mainContainer) candidates.add(mainContainer);

    // 常见播放器外层
    const extraSelectors = [
      ".jw-wrapper", ".jwplayer", ".plyr", ".plyr__video-wrapper",
      ".player-container", "#player-container", ".video-js",
      ".dplayer", ".dplayer-video-wrap", ".artplayer-app",
      ".video-player", ".video-img-box", ".player",
      '[class*="player"]', '[class*="video-player"]'
    ];
    extraSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => candidates.add(el));
    });

    // 4. 彻底清除固定全屏样式
    const forceClearStyles = (el) => {
      if (!el) return;
      // 优先还原保存的原始样式
      if (el.dataset && el.dataset.originalStyle) {
        el.style.cssText = el.dataset.originalStyle;
      }
      // 再强制清空所有可能残留的宽屏样式（双重保险）
      const props = [
        "position", "top", "left", "right", "bottom",
        "width", "height", "maxWidth", "maxHeight",
        "minWidth", "minHeight", "margin", "padding",
        "zIndex", "background", "backgroundColor",
        "display", "alignItems", "justifyContent",
        "transform", "inset"
      ];
      props.forEach(p => {
        el.style[p] = "";
        el.style.removeProperty(p.replace(/([A-Z])/g, "-$1").toLowerCase());
      });
    };

    candidates.forEach(forceClearStyles);

    // 5. 处理 video 元素本身
    const video = findVideoElement();
    if (video) {
      forceClearStyles(video);
      video.style.objectFit = "";
      video.style.width = "";
      video.style.height = "";
    }

    // 6. 恢复页面滚动
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.body.style.position = "";
    document.documentElement.style.position = "";

    // 7. 强制浏览器重新计算布局
    void document.body.offsetHeight;

    // 8. 触发 resize，让播放器自己重新适配
    window.dispatchEvent(new Event("resize"));
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);

    // 9. 刷新字幕和悬浮球位置
    ensureSubtitleElementAttached();
    positionControlPanel();
    positionSubtitleList();
    updateSubtitle();

    showToast("✅ 已强制恢复原始大小");
  }

  function setupInteractionListeners() {
    window.addEventListener("resize", throttle(() => {
      adjustPlayerSize();
      throttledHandleViewportChange();
    }, 32));

    const fsEvents = [
      "fullscreenchange", "webkitfullscreenchange",
      "mozfullscreenchange", "MSFullscreenChange"
    ];
    fsEvents.forEach(event => {
      document.addEventListener(event, () => {
        setTimeout(adjustPlayerSize, 80);
      });
    });

    // 监听站点自己的全屏按钮变化
    const observer = new MutationObserver(() => {
      if (document.querySelector(".plyr__fullscreen, .jw-icon-fullscreen, .vjs-fullscreen, .dplayer-full-icon")) {
        setTimeout(adjustPlayerSize, 100);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    console.log("🎛️ 智能大小适配已开启（窗口/全屏/宽屏全部实时响应）");
  }

  // --- Initialization ---
  async function initializeScript() {
    console.log("Missav Script: Initializing v1.6.0 with paste-subtitle-url / wide-screen / PiP / smart adapt / restore original / subtitle fixes...");

    await loadSettings();

    setupSubtitleDisplay();
    createControlPanel();
    createShowControlsButton();
    hideControlPanel();
    window.addEventListener("resize", throttledHandleViewportChange);
    setupPlayerBridge();
    setupShortcuts();
    initPlayer();
    setupDragAndDrop();
    setupInteractionListeners();

    // 动态监听播放器变化（彻底解决元素丢失）
    subtitleObserver = new MutationObserver(() => {
      if (findVideoContainer() !== lastVideoContainer) {
        ensureSubtitleElementAttached();
      }
    });
    subtitleObserver.observe(document.body, { childList: true, subtree: true });

    // 自动恢复上次宽屏状态
    setTimeout(() => {
      if (State.config.wideScreenEnabled) {
        const tryEnterWide = setInterval(() => {
          if (findVideoElement()) {
            clearInterval(tryEnterWide);
            adjustPlayerSize();
            showToast("已自动进入上次宽屏模式", 1800);
          }
        }, 400);
        setTimeout(() => clearInterval(tryEnterWide), 8000);
      }
    }, 1200);

    console.log("🚀 字幕助手已开启【字幕加载修复 + 宽屏 + 智能适配 + 画中画 + 恢复原始大小】完整模式");

    function cleanup() {
      if (State.runtime.playerMonitorInterval) {
        clearInterval(State.runtime.playerMonitorInterval);
        State.runtime.playerMonitorInterval = null;
      }
      if (subtitleObserver) {
        subtitleObserver.disconnect();
      }
    }
    window.addEventListener("beforeunload", cleanup);
  }

  let initStarted = false;
  const observer = new MutationObserver((mutationsList, obs) => {
    const playerElement = findVideoElement();
    if (playerElement && !initStarted) {
      console.log("Missav Script: Player element detected, running main script.");
      initStarted = true;
      obs.disconnect();
      initializeScript().catch((error) => {
        console.error("Missav Script: Initialization error:", error);
      });
    }
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
  });

  setTimeout(() => {
    if (!initStarted) {
      console.log("Missav Script: Fallback timer triggered, attempting initialization.");
      initStarted = true;
      observer.disconnect();
      initializeScript().catch((error) => {
        console.error("Missav Script: Initialization error:", error);
      });
    }
  }, 4000);
})(); // End of IIFE
