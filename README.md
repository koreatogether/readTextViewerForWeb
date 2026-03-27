# readTextViewer - WebView v3

이 저장소는 v3를 기준으로 동작합니다. 브라우저에서는 루트 `index.html` 을 바로 열어 사용합니다.

## 구성

- `index.html`, `main.js`, `style-enhanced.css`, `style.css` : 실행용 v3 루트 파일
- `archives/v02/` : v02 아카이브

## 주요 기능

- 스크롤 없는 페이지 뷰
- 창 크기 변경 시 현재 문서 위치 유지
- 페이지 번호 직접 입력 이동
- 마지막 읽은 위치 복원
- 검색, 북마크, 최근 파일

## CI

- GitHub Actions `CI` workflow가 push / pull request마다 실행됩니다.
- `scripts/security-scan.js`가 비밀정보, API 키, 이메일, 전화번호, 주민등록번호 패턴을 검사합니다.
- `gitleaks`가 추가로 전체 저장소를 스캔합니다.
- `scripts/validate-site.js`가 루트 배포 파일이 v3 기준인지 확인합니다.

## 실행

루트 `index.html` 을 브라우저에서 열어 사용합니다.
