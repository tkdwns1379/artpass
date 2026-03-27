/**
 * 동아방송예술대학교 DB 업데이트
 * 2026학년도 수시 모집요강 기반
 */
const Nedb = require('@seald-io/nedb');
const path = require('path');

const db = new Nedb({ filename: path.join(__dirname, '../data/universities.db'), autoload: true });

const newDepts = [
  {
    name: '동아방송예술대학교',
    department: '디지털영상디자인과',
    region: '경기',
    admissionTypes: ['수시'],
    applicationPeriod: '수시1차 2025.09.08 ~ 09.30 / 수시2차 2025.11.07 ~ 11.21',
    hasPractice: false,
    practiceSubjects: ['면접', '포트폴리오(선택)'],
    recruitCount: '수시 40명',
    suneungRatio: '없음',
    practiceRatio: '내신 20% + 면접 60% (면접전형) / 내신 100% (일반고·특성화고)',
    competitionRate: '일반고 8.36 / 특성화고 13.00 / 면접 6.60 (2025학년도)',
    note: '비실기 면접학과. 컴퓨터그래픽·영상디자인 전문가 양성. 포트폴리오 지참 가능.',
    practiceGuide: {
      overview: '방송국 CG, VFX, 포스트프로덕션 전문가를 양성하는 영상디자인 학과다. 실기 없이 면접과 포트폴리오로 평가한다.',
      examInfo: {
        time: '면접 (인성/전공적합/성장가능성)',
        paper: '해당없음',
        materials: '포트폴리오 선택 지참 가능 (수시1차)',
      },
      trends: [
        { year: '2025', topic: '전공 지원 동기 및 영상 디자인 관심도 중심 면접' },
        { year: '2024', topic: '창작 경험 및 포트폴리오 기반 면접' },
      ],
      scoring: [
        { item: '인성/면접태도', detail: '표현력, 성실성' },
        { item: '전공적합', detail: '영상·디자인 분야 이해도' },
        { item: '성장가능성', detail: '창의성, 발전 가능성' },
      ],
      strategy: [
        '본인이 만든 영상, 디자인 작업물을 포트폴리오로 준비한다.',
        '프리미어, After Effects 등 편집 툴 경험을 면접에서 어필하면 유리하다.',
        '졸업 후 진로(방송국 CG팀, 광고 포스트 프로덕션 등)를 구체적으로 말할 수 있어야 한다.',
      ],
      cautions: [
        '포트폴리오는 필수가 아니지만 지참하면 강점이 될 수 있다.',
        '디자인보다 영상 편집·VFX 방향의 학과이므로 이에 맞는 준비가 필요하다.',
      ],
    },
  },
  {
    name: '동아방송예술대학교',
    department: '무대미술과',
    region: '경기',
    admissionTypes: ['수시'],
    applicationPeriod: '수시1차 2025.09.08 ~ 09.30 / 수시2차 2025.12.05 ~ 12.07',
    hasPractice: true,
    practiceSubjects: ['연필 드로잉 (정밀묘사)'],
    recruitCount: '수시 25명 (수시1차 12명 + 수시2차 8명)',
    suneungRatio: '없음',
    practiceRatio: '내신 20% + 실기 80% (일반전형)',
    competitionRate: '일반전형 1.07 (2025학년도)',
    note: '실기학과. 정밀묘사(연필 드로잉) 180분. 방송/공연 무대 디자인 전문가 양성.',
    practiceGuide: {
      overview: '방송세트, 공연 무대 디자인을 전문으로 하는 실기학과다. 연필 정밀묘사 1종목으로 평가한다. 경쟁률이 낮아 실기 기초가 있으면 유리한 학과다.',
      examInfo: {
        time: '180분',
        paper: '켄트지 4절 (학교 제공)',
        materials: '연필, 지우개, 커터칼, 연필깎이, 검정색 볼펜 또는 싸인펜 (수험번호 기재용)',
      },
      trends: [
        { year: '2026', topic: '손잡이 있는 유리컵 사진 이미지 — 연필 정밀묘사' },
        { year: '2025', topic: '사물 정밀묘사 (연필 드로잉)' },
      ],
      scoring: [
        { item: '형태력', detail: '대상의 비례·구조 정확도' },
        { item: '명도해석', detail: '빛과 그림자의 명암 표현' },
        { item: '질감표현', detail: '유리, 금속 등 소재 질감 묘사' },
        { item: '표현력', detail: '필압·선의 다양성과 생동감' },
        { item: '완성도', detail: '전체적인 마무리 수준' },
      ],
      strategy: [
        '유리컵, 금속컵 등 반사·투명 소재 드로잉을 집중 연습한다.',
        '180분 안에 완성하는 시간 배분 연습을 반드시 한다.',
        '연필 한 자루로 다양한 명도 단계를 표현하는 훈련이 핵심이다.',
      ],
      cautions: [
        '싸인펜·볼펜은 수험번호 기재 용도로만 허용되며 드로잉에 사용 불가.',
        '완성도가 낮으면 형태력이 좋아도 감점될 수 있으니 시간 관리가 중요하다.',
      ],
    },
  },
  {
    name: '동아방송예술대학교',
    department: '영상제작과',
    region: '경기',
    admissionTypes: ['수시'],
    applicationPeriod: '수시1차 2025.09.08 ~ 09.30 / 수시2차 2025.11.07 ~ 11.21',
    hasPractice: false,
    practiceSubjects: ['면접', '포트폴리오(선택)'],
    recruitCount: '수시 73명',
    suneungRatio: '없음',
    practiceRatio: '내신 20% + 면접 60% (면접전형) / 내신 100% (일반고·특성화고)',
    competitionRate: '일반고 13.88 / 특성화고 16.50 / 면접 9.95 (2025학년도)',
    note: '비실기 면접학과. 방송·영화·광고 영상 제작 전문가 양성. 포트폴리오 지참 가능.',
    practiceGuide: {
      overview: '방송, 영화, 광고, 크리에이터 등 영상 전 분야를 다루는 대형 학과다. 면접과 포트폴리오로 평가하며, 직접 만든 영상 경험이 있으면 유리하다.',
      examInfo: {
        time: '면접 (인성/전공적합/성장가능성)',
        paper: '해당없음',
        materials: '포트폴리오 선택 지참 가능',
      },
      trends: [
        { year: '2025', topic: '자체 제작 영상 경험 및 기획 능력 중심 면접' },
        { year: '2024', topic: '지원 동기 및 영상 관심 분야 면접' },
      ],
      scoring: [
        { item: '인성/면접태도', detail: '표현력, 성실성' },
        { item: '전공적합', detail: '영상 제작 분야 이해도' },
        { item: '성장가능성', detail: '창의성, 기획력' },
      ],
      strategy: [
        '유튜브, 릴스 등 짧은 영상이라도 직접 제작해 포트폴리오로 준비한다.',
        '프리미어, 다빈치 리졸브 등 편집 툴을 익혀두면 어필 포인트가 된다.',
        '졸업 후 구체적인 진로 방향(방송PD, 촬영감독, 크리에이터 등)을 준비한다.',
      ],
      cautions: [
        '경쟁률이 높은 학과이므로 면접 준비를 철저히 해야 한다.',
        '영상 제작 경험이 전혀 없으면 불리할 수 있다.',
      ],
    },
  },
  {
    name: '동아방송예술대학교',
    department: '광고크리에이티브과',
    region: '경기',
    admissionTypes: ['수시'],
    applicationPeriod: '수시1차 2025.09.08 ~ 09.30 / 수시2차 2025.11.07 ~ 11.21',
    hasPractice: false,
    practiceSubjects: ['면접', '포트폴리오(선택)'],
    recruitCount: '수시 37명',
    suneungRatio: '없음',
    practiceRatio: '내신 20% + 면접 60% (면접전형) / 내신 100% (일반고·특성화고)',
    competitionRate: '일반고 6.40 / 특성화고 10.50 / 면접 5.00 (2025학년도)',
    note: '비실기 면접학과. 광고 기획·크리에이티브 전문가 양성. 광고회사, CM프로덕션 취업.',
    practiceGuide: {
      overview: '광고 기획과 크리에이티브 콘텐츠 제작 전문가를 양성하는 학과다. 면접으로만 평가하며 광고·브랜드에 관심 있는 학생에게 적합하다.',
      examInfo: {
        time: '면접 (인성/전공적합/성장가능성)',
        paper: '해당없음',
        materials: '포트폴리오 선택 지참 가능',
      },
      trends: [
        { year: '2025', topic: '광고·브랜드에 대한 관심도 및 아이디어 발상 능력 면접' },
        { year: '2024', topic: '좋아하는 광고 및 지원 동기 중심 면접' },
      ],
      scoring: [
        { item: '인성/면접태도', detail: '표현력, 창의적 사고' },
        { item: '전공적합', detail: '광고·마케팅 분야 이해도' },
        { item: '성장가능성', detail: '아이디어 발상력, 기획력' },
      ],
      strategy: [
        '평소 좋아하는 광고나 브랜드 캠페인을 분석하고 면접에서 이야기할 준비를 한다.',
        '직접 만든 포스터, SNS 콘텐츠 등 크리에이티브 작업물을 포트폴리오로 준비한다.',
        '광고회사 취업 후 진로 계획을 구체적으로 말할 수 있어야 한다.',
      ],
      cautions: [
        '광고와 영상 제작을 모두 배우는 학과이므로 두 분야에 대한 관심이 필요하다.',
      ],
    },
  },
  {
    name: '동아방송예술대학교',
    department: '뉴미디어콘텐츠과',
    region: '경기',
    admissionTypes: ['수시'],
    applicationPeriod: '수시1차 2025.09.08 ~ 09.30 / 수시2차 2025.11.07 ~ 11.21',
    hasPractice: false,
    practiceSubjects: ['면접', '포트폴리오(선택)'],
    recruitCount: '수시 40명',
    suneungRatio: '없음',
    practiceRatio: '내신 20% + 면접 60% (면접전형) / 내신 100% (일반고·특성화고)',
    competitionRate: '일반고 11.88 / 특성화고 8.75 / 면접 4.13 (2025학년도)',
    note: '비실기 면접학과. 미디어아트·UI/UX·웹·앱콘텐츠 전문가 양성.',
    practiceGuide: {
      overview: '미디어아트, UI/UX, 웹·앱 콘텐츠, AR/VR 등 융합형 뉴미디어 전문가를 양성한다. 디자인과 프로그래밍을 함께 배우는 학과다.',
      examInfo: {
        time: '면접 (인성/전공적합/성장가능성)',
        paper: '해당없음',
        materials: '포트폴리오 선택 지참 가능',
      },
      trends: [
        { year: '2025', topic: '뉴미디어·디지털 콘텐츠에 대한 관심 및 기획 능력 면접' },
        { year: '2024', topic: '웹/앱/디지털 콘텐츠 제작 경험 중심 면접' },
      ],
      scoring: [
        { item: '인성/면접태도', detail: '표현력, 창의적 사고' },
        { item: '전공적합', detail: 'UI/UX·미디어아트 분야 이해도' },
        { item: '성장가능성', detail: '기술과 예술의 융합 능력' },
      ],
      strategy: [
        '웹사이트, 앱 UI 디자인, 인터랙티브 콘텐츠 등 직접 만든 작업물을 준비한다.',
        'Adobe XD, Figma 등 UI/UX 툴을 익혀두면 어필 포인트가 된다.',
        'AR/VR, 미디어아트에 대한 관심을 구체적인 사례로 설명할 수 있어야 한다.',
      ],
      cautions: [
        '디자인과 코딩을 함께 배우므로 두 분야 모두에 관심이 있어야 한다.',
      ],
    },
  },
];

async function update() {
  // 기존 잘못된 동아방송예술대학교 학과 삭제
  const removed = await db.removeAsync(
    { name: '동아방송예술대학교' },
    { multi: true }
  );
  console.log(`기존 동아방송예술대학교 학과 ${removed} 개 삭제`);

  // 새 학과 삽입
  for (const dept of newDepts) {
    await db.insertAsync(dept);
    console.log(`추가: ${dept.name} - ${dept.department}`);
  }
  console.log('동아방송예술대학교 업데이트 완료!');
}

update().catch(console.error);
