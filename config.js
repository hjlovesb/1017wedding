/**
 * ============================================
 *  모바일 청첩장 설정 파일
 *  이 파일만 수정하면 청첩장이 완성됩니다.
 *
 *  이미지는 설정이 필요 없습니다.
 *  첫 인트로 사진은 images/intro/1.png 또는 1.jpg 로 넣어주세요.
 *  아래 폴더에 1.jpg, 2.jpg, ... 순서로 넣어주세요:
 *    images/hero/1.png 또는 1.jpg       — 메인 사진 (1장)
 *    images/story/1.png 또는 1.jpg ...  — 스토리 사진 (자동 감지)
 *    images/gallery/1.png 또는 1.jpg ...— 갤러리 사진 (자동 감지)
 *    images/location/1.png 또는 1.jpg   — 오시는 길 사진 (1장)
 *    images/og/1.png 또는 1.jpg         — OG 공유 썸네일 (1장)
 * ============================================
 */

const CONFIG = {
  // ── 초대장 열기 ──
  useCurtain: true,  // 초대장 열기 화면 사용 여부 (true: 사용, false: 바로 본문 표시)

  // ── 메인 (히어로) ──
  groom: {
 name: "현준",
    lastName: "이",
    fullName: "이현준",
    nameEn: "YIH HYEONJUN",
    father: "이광원",
    mother: "남미숙"

  },

  bride: {
    name: "상빈",
    lastName: "박",
    fullName: "박상빈",
    nameEn: "PARK SANGBIN",
    father: "박경순",
    mother: "김희자"
  },

  wedding: {
    date: "2026-10-17",        // YYYY-MM-DD
    time: "16:20",             // HH:MM (24시간)
    dayOfWeek: "토요일",
    venue: "나비스퀘어",
    hall: "나비홀",
    address: "충남 아산시 신동길 144-1 나비스퀘어",
    tel: "0507-1422-1183",
    mapLinks: {
      kakao: "https://map.kakao.com/link/search/%EB%82%98%EB%B9%84%EC%8A%A4%ED%80%98%EC%96%B4",
      naver: "https://map.naver.com/p/search/%EB%82%98%EB%B9%84%EC%8A%A4%ED%80%98%EC%96%B4",
      tmap: "tmap://search?name=%EB%82%98%EB%B9%84%EC%8A%A4%ED%80%98%EC%96%B4",
      tmapFallback: "https://apps.apple.com/kr/app/%ED%8B%B0%EB%A7%B5-%EC%9E%A5%EC%86%8C%EC%B6%94%EC%B2%9C-%EC%A7%80%EB%8F%84-%EC%9A%B4%EC%A0%84%EC%A0%90%EC%88%98-%EB%8C%80%EC%A4%91%EA%B5%90%ED%86%B5-%EB%8C%80%EB%A6%AC/id431589174"
    },
  },

  // ── 인사말 ──
  greeting: {
    title: "INVITATION",
    content:
      "당신이 그꽃이였으면\n아침마다 그꽃 손에들고\n사랑하지 않는날 없어라\n-  만요수  -\n\n\n서로의 하루에 피어나는 꽃이 되어\n평범한 날들을 오래 아끼며 살아가겠습니다.\n저희 두 사람이 함께하는 첫걸음의 자리에\n정중히 초대합니다",
  },

  // ── 지도 ──
  // 네이버 지도가 뜨려면 "본인 명의"의 네이버 클라우드 플랫폼 키가 필요합니다.
  //   1. https://console.ncloud.com → Services → Maps → Application 등록
  //   2. Web Dynamic Map 선택, "Web 서비스 URL"에 청첩장이 올라간 주소를 등록
  //      (예: https://본인도메인.com, http://localhost:5500 — 테스트 주소도 함께)
  //   3. 발급된 Client ID를 아래에 붙여넣기
  // 이 값이 비어 있거나 도메인이 등록되어 있지 않으면 네이버 인증이 실패하고,
  // 그 경우에만 구글 지도가 대신 표시됩니다.
  map: {
    naverClientId: "202liu94d4",
  },

  // ── 오시는 길 ──
  // (mapLinks는 wedding 객체 내에 포함)
  // 아래 transport 항목은 지도 버튼 밑에 표시되는 교통편 안내입니다.
  // items의 title/lines를 자유롭게 수정·추가·삭제하시면 됩니다.
  transport: {
    items: [
      {
        title: "고속도로 이용시",
        lines: [
          "아산현충사 IC 진출 후, 약 2KM (약 3분 소요예상)",
          "[주차장 주소]",
          "제 1주차장 : 나비스퀘어 본관 주차장",
          "제 2주차장 : 충남 아산시 모종동 965",
          "＊무료주차 시간 3시간 / 사내카페 이용시 1시간 추가",
        ],
      },
      {
        title: "천안아산역(KTX 이용시) 이용 시",
        lines: ["택시 이용(약 15분 소요) 또는 나비스퀘어 셔틀버스 이용"],
      },
      {
        title: "버스 이용시 / 아산 시외버스터미널 출발",
        lines: [
          "990, 991, 모종네오루체 A 하차 후 도보",
          "850 탑승 후 신2통입구 하차 후 도보",
        ],
      },
      {
        title: "셔틀버스 이용시",
        lines: [
          "천안아산역 하차 후, 3번 출구 → 셔틀버스 승강장에서 3번 승강장 이용",
          "＊예식시간 1시간 전부터 30분 간격으로 셔틀버스 이용 가능",
        ],
      },
    ],
    note: "＊나비스퀘어는 축하 화환 대신 쌀화환만 가능합니다.",
  },

  // ── 마음 전하실 곳 ──
  accounts: {
    groom: [
      { role: "신랑", name: "이현준", bank: "00은행", number: "000000000000000" },
      { role: "아버지", name: "이광원", bank: "00은행", number: "000000000000000" },
      { role: "어머니", name: "남미숙", bank: "00은행", number: "000000000000000" },
    ],
    bride: [
      { role: "신부", name: "박상빈", bank: "00은행", number: "234-56-7890123" },
    ],
  },

  // ── 링크 공유 시 나타나는 문구 ──
  kakaoShare: {
    // Kakao Developers 앱키 (JavaScript 키)
    appKey: "",
    title: "이현준 ♥ 박상빈 결혼합니다",
    description: "2026년 10월 17일 토요일 오후 4시 20분\n나비스퀘어",
  },

  meta: {
    title: "이현준 ♥ 박상빈 결혼합니다",
    description: "2026년 10월 17일 토요일 오후 4시 20분\n나비스퀘어",
  },
};

