# readTextViewer - WebView v2

`forWebView_01` 기반으로 재작성. CSS flex 레이아웃으로 페이지 영역 높이를 고정하고,
`clientHeight` 기준으로 실제 줄 수를 계산해 스크롤 없이 화면에 꽉 차게 텍스트를 표시합니다.

## 핵심 개선

### 스크롤 제거
- `body` → `display:flex; flex-direction:column; height:100%; overflow:hidden`
- `header` → `flex-shrink:0` (고정 높이)
- `.reader` → `flex:1 1 0; min-height:0; overflow:hidden` (남은 높이 모두 차지)
- `.page` → `overflow:hidden` (내용이 넘쳐도 스크롤 없음)
- JS `calcLinesPerPage()` 가 `pageLeft.clientHeight` 로 실제 가용 줄 수를 계산

### 파일 재선택 버그 수정
- `openFileBtn` 클릭 시 `fileInput.value = ""` 초기화 → 같은 파일을 다시 열어도 `change` 이벤트 발생

### 단면 / 양면 자동 전환
- `보기` 셀렉터: **자동 / 양면 / 단면**
- 자동 모드: 세로형 모니터(portrait) 또는 가로 폭 960px 미만이면 단면, 그 외 양면

### 인코딩 자동 감지
- UTF-8 BOM → UTF-8 → EUC-KR 순서로 시도

## 사용 방법
1. `index.html` 을 브라우저에서 엽니다.
2. `📂 파일 열기` 버튼으로 `.txt` 파일을 선택합니다.
3. 창 크기에 맞게 자동으로 줄 수를 계산해 페이지를 구성합니다.
4. 글꼴/줄간격 슬라이더로 크기를 바꾸면 즉시 재계산됩니다.
5. `보기` → `자동`: 세로 모니터는 단면, 와이드 모니터는 양면으로 자동 전환됩니다.

## 구조
- `index.html`         : UI 구조 (style-enhanced.css 단독 사용)
- `style-enhanced.css` : 테마 변수, flex 레이아웃, 반응형
- `main.js`            : 줄 수 계산, 페이지 렌더링, 검색, 북마크, 세션 저장
