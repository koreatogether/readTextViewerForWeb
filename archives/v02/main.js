// readTextViewer v2
// 01 버전 기반. CSS flex 레이아웃으로 페이지 높이를 고정한 뒤
// clientHeight 로 실제 줄 수를 계산해 스크롤이 생기지 않게 합니다.
// 파일 재선택 버그 수정, 단면/양면 자동전환 포함.
"use strict";

const fileInput        = document.getElementById("fileInput");
const openFileBtn      = document.getElementById("openFileBtn");
const loadLastBtn      = document.getElementById("loadLast");
const prevBtn          = document.getElementById("prevPage");
const nextBtn          = document.getElementById("nextPage");
const pageLeft         = document.getElementById("pageLeft");
const pageRight        = document.getElementById("pageRight");
const pageContainer    = document.getElementById("pageContainer");
const pageInfo         = document.getElementById("pageInfo");
const dropZone         = document.getElementById("dropZone");
const fontSizeInput    = document.getElementById("fontSize");
const fontSizeValue    = document.getElementById("fontSizeValue");
const lineHeightInput  = document.getElementById("lineHeight");
const lineHeightValue  = document.getElementById("lineHeightValue");
const searchInput      = document.getElementById("searchInput");
const searchPrev       = document.getElementById("searchPrev");
const searchNext       = document.getElementById("searchNext");
const searchInfo       = document.getElementById("searchInfo");
const bookmarkName     = document.getElementById("bookmarkName");
const addBookmark      = document.getElementById("addBookmark");
const bookmarkList     = document.getElementById("bookmarkList");
const removeBookmark   = document.getElementById("removeBookmark");
const layoutModeSelect = document.getElementById("layoutMode");
const themeSelect      = document.getElementById("themeSelect");

const STORAGE_KEY      = "readTextViewer2";
const STORAGE_TEXT_KEY = "readTextViewer2.text";   // rawText 를 별도 키에 저장
const RECENT_FILES_KEY = "readTextViewer2_Recent";

let rawText         = "";
let currentFileName = "";
let lines           = [];
let pageIndex       = 0;
let linesPerPage    = 30;
let currentTheme    = "white";
let layoutPref      = "auto";   // "auto" | "single" | "double"
let searchPhrase    = "";
let searchResults   = [];
let searchCursor    = -1;
let resizeTimer     = null;

// ── 레이아웃 모드 ───────────────────────────────────────────

function isSinglePageMode() {
    if (layoutPref === "single") return true;
    if (layoutPref === "double") return false;
    // auto: 세로형(portrait) 뷰포트이거나 가로폭이 좁으면 단면
    return window.innerHeight > window.innerWidth || window.innerWidth < 960;
}

function applyLayoutMode() {
    pageContainer.classList.toggle("single-mode", isSinglePageMode());
}

// ── 줄 수 계산 ──────────────────────────────────────────────
// CSS가 .page 높이를 고정했으므로 clientHeight 로 정확히 계산합니다.

function calcLinesPerPage() {
    const style   = window.getComputedStyle(pageLeft);
    const lhPx    = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
    const padTop  = parseFloat(style.paddingTop)    || 0;
    const padBot  = parseFloat(style.paddingBottom) || 0;
    const avail   = pageLeft.clientHeight - padTop - padBot;
    return Math.max(5, Math.floor(avail / lhPx));
}

function updateLayout() {
    applyLayoutMode();
    linesPerPage = calcLinesPerPage();
    recalcSearch();
    renderCurrentPage();
}

// ── HTML 이스케이프 ─────────────────────────────────────────

function escapeHtml(str) {
    return str.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ── 총 페이지 수 ────────────────────────────────────────────

function getTotalPages() {
    const linesPerSpread = linesPerPage * (isSinglePageMode() ? 1 : 2);
    return Math.max(1, Math.ceil(lines.length / linesPerSpread));
}

// ── 텍스트 렌더 (검색어 하이라이트 포함) ─────────────────────

function renderLines(arr) {
    const html = escapeHtml(arr.join("\n"));
    const term = searchPhrase.trim();
    if (!term) return html.replace(/\n/g, "<br>");
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return html.replace(re, m => `<mark>${m}</mark>`).replace(/\n/g, "<br>");
}

function updatePageInfo() {
    const mode = isSinglePageMode() ? "단면" : "양면";
    pageInfo.textContent = `${mode} · ${pageIndex + 1} / ${getTotalPages()}`;
}

function renderCurrentPage() {
    if (!lines.length) {
        pageLeft.innerHTML  = '<span style="color:var(--muted)">파일을 열어 읽기 시작하세요.</span>';
        pageRight.innerHTML = "";
        updatePageInfo();
        return;
    }

    const single           = isSinglePageMode();
    const linesPerSpread   = linesPerPage * (single ? 1 : 2);
    const start            = pageIndex * linesPerSpread;

    pageLeft.innerHTML = renderLines(lines.slice(start, start + linesPerPage));

    if (!single) {
        pageRight.innerHTML = renderLines(
            lines.slice(start + linesPerPage, start + linesPerPage * 2)
        );
    } else {
        pageRight.innerHTML = "";
    }

    updatePageInfo();
    updateSearchInfo();
    saveState();
}

function gotoPage(n) {
    const max = getTotalPages() - 1;
    pageIndex = Math.max(0, Math.min(max, n));
    renderCurrentPage();
}

// ── 검색 ───────────────────────────────────────────────────

function recalcSearch() {
    searchResults = [];
    searchCursor  = -1;
    const term = searchPhrase.trim();
    if (!term || !rawText) return;

    const linesPerSpread = linesPerPage * (isSinglePageMode() ? 1 : 2);
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    lines.forEach((line, li) => {
        let m;
        while ((m = re.exec(line)) !== null) {
            searchResults.push({ page: Math.floor(li / linesPerSpread), lineIndex: li });
            if (m.index === re.lastIndex) re.lastIndex++;
        }
    });
}

function updateSearchInfo() {
    if (!searchPhrase.trim()) { searchInfo.textContent = ""; return; }
    if (!searchResults.length) { searchInfo.textContent = "없음"; return; }
    const cur = searchCursor >= 0 ? searchCursor + 1 : 0;
    searchInfo.textContent = `${cur} / ${searchResults.length}`;
}

function gotoNextSearch() {
    if (!searchResults.length) return;
    searchCursor = (searchCursor + 1) % searchResults.length;
    gotoPage(searchResults[searchCursor].page);
    updateSearchInfo();
}

function gotoPrevSearch() {
    if (!searchResults.length) return;
    searchCursor = (searchCursor - 1 + searchResults.length) % searchResults.length;
    gotoPage(searchResults[searchCursor].page);
    updateSearchInfo();
}

// ── 북마크 ─────────────────────────────────────────────────

function loadBookmarks() {
    try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}.bm`) || "[]"); }
    catch { return []; }
}

function saveBookmarks(bms) {
    localStorage.setItem(`${STORAGE_KEY}.bm`, JSON.stringify(bms));
}

function renderBookmarkList() {
    const bms = loadBookmarks();
    bookmarkList.innerHTML = '<option value="">북마크 선택</option>';
    bms.forEach((bm, i) => {
        const o = document.createElement("option");
        o.value = i;
        o.textContent = `${bm.name} (${bm.pageIndex + 1}p)`;
        bookmarkList.appendChild(o);
    });
}

function addBookmarkHandler() {
    const name = bookmarkName.value.trim() || `북마크 ${new Date().toLocaleString()}`;
    const bms  = loadBookmarks();
    bms.push({ name, pageIndex, created: Date.now() });
    saveBookmarks(bms);
    renderBookmarkList();
    bookmarkName.value = "";
}

function removeBookmarkHandler() {
    const idx = bookmarkList.selectedIndex - 1;
    if (idx < 0) return;
    const bms = loadBookmarks();
    bms.splice(idx, 1);
    saveBookmarks(bms);
    renderBookmarkList();
}

// ── 최근 파일 ──────────────────────────────────────────────

function addRecentFile(fileName, text, pi) {
    if (!fileName) return;
    try {
        let arr = JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]");
        arr = arr.filter(x => x.fileName !== fileName);
        arr.unshift({ fileName, text, pageIndex: pi, date: new Date().toISOString() });
        if (arr.length > 10) arr.length = 10;
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(arr));
    } catch {
        // 용량 초과: 텍스트 없이 메타데이터만 저장 (파일은 다시 선택해야 함)
        try {
            let arr = JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]");
            arr = arr.filter(x => x.fileName !== fileName);
            arr.unshift({ fileName, text: null, pageIndex: pi, date: new Date().toISOString() });
            if (arr.length > 10) arr.length = 10;
            localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(arr));
        } catch { /* ignore */ }
    }
    renderRecentFilesUI();
}

function renderRecentFilesUI() {
    const sel = document.getElementById("recentFilesList");
    if (!sel) return;
    const arr = JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]");
    sel.innerHTML = '<option value="">최근 항목 선택</option>';
    arr.forEach((item, i) => {
        const o = document.createElement("option");
        o.value = i;
        o.textContent = `${item.fileName} (${(item.pageIndex || 0) + 1}p)${item.text ? "" : " ⚠"}`;
        sel.appendChild(o);
    });
}

// ── 상태 저장/복원 ──────────────────────────────────────────

function saveState() {
    // rawText 를 별도 키에 저장 (큰 파일도 안전하게 처리)
    if (rawText) {
        try {
            localStorage.setItem(STORAGE_TEXT_KEY, rawText);
        } catch {
            try { localStorage.removeItem(STORAGE_TEXT_KEY); } catch { /* ignore */ }
        }
    }

    // 메타데이터 저장
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentFileName, pageIndex,
            fontSize:   fontSizeInput.value,
            lineHeight: lineHeightInput.value,
            theme:      currentTheme,
            layoutPref,
            hasText:    !!rawText
        }));
    } catch { /* ignore */ }

    // 최근 파일 목록의 페이지 번호 갱신
    if (currentFileName) {
        try {
            const arr = JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]");
            const item = arr.find(x => x.fileName === currentFileName);
            if (item) {
                item.pageIndex = pageIndex;
                localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(arr));
                renderRecentFilesUI();
            }
        } catch { /* ignore */ }
    }
}

function loadState() {
    try {
        const meta = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (!meta) return null;
        if (meta.hasText) {
            meta.rawText = localStorage.getItem(STORAGE_TEXT_KEY) || "";
        }
        return meta;
    } catch { return null; }
}

// ── 텍스트 로드 ─────────────────────────────────────────────

function setLinesFromText(text, fileName, pi) {
    rawText         = text;
    currentFileName = fileName || "";
    lines           = text.replace(/\r\n/g, "\n").split("\n");
    pageIndex       = pi || 0;
    linesPerPage    = calcLinesPerPage();   // 현재 페이지 높이로 재계산
    recalcSearch();
    renderCurrentPage();
    if (fileName) addRecentFile(fileName, text, pageIndex);
}

// ── 파일 읽기 (인코딩 자동 감지) ────────────────────────────

// 인코딩 감지 순서:
// 1. UTF-16 LE BOM (FF FE)  — Windows 10/11 메모장 기본 저장 방식
// 2. UTF-16 BE BOM (FE FF)
// 3. UTF-8 BOM  (EF BB BF)
// 4. UTF-8 strict 시도 — 실패하면 EUC-KR(CP949) 로 폴백
function decodeFileBytes(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);

    // UTF-16 LE BOM
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
        return new TextDecoder("utf-16le").decode(bytes);
    }
    // UTF-16 BE BOM
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
        return new TextDecoder("utf-16be").decode(bytes);
    }
    // UTF-8 BOM
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        return new TextDecoder("utf-8").decode(bytes);
    }
    // UTF-8 (BOM 없음, strict — 잘못된 바이트 시 예외)
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
        // UTF-8 이 아님 → EUC-KR / CP949 (한국어 Windows ANSI)
        try {
            return new TextDecoder("euc-kr", { fatal: false }).decode(bytes);
        } catch {
            return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        }
    }
}

function handleFile(file) {
    if (!file) return;
    // ★ 재선택 가능하도록 value 초기화 (같은 파일 다시 열기)
    fileInput.value = "";

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = decodeFileBytes(e.target.result);
        // 이전에 읽었던 파일이면 저장된 페이지로 바로 복원
        const savedPage = getSavedPageForFile(file.name);
        setLinesFromText(text, file.name, savedPage);
    };
    reader.readAsArrayBuffer(file);
}

// 파일명 기준으로 저장된 마지막 페이지 번호를 반환 (없으면 0)
function getSavedPageForFile(fileName) {
    try {
        // 1. 메인 상태 (마지막으로 읽던 파일)
        const meta = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (meta && meta.currentFileName === fileName && meta.pageIndex > 0) {
            return meta.pageIndex;
        }
    } catch { /* ignore */ }
    try {
        // 2. 최근 파일 목록 (다른 파일도 검색)
        const arr = JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]");
        const item = arr.find(x => x.fileName === fileName);
        if (item && item.pageIndex > 0) return item.pageIndex;
    } catch { /* ignore */ }
    return 0;
}

// ── 글꼴/줄간격 적용 ────────────────────────────────────────

function applyTextSettings() {
    const fs = parseInt(fontSizeInput.value, 10);
    const lh = parseFloat(lineHeightInput.value);

    pageLeft.style.fontSize   = `${fs}px`;
    pageRight.style.fontSize  = `${fs}px`;
    pageLeft.style.lineHeight  = String(lh);
    pageRight.style.lineHeight = String(lh);
    fontSizeValue.textContent  = String(fs);
    lineHeightValue.textContent = String(lh);

    updateLayout();
}

// ── 테마 ───────────────────────────────────────────────────

function applyTheme(theme) {
    currentTheme = theme;
    document.body.className = `theme-${theme}`;
    if (themeSelect) themeSelect.value = theme;
    // saveState() 는 renderCurrentPage() 에서 자동 호출 — 여기서는 생략
}

// ── 세션 복원 ──────────────────────────────────────────────

function loadLastSession() {
    const state = loadState();
    if (!state) return;

    // UI 설정 복원 (rawText 유무와 무관)
    fontSizeInput.value   = state.fontSize   || "18";
    lineHeightInput.value = state.lineHeight || "1.6";
    layoutPref = state.layoutPref || "auto";
    if (layoutModeSelect) layoutModeSelect.value = layoutPref;
    applyTheme(state.theme || "white");
    applyTextSettings();   // linesPerPage 계산

    const textToLoad = state.rawText || "";
    if (!textToLoad) {
        // 텍스트 없음 — 최근 파일 목록에서 선택하도록 안내
        renderBookmarkList();
        return;
    }

    currentFileName = state.currentFileName || "";
    setLinesFromText(textToLoad, currentFileName, state.pageIndex || 0);
    renderBookmarkList();
}

// ── 설정 내보내기/불러오기 ──────────────────────────────────

function exportSettings() {
    const data = JSON.stringify({
        version: "2.0",
        lastSession: loadState(),
        recentFiles: JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]"),
        bookmarks: loadBookmarks()
    }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const a   = document.createElement("a");
    a.href = url; a.download = "readTextViewer_settings.json"; a.click();
    URL.revokeObjectURL(url);
}

function importSettings(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
        try {
            const s = JSON.parse(r.result);
            if (s.lastSession) localStorage.setItem(STORAGE_KEY, JSON.stringify(s.lastSession));
            if (s.recentFiles) localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(s.recentFiles));
            if (s.bookmarks)   saveBookmarks(s.bookmarks);
            location.reload();
        } catch { /* ignore */ }
    };
    r.readAsText(file);
}

// ── 초기화 ─────────────────────────────────────────────────

function init() {
    // 파일 열기 — 버튼 클릭 → 숨김 input 트리거
    openFileBtn.addEventListener("click", () => {
        fileInput.value = "";   // 같은 파일 재선택 가능
        fileInput.click();
    });
    fileInput.addEventListener("change", e => handleFile(e.target.files?.[0]));

    // 최근/마지막 열기
    loadLastBtn.addEventListener("click", loadLastSession);

    const recentFilesList = document.getElementById("recentFilesList");
    if (recentFilesList) {
        recentFilesList.addEventListener("change", () => {
            const v = recentFilesList.value;
            if (!v) return;
            const arr  = JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]");
            const item = arr[Number(v)];
            if (item) {
                if (item.text) {
                    setLinesFromText(item.text, item.fileName, item.pageIndex || 0);
                } else {
                    alert(`"${item.fileName}" 파일이 너무 커서 저장되지 않았습니다.\n파일 열기 버튼으로 직접 선택해주세요.`);
                    recentFilesList.value = "";
                }
            }
        });
    }

    // 페이지 이동
    prevBtn.addEventListener("click", () => gotoPage(pageIndex - 1));
    nextBtn.addEventListener("click", () => gotoPage(pageIndex + 1));

    // 글꼴/줄간격
    fontSizeInput.addEventListener("input",   applyTextSettings);
    lineHeightInput.addEventListener("input", applyTextSettings);

    // 보기 모드
    if (layoutModeSelect) {
        layoutModeSelect.addEventListener("change", () => {
            layoutPref = layoutModeSelect.value;
            updateLayout();
        });
    }

    // 테마
    if (themeSelect) {
        themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
    }

    // 검색
    searchInput.addEventListener("input", () => {
        searchPhrase = searchInput.value;
        recalcSearch();
        renderCurrentPage();
    });
    searchNext.addEventListener("click", gotoNextSearch);
    searchPrev.addEventListener("click", gotoPrevSearch);

    // 북마크
    addBookmark.addEventListener("click", addBookmarkHandler);
    removeBookmark.addEventListener("click", removeBookmarkHandler);
    bookmarkList.addEventListener("change", () => {
        const v = bookmarkList.value;
        if (!v) return;
        const bms = loadBookmarks();
        const bm  = bms[Number(v)];
        if (bm) gotoPage(bm.pageIndex);
    });

    // 설정 저장/불러오기
    const exportBtn = document.getElementById("exportSettings");
    if (exportBtn) exportBtn.addEventListener("click", exportSettings);
    const importBtn     = document.getElementById("importSettingsBtn");
    const settingsInput = document.getElementById("settingsInput");
    if (importBtn && settingsInput) {
        importBtn.addEventListener("click",  () => settingsInput.click());
        settingsInput.addEventListener("change", e => importSettings(e.target.files?.[0]));
    }

    // 버튼 포커스 해제 (스페이스 중복 방지)
    document.querySelectorAll("button").forEach(b => b.addEventListener("click", () => b.blur()));

    // 키보드 이동 (페이지 위에 마우스 올려뒀을 때)
    window.addEventListener("keydown", e => {
        const onPage = pageLeft.matches(":hover") || pageRight.matches(":hover");
        if (!onPage) return;
        if      (e.key === "ArrowLeft")  gotoPage(pageIndex - 1);
        else if (e.key === "ArrowRight") gotoPage(pageIndex + 1);
        else if (e.key === " ") { e.preventDefault(); gotoPage(pageIndex + 1); }
    });

    // 드래그&드롭
    if (dropZone) {
        ["dragenter", "dragover"].forEach(ev =>
            dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add("dragging"); })
        );
        ["dragleave", "drop"].forEach(ev =>
            dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove("dragging"); })
        );
        dropZone.addEventListener("drop", e => handleFile(e.dataTransfer?.files?.[0]));
    }

    // 창 크기 변경 시 줄 수 재계산 (80ms 디바운스)
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateLayout, 80);
    });

    // ── 초기 렌더 ──
    // 마지막 세션 자동 복원 (loadLastSession 내부에서 applyTextSettings 호출)
    const state = loadState();
    if (state) {
        loadLastSession();
    } else {
        applyTextSettings();   // 저장된 상태 없을 때만 기본 설정으로 계산
    }

    renderBookmarkList();
    renderRecentFilesUI();
}

init();
