# 모바일 청첩장 — 이현준 ♥ 박상빈 (2026.10.17)

## 배포 방법 (GitHub Pages)
이 폴더의 **내용물 전체**를 저장소 루트에 올립니다.

```
저장소 루트/
├── index.html
├── styles.css
├── script.js
├── config.js        ← 이름·날짜·계좌·교통편 등 내용 수정
├── music.js
├── rsvp.js
├── firestore.rules  ← Firestore 사용 시에만 필요 (웹 표시에는 무관)
├── audio/bgm.mp3     ← 원본 그대로 (1분 11초 지점부터 무한 반복 재생)
├── fonts/
└── images/
```

Settings → Pages → Branch: `main` / 폴더: `/ (root)` 로 지정하면 됩니다.

## 내용 수정
글·이름·날짜·계좌·교통편 안내는 **config.js** 한 파일에서 고칠 수 있습니다.

## 사진 교체
| 위치 | 경로 | 비고 |
|---|---|---|
| 메인 사진 | `images/hero/1.jpg` | 1장 |
| 달력 사진 | `images/calendar/1.jpg` | 1장 |
| 갤러리 | `images/gallery/1.jpg` … `20.jpg` | 번호 순서대로 자동 인식 |
| OUR STORY 엽서 | `images/postcard/*.jpg` | 앞·뒷면 |
| INFORMATION | `images/info/dining.jpg`, `notice.jpg` | 4:3 |
| 맨하단 | `images/finale/tray.jpg` | |
| 공유 썸네일 | `images/og/1.jpg` | 카카오톡 등 |

갤러리에 사진을 추가할 때는 `21.jpg`, `22.jpg` … 로 번호를 이어서 넣으면 됩니다.
(번호가 3개 연속 비면 그 지점에서 읽기를 멈춥니다.)

## 링크 미리보기 (카카오톡)
`index.html` 상단 og 태그에 **절대주소**가 직접 적혀 있습니다.
크롤러는 JavaScript 를 실행하지 않으므로 이 값이 비어 있으면 미리보기가 나오지 않습니다.

- 미리보기 사진: `images/og/1.jpg` (900×900, WEDDING DAY 문구까지 포함)
- 가로형이 필요하면 `images/og/wide.jpg` (1200×630) 로 바꿔 쓰면 됩니다.

**주소가 바뀌면** og 태그 안의 `https://hjlovesb.github.io/1017wedding/` 를 모두 새 주소로 고쳐 주세요.

카카오톡은 링크 미리보기를 캐시합니다. 사진을 바꿨는데 옛 이미지가 계속 보이면
[카카오 디버거](https://developers.kakao.com/tool/clear/og) 에서 주소를 넣고 캐시를 초기화하세요.

## 파일을 수정한 뒤 화면이 안 바뀌면
`index.html` 안의 `?v=20260724k` 를 다른 값으로 바꿔 주세요.
브라우저가 이전 파일을 캐시해 두기 때문입니다.

## 네이버 지도
`config.js` 의 `map.naverClientId` 에 발급받은 키를 넣고,
네이버 클라우드 플랫폼 콘솔에 배포 주소를 등록해야 지도가 표시됩니다.
등록되지 않으면 구글 지도로 자동 대체됩니다.
