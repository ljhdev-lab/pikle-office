# 별이 비서실 🏢

아이폰 홈 화면에 추가해서 쓰는, 나만의 작은 오피스 대시보드.

- 빌드 도구 없이 동작하는 순수 HTML / CSS / JS 정적 사이트
- 바깥으로 나가는 요청(폰트·스크립트·분석 도구)이 하나도 없습니다
- 기록은 브라우저 `localStorage`(`byeol-office-v1`)에만 저장됩니다

## 파일

| 파일 | 설명 |
| --- | --- |
| `index.html` | 화면 구조와 PWA 메타 태그 |
| `style.css` | 파스텔 톤 UI, 오피스맵 애니메이션 |
| `app.js` | 상태 저장, 오피스맵 SVG, 체크리스트·메모·백업 |
| `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | 앱 아이콘 |
| `manifest.json` | 웹 앱 매니페스트 |
| `tools/` | 아이콘·장면 미리보기용 개발 스크립트 (배포에는 필요 없음) |

## 로컬에서 보기

```sh
cd pickle-office
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

## GitHub Pages에 올리기

1. 이 폴더의 파일을 저장소 루트(또는 `docs/`)에 올립니다.
2. 저장소 **Settings → Pages → Build and deployment** 에서
   Source를 `Deploy from a branch`, 브랜치를 `main`, 폴더를 `/ (root)` 로 지정합니다.
3. 잠시 뒤 `https://<계정>.github.io/<저장소>/` 로 열립니다.

> 하위 경로에서도 동작하도록 모든 경로가 상대 경로로 되어 있습니다.

## 아이폰 홈 화면에 추가

Safari로 페이지를 연 뒤 **공유 → 홈 화면에 추가**.

## 데이터 옮기기

`메모·백업` 탭에서 **JSON 내보내기**로 파일을 받아 두고,
새 기기에서 **JSON 불러오기**로 그 파일을 고르면 그대로 복원됩니다.
