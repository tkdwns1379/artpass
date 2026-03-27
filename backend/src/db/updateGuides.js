/**
 * 가이드 없는 80개 학과에 practiceGuide 일괄 업데이트
 * node src/db/updateGuides.js
 */
const Nedb = require('@seald-io/nedb');
const path = require('path');

const db = new Nedb({ filename: path.join(__dirname, '../../data/universities.db'), autoload: true });

// ─── 공통 가이드 템플릿 ────────────────────────────────────────────────
const guides = {

  // 기초디자인
  기초디자인: {
    overview: '주어진 사물(대상)을 관찰하고 조형 요소로 재해석해 화면에 창의적으로 구성하는 시험이다. 대상의 특성을 분석하고 반복·확대·변형 등 조형 원리를 적용하는 능력이 핵심이다.',
    examInfo: { time: '4시간', paper: '4절지 켄트지', materials: '수채화 물감, 포스터컬러, 색연필 등 채색도구 (지참)' },
    trends: [
      { year: '2025', topic: '일상 사물(컵, 전구 등) 확대·반복·변형을 통한 패턴 구성' },
      { year: '2024', topic: '자연물(열매, 꽃잎) + 기하 도형 조합 표현' },
    ],
    scoring: [
      { item: '조형성', detail: '색채·형태·구성의 완성도와 화면 밸런스' },
      { item: '발상력', detail: '대상의 창의적 해석과 표현의 독창성' },
      { item: '완성도', detail: '4시간 내 화면 전체의 마감 수준' },
    ],
    strategy: ['반복·확대·축소 등 조형 원리를 활용한 구성 연습을 꾸준히 한다.', '채색 레이어를 쌓아 물감의 밀도와 광택을 높이는 훈련이 중요하다.'],
    cautions: ['단순 모사에 그치지 말고 조형적 재해석을 반드시 보여줘야 한다.'],
  },

  // 발상과표현
  발상과표현: {
    overview: '주어진 언어·개념을 시각적 이미지로 창의적으로 재해석하여 표현하는 시험이다. 아이디어 발상력과 조형 표현 능력을 종합적으로 평가한다.',
    examInfo: { time: '4시간', paper: '4절지 켄트지', materials: '수채화 물감, 포스터컬러 등 채색도구 (지참)' },
    trends: [
      { year: '2025', topic: '감정·개념어(자유, 공존 등)의 시각화' },
      { year: '2024', topic: '사회 현상·이슈를 주제로 한 시각 표현' },
    ],
    scoring: [
      { item: '발상력', detail: '주제의 독창적 해석과 아이디어의 참신함' },
      { item: '표현력', detail: '아이디어를 조형 언어로 구현하는 능력' },
      { item: '완성도', detail: '색채·구성·묘사의 전체적 수준' },
    ],
    strategy: ['다양한 주제어에 대한 아이디어 발상 훈련을 반복한다.', '아이디어 스케치 → 채색 → 마감의 시간 배분 연습이 필수다.'],
    cautions: ['표현에만 치중하지 말고 주제와 연결되는 명확한 아이디어 기반이 있어야 한다.'],
  },

  // 사고의전환
  사고의전환: {
    overview: '주어진 사물이나 재료를 본래 기능·형태와 다른 맥락으로 재해석하는 시험이다. 고정관념을 벗어난 창의적 발상이 가장 중요하다.',
    examInfo: { time: '4시간', paper: '4절지 켄트지', materials: '수채화 물감, 포스터컬러 등 채색도구 (지참)' },
    trends: [
      { year: '2025', topic: '일상 도구의 기능 전환·비기능적 재해석' },
      { year: '2024', topic: '상반된 개념의 시각적 융합 표현' },
    ],
    scoring: [
      { item: '창의성', detail: '기존 고정관념을 깬 독창적 발상' },
      { item: '설득력', detail: '아이디어와 표현 간의 논리적 연결' },
      { item: '완성도', detail: '색채와 구성의 전체적 수준' },
    ],
    strategy: ['평소 사물을 다양한 관점에서 바라보는 연습을 한다.', '아이디어 전달력을 높이는 명확한 구성을 연습한다.'],
    cautions: ['단순히 사물을 재배치하는 것이 아닌, 개념적 전환이 담긴 표현이 필요하다.'],
  },

  // 상황표현
  상황표현: {
    overview: '주어진 상황이나 장면을 회화적으로 표현하는 시험이다. 인물·배경·사물의 공간감 있는 구성과 묘사력을 평가한다.',
    examInfo: { time: '4시간', paper: '4절지 켄트지', materials: '수채화 물감, 포스터컬러 등 채색도구 (지참)' },
    trends: [
      { year: '2025', topic: '일상 생활 속 감정·분위기 표현' },
      { year: '2024', topic: '인물이 포함된 이야기 장면 구성' },
    ],
    scoring: [
      { item: '구성력', detail: '화면 내 요소들의 배치와 공간감' },
      { item: '묘사력', detail: '인물·사물의 형태와 질감 표현' },
      { item: '표현력', detail: '색채와 분위기의 회화적 완성도' },
    ],
    strategy: ['인물 드로잉과 공간 원근감 표현 연습을 병행한다.', '다양한 상황을 설정하고 빠른 구성 연습을 반복한다.'],
    cautions: ['등장 요소들이 유기적으로 연결되는 이야기가 있는 구성을 만들어야 한다.'],
  },

  // 정밀묘사
  정밀묘사: {
    overview: '대상 사물을 연필로 세밀하고 정확하게 묘사하는 시험이다. 형태의 정확성, 명암 처리, 질감 표현이 핵심이다.',
    examInfo: { time: '3시간', paper: '4절지 켄트지', materials: '연필, 지우개 (지참)' },
    trends: [
      { year: '2025', topic: '유리컵, 금속 도구 등 반사·투명 재질 대상' },
      { year: '2024', topic: '천, 나무, 금속 등 복합 재질 정물' },
    ],
    scoring: [
      { item: '형태력', detail: '대상의 형태와 비례의 정확한 재현' },
      { item: '명암 표현', detail: '빛의 방향을 고려한 입체적 명암 처리' },
      { item: '질감 표현', detail: '각 재질의 고유한 질감 묘사' },
    ],
    strategy: ['다양한 재질의 정물을 직접 보고 그리는 훈련을 꾸준히 한다.', '연필 농담 조절을 통한 부드러운 그러데이션 연습이 중요하다.'],
    cautions: ['빠른 스케치보다 정밀한 묘사가 우선이므로 시간 배분에 주의한다.'],
  },

  // 기초조형디자인 (경희대)
  기초조형디자인: {
    overview: '경희대 실기우수자전형 고유 과목으로, 주어진 조형 요소(형태·색채·질감 등)를 활용해 창의적 구성을 완성하는 시험이다. 사고력과 조형 감각을 동시에 평가한다.',
    examInfo: { time: '4시간', paper: '4절지', materials: '수채화, 포스터컬러, 아크릴 등 채색도구 (지참)' },
    trends: [
      { year: '2025', topic: '기하·자연 형태의 조형적 재구성' },
      { year: '2024', topic: '색채 대비를 활용한 리듬감 있는 화면 구성' },
    ],
    scoring: [
      { item: '조형 감각', detail: '색채·형태·구성의 조화로운 완성도' },
      { item: '발상력', detail: '주어진 조건의 창의적 해석' },
      { item: '표현력', detail: '매체 활용 능력과 완성도' },
    ],
    strategy: ['다양한 조형 원리(반복, 대비, 리듬 등)를 적용한 구성 연습을 반복한다.', '경희대 기출 경향을 분석하고 유사 조건의 연습 작품을 제작한다.'],
    cautions: ['단순한 패턴보다 조형적 깊이가 있는 구성이 유리하다.'],
  },

  // 수능100% (실기 없음)
  수능전형: {
    overview: '실기 시험 없이 수능 성적만으로 선발하는 전형이다.',
    examInfo: { time: '없음', paper: '해당 없음', materials: '해당 없음' },
    trends: [],
    scoring: [],
    strategy: ['수능 목표 등급 달성에 집중하고 수능 최저학력기준 충족 여부를 꼭 확인한다.'],
    cautions: ['모집 인원이 적은 경우가 많아 내신과 수능 점수 경쟁이 치열하다.'],
  },

  // 학생부 100% (실기 없음)
  학생부전형: {
    overview: '실기 시험 없이 학생부 성적으로 선발하는 전형이다.',
    examInfo: { time: '없음', paper: '해당 없음', materials: '해당 없음' },
    trends: [],
    scoring: [],
    strategy: ['내신 관리가 핵심이다. 지원 학과와 관련된 교과 성적을 우선 관리한다.'],
    cautions: ['수능 최저학력기준이 없더라도 내신 경쟁이 있으니 지원 전 경쟁률 확인이 필요하다.'],
  },

  // 대학원 (실기 없음)
  대학원전형: {
    overview: '석사·박사·석박사통합 과정을 모집하는 대학원 전형이다. 학부 졸업 또는 예정자를 대상으로 하며, 학업계획서·연구계획서·면접으로 선발한다.',
    examInfo: { time: '없음 (서류 및 면접)', paper: '해당 없음', materials: '해당 없음' },
    trends: [],
    scoring: [
      { item: '연구역량', detail: '학업·연구 경험과 계획의 구체성' },
      { item: '포트폴리오', detail: '관련 분야 작품 및 연구 실적 (전공별 상이)' },
    ],
    strategy: ['지도교수 연구 분야를 사전 파악하고 연구계획서를 구체적으로 작성한다.', '입학처에서 공지하는 전형 요강을 반드시 확인한다.'],
    cautions: ['모집 시기가 학부와 다르므로 대학원 모집 일정을 별도로 확인해야 한다.'],
  },

  // 포트폴리오 (경일대 게임콘텐츠 등)
  포트폴리오일반: {
    overview: '실시간 실기 시험 없이 사전에 제작한 포트폴리오를 제출하여 평가받는 전형이다. 창작물의 완성도와 다양성이 핵심이다.',
    examInfo: { time: '없음 (사전 제출)', paper: '해당 없음', materials: '출력물 또는 디지털 파일 (전형별 상이)' },
    trends: [
      { year: '2025', topic: '게임/영상/디자인 등 전공 관련 창작물 포트폴리오' },
    ],
    scoring: [
      { item: '완성도', detail: '작품의 전반적인 기술적·예술적 완성도' },
      { item: '다양성', detail: '다양한 종류와 스타일의 작품 구성' },
      { item: '전공 적합성', detail: '지원 전공과의 연관성 및 역량 표현' },
    ],
    strategy: ['지원 학과가 원하는 포트폴리오 유형(이미지/영상/기획서 등)을 미리 파악한다.', '다양한 분야의 작품을 준비하되 지원 전공에 맞게 구성한다.'],
    cautions: ['제출 규격(매수, 크기, 파일 형식)을 반드시 지켜야 한다.'],
  },

  // 인물수채화
  인물수채화: {
    overview: '인물(모델 또는 상상)을 수채화로 묘사하는 시험이다. 인체 비례, 명암, 색채 표현이 핵심 평가 요소이다.',
    examInfo: { time: '4시간', paper: '4절지 켄트지', materials: '수채화 물감, 붓, 팔레트 등 (지참)' },
    trends: [
      { year: '2025', topic: '반신상 인물 + 소품 배치 구성' },
      { year: '2024', topic: '인물의 감정·분위기가 드러나는 표현' },
    ],
    scoring: [
      { item: '인체 표현', detail: '비례·자세·형태의 정확성' },
      { item: '색채 표현', detail: '수채화 특성을 살린 색채 처리' },
      { item: '묘사력', detail: '얼굴 및 세부 표현의 완성도' },
    ],
    strategy: ['인물 드로잉과 수채화 기법을 병행 훈련한다.', '짧은 시간 내 인물 전체를 마감할 수 있도록 속도 연습이 중요하다.'],
    cautions: ['배경을 너무 단순하게 처리하면 감점될 수 있으니 화면 전체를 완성한다.'],
  },

  // 칸만화
  칸만화: {
    overview: '주어진 주제나 상황을 4컷 이상의 칸만화 형식으로 표현하는 시험이다. 스토리 구성력과 캐릭터 표현력이 핵심이다.',
    examInfo: { time: '4시간', paper: '4절지', materials: '연필, 펜, 채색도구 (지참)' },
    trends: [
      { year: '2025', topic: '일상 속 유머와 반전이 있는 이야기 구성' },
      { year: '2024', topic: '감동·공감을 주제로 한 캐릭터 중심 서사' },
    ],
    scoring: [
      { item: '스토리', detail: '기승전결이 명확한 이야기 구조' },
      { item: '캐릭터', detail: '표정·동작 표현의 생동감' },
      { item: '연출력', detail: '칸 구성과 시점의 다양한 활용' },
    ],
    strategy: ['짧은 기승전결 구조의 스토리를 빠르게 구성하는 연습을 반복한다.', '다양한 시점(클로즈업, 풀샷 등)을 활용한 칸 연출 연습을 한다.'],
    cautions: ['캐릭터 설정이 일관되어야 하고, 칸 수를 지켜야 한다.'],
  },

  // 영화시나리오/광고콘티
  영상기획: {
    overview: '영화 시나리오 또는 광고 콘티 등 영상 기획 관련 실기 시험이다. 이야기 구성력과 영상적 사고를 평가한다.',
    examInfo: { time: '7분 (조별 운영)', paper: '제공 용지', materials: '펜 (지참)' },
    trends: [
      { year: '2025', topic: '일상 소재의 단편 영화 시나리오 구성' },
      { year: '2024', topic: '제품/브랜드 광고 콘셉트 기획 및 콘티 작성' },
    ],
    scoring: [
      { item: '창의성', detail: '독창적인 스토리·아이디어 구성' },
      { item: '기획력', detail: '영상의 흐름과 구성의 완성도' },
      { item: '표현력', detail: '글과 그림으로 아이디어를 전달하는 능력' },
    ],
    strategy: ['단편 시나리오 작성 연습과 광고 콘티 제작 연습을 병행한다.', '짧은 시간 내 핵심 아이디어를 정리하는 훈련이 필요하다.'],
    cautions: ['시간이 매우 짧으므로 아이디어를 빠르게 구체화하는 연습이 중요하다.'],
  },

  // 사진촬영실기
  사진촬영: {
    overview: '주어진 주제 또는 현장에서 디지털카메라로 직접 촬영하여 작품을 완성하는 실기 시험이다. 구도·빛·색감·주제 표현력이 핵심이다.',
    examInfo: { time: '30분 (촬영)', paper: '해당 없음', materials: '디지털카메라, 메모리카드 (지참)' },
    trends: [
      { year: '2025', topic: '주어진 공간·주제를 창의적 시각으로 촬영' },
    ],
    scoring: [
      { item: '구도', detail: '피사체 배치와 화면 구성의 완성도' },
      { item: '표현력', detail: '주제와 감성을 담은 시각 표현' },
      { item: '기술력', detail: '빛·초점·노출 등 카메라 기초 기술' },
    ],
    strategy: ['다양한 환경에서 촬영 연습을 통해 순발력을 키운다.', '구도와 빛을 빠르게 파악하는 현장 감각을 훈련한다.'],
    cautions: ['촬영 후 이미지 선별 기준(7점)에 맞게 편집해 제출해야 한다.'],
  },

  // 연기실기
  연기실기: {
    overview: '지정연기, 자유연기, 즉흥상황연기 등으로 연기 표현력을 평가하는 시험이다. 감정 전달력과 순발력이 핵심이다.',
    examInfo: { time: '수시: 영상 제출 → 대면 실기', paper: '해당 없음', materials: '의상·소품 (지참 가능)' },
    trends: [
      { year: '2025', topic: '일상 감정 장면과 즉흥 상황 연기' },
    ],
    scoring: [
      { item: '감정 표현', detail: '진정성 있는 감정 전달력' },
      { item: '발성·발음', detail: '대사의 명확한 발성과 전달력' },
      { item: '즉흥성', detail: '주어진 상황에 대한 창의적 반응' },
    ],
    strategy: ['다양한 감정의 독백·대화 연기를 꾸준히 연습한다.', '즉흥 연기 대비 다양한 상황에서 반응하는 훈련을 한다.'],
    cautions: ['수시 1단계에서 영상 평가가 있으므로 영상 촬영 품질도 고려해야 한다.'],
  },

  // 자유표현 (회화)
  자유표현: {
    overview: '회화 분야에서 자신만의 방식으로 자유롭게 표현하는 시험이다. 개성 있는 조형 언어와 표현의 완성도를 평가한다.',
    examInfo: { time: '4시간', paper: '4절지', materials: '수채화, 아크릴 등 채색도구 (지참)' },
    trends: [
      { year: '2025', topic: '자연·인물·사물을 소재로 한 자유 회화 표현' },
    ],
    scoring: [
      { item: '표현력', detail: '독자적인 조형 언어와 화면 구성' },
      { item: '완성도', detail: '색채·형태·질감의 전체적 수준' },
      { item: '개성', detail: '지원자 고유의 회화적 감성' },
    ],
    strategy: ['다양한 주제와 매체로 폭넓게 실험하는 연습을 한다.', '자신만의 스타일을 찾아 일관성 있게 발전시킨다.'],
    cautions: ['자유 표현이라도 화면 완성도를 포기하면 안 된다.'],
  },

  // 기초조형 (조소)
  기초조형조소: {
    overview: '조소 분야의 기초 조형 실기 시험이다. 3차원적 형태 감각과 재료 다루는 능력을 평가한다.',
    examInfo: { time: '4시간', paper: '해당 없음', materials: '찰흙 또는 지정 재료 (지참)' },
    trends: [
      { year: '2025', topic: '인물·동물 등을 소재로 한 입체 조형' },
    ],
    scoring: [
      { item: '형태감', detail: '3차원적 비례와 구조의 완성도' },
      { item: '재료 표현', detail: '재료의 특성을 살린 조형 처리' },
      { item: '완성도', detail: '전체적인 입체 조형의 완성 수준' },
    ],
    strategy: ['다양한 재료로 입체 조형 연습을 꾸준히 한다.', '기초 형태(구체·원기둥 등)부터 시작해 복잡한 형태로 발전시킨다.'],
    cautions: ['평면 스케치와 달리 3차원 공간감을 의식하며 작업해야 한다.'],
  },

  // 뷰티포트폴리오
  뷰티포트폴리오: {
    overview: '헤어·메이크업·네일 등 뷰티 분야의 작품 포트폴리오를 제출하는 전형이다. 기술력과 창의성을 함께 평가한다.',
    examInfo: { time: '없음 (사전 제출)', paper: '이미지 출력물 8매', materials: '출력물, 수상내역, 자격증 등' },
    trends: [],
    scoring: [
      { item: '기술력', detail: '헤어·메이크업·네일의 기초 기술 완성도' },
      { item: '창의성', detail: '작품의 독창적인 컨셉과 표현' },
      { item: '다양성', detail: '분야 내 다양한 스타일의 작품 구성' },
    ],
    strategy: ['뷰티 관련 국가기술자격증 취득을 목표로 준비한다.', '대회·공모전 참가를 통해 수상 실적을 쌓으면 가산점이 된다.'],
    cautions: ['포트폴리오 8매는 본인 작품이어야 하며, 반환되지 않으므로 복사본을 보관한다.'],
  },

  // 계원예술대 실기100% (학과별 상이)
  계원실기: {
    overview: '계원예술대학교 정시 실기전형으로 실기 100% 반영이다. 학과별 실기 종목이 다르며, 모집요강을 통해 구체적인 시험 방식을 확인해야 한다.',
    examInfo: { time: '학과별 상이', paper: '학과별 상이', materials: '학과별 상이 (요강 확인)' },
    trends: [],
    scoring: [
      { item: '표현력', detail: '전공 분야의 기초 표현 능력' },
      { item: '완성도', detail: '주어진 시간 내 작품의 완성 수준' },
    ],
    strategy: ['계원예술대학교 홈페이지에서 해당 학과의 실기 종목과 평가 기준을 반드시 확인한다.', '실기 100% 전형이므로 실기 준비에 집중한다.'],
    cautions: ['학과마다 실기 종목이 다르니 반드시 모집요강을 개별 확인해야 한다.'],
  },

  // 면접100%
  면접전형: {
    overview: '실기 시험 없이 면접으로 선발하는 전형이다. 전공 관련 소양과 인성을 평가한다.',
    examInfo: { time: '면접 (시간 미정)', paper: '해당 없음', materials: '포트폴리오 지참 가능' },
    trends: [],
    scoring: [
      { item: '전공 소양', detail: '지원 분야에 대한 기본 지식과 관심' },
      { item: '의사소통', detail: '자신의 생각을 명확하게 전달하는 능력' },
    ],
    strategy: ['지원 학과와 관련된 분야를 꾸준히 학습하고 본인만의 관심사를 정리한다.', '포트폴리오가 있다면 간단하게 준비해 지참한다.'],
    cautions: ['면접 전형이라도 학과 관련 기초 지식과 자기 표현력을 충분히 준비해야 한다.'],
  },

  // 피트니스실기
  피트니스실기: {
    overview: '주짓수 기본 기술 또는 기초 체력 테스트(배근력·악력·좌전굴)로 평가하는 실기 전형이다.',
    examInfo: { time: '당일 진행', paper: '해당 없음', materials: '운동복, 도복 (지참)' },
    trends: [],
    scoring: [
      { item: '기술 수행', detail: '주짓수 기본 기술의 정확성과 완성도' },
      { item: '체력', detail: '배근력·악력·좌전굴 등 기초 체력 측정값' },
    ],
    strategy: ['주짓수 기본 기술 5개 중 2개를 당일 선정하므로 전 종목을 준비한다.', '체력 테스트 대비 꾸준한 근력·유연성 훈련을 병행한다.'],
    cautions: ['주짓수와 기초 체력 중 택1이므로 본인에게 유리한 종목을 선택한다.'],
  },
};

// ─── 학과별 가이드 매핑 ────────────────────────────────────────────────
const departmentGuides = [
  // ── 공주대학교 ──
  { name: '공주대학교', department: '주얼리·금속디자인학과', guide: guides.기초디자인 },
  { name: '공주대학교', department: '만화애니메이션학부', guide: guides.칸만화 },
  { name: '공주대학교', department: '게임디자인학과', guide: guides.발상과표현 },
  { name: '공주대학교', department: '영상학과', guide: guides.영상기획 },
  { name: '공주대학교', department: '도자문화융합디자인학과', guide: {
    overview: '도자 및 디자인 융합 분야 실기 시험으로, 기초디자인·발상과 표현·사고의 전환 중 택1하여 응시한다. 전통 도예와 현대 디자인 감성을 융합하는 역량을 평가한다.',
    examInfo: { time: '4시간', paper: '4절지 켄트지', materials: '수채화 물감, 포스터컬러 등 채색도구 (지참)' },
    trends: [
      { year: '2025', topic: '도자 형태의 조형적 재해석' },
      { year: '2024', topic: '전통 문양을 현대적으로 재구성한 디자인' },
    ],
    scoring: [
      { item: '발상력', detail: '도자·공예 분야의 창의적 아이디어' },
      { item: '표현력', detail: '선택 실기 종목의 조형적 완성도' },
      { item: '전공 적합성', detail: '도자·디자인 융합 분야에 대한 관심과 감성' },
    ],
    strategy: ['도자 및 공예 분야의 조형미를 학습하고 디자인적 관점에서 접근하는 연습을 한다.', '3가지 실기 종목 중 본인에게 유리한 종목을 선택해 집중 훈련한다.'],
    cautions: ['실기 종목 선택이 자유이므로 사전에 3가지 모두 연습해보고 결정한다.'],
  }},
  { name: '공주대학교', department: '가구리빙디자인학과', guide: guides.기초디자인 },

  // ── 강원대학교 ──
  { name: '강원대학교', department: '멀티디자인학과', guide: guides.기초디자인 },
  { name: '강원대학교', department: '생활조형디자인학과', guide: guides.기초디자인 },
  { name: '강원대학교', department: '영상문화학과', guide: guides.학생부전형 },

  // ── 광운대학교 (대학원) ──
  { name: '광운대학교', department: '산업심리학과', guide: guides.대학원전형 },
  { name: '광운대학교', department: '건축공학과', guide: guides.대학원전형 },
  { name: '광운대학교', department: '건축학과', guide: guides.대학원전형 },
  { name: '광운대학교', department: '게임학과', guide: guides.대학원전형 },
  { name: '광운대학교', department: '문화산업학과', guide: guides.대학원전형 },
  { name: '광운대학교', department: '커뮤니케이션 전략디자인학과', guide: guides.대학원전형 },

  // ── 건국대학교 글로컬캠퍼스 ──
  { name: '건국대학교 글로컬캠퍼스', department: '시각영상디자인학과', guide: guides.기초디자인 },
  { name: '건국대학교 글로컬캠퍼스', department: '패션디자인학과', guide: {
    overview: '건국대 글로컬 패션디자인학과 정시 실기 전형으로, 기초디자인·발상과표현·사고의전환 중 택1하여 응시한다. 패션에 대한 조형 감각과 창의적 표현력을 평가한다.',
    examInfo: { time: '4시간', paper: '4절지 켄트지', materials: '수채화, 포스터컬러 등 채색도구 (지참)' },
    trends: [
      { year: '2025', topic: '패션 소재·패턴의 조형적 재해석' },
    ],
    scoring: [
      { item: '조형성', detail: '패션 감각이 반영된 색채·형태 구성' },
      { item: '발상력', detail: '선택 실기 종목의 창의적 접근' },
      { item: '완성도', detail: '화면 전체의 마감 수준' },
    ],
    strategy: ['3가지 실기 종목을 모두 연습하고 본인에게 유리한 종목을 선택한다.', '수능 40%+실기 60% 반영이므로 수능 준비와 병행한다.'],
    cautions: ['정시 전형이므로 수능 성적과의 균형 있는 준비가 필요하다.'],
  }},
  { name: '건국대학교 글로컬캠퍼스', department: '조형예술학과', guide: guides.인물수채화 },
  { name: '건국대학교 글로컬캠퍼스', department: '디자인조형자유전공학부', guide: guides.기초디자인 },
  { name: '건국대학교 글로컬캠퍼스', department: '실내디자인학과', guide: guides.기초디자인 },
  { name: '건국대학교 글로컬캠퍼스', department: '산업디자인학과', guide: guides.기초디자인 },

  // ── 국민대학교 (대학원) ──
  { name: '국민대학교', department: '커뮤니케이션디자인학과', guide: guides.포트폴리오일반 },
  { name: '국민대학교', department: '혁신소재리뉴어블디자인학과', guide: guides.대학원전형 },
  { name: '국민대학교', department: '패션학과', guide: guides.포트폴리오일반 },
  { name: '국민대학교', department: '모빌리티디자인학과', guide: guides.포트폴리오일반 },
  { name: '국민대학교', department: '금속공예학과', guide: guides.포트폴리오일반 },
  { name: '국민대학교', department: '미술학과 (입체미술전공)', guide: guides.포트폴리오일반 },
  { name: '국민대학교', department: '미술학과 (인터미디어아트전공)', guide: guides.포트폴리오일반 },
  { name: '국민대학교', department: '영상·콘텐츠디자인학과', guide: guides.포트폴리오일반 },
  { name: '국민대학교', department: '미술학과 (회화전공)', guide: guides.포트폴리오일반 },
  { name: '국민대학교', department: '미술학과 (미술이론전공)', guide: guides.대학원전형 },
  { name: '국민대학교', department: '건축학과', guide: guides.대학원전형 },
  { name: '국민대학교', department: '공연영상학과', guide: guides.포트폴리오일반 },

  // ── 경희대학교 ──
  { name: '경희대학교', department: '의류디자인학과', guide: guides.기초조형디자인 },
  { name: '경희대학교', department: '시각디자인학과', guide: guides.기초조형디자인 },
  { name: '경희대학교', department: '환경조경디자인학과', guide: guides.기초조형디자인 },
  { name: '경희대학교', department: '산업디자인학과', guide: guides.기초조형디자인 },

  // ── 계원예술대학교 ──
  { name: '계원예술대학교', department: '리빙가구디자인과', guide: guides.수능전형 },
  { name: '계원예술대학교', department: '순수미술과', guide: guides.계원실기 },
  { name: '계원예술대학교', department: '영상디자인과', guide: guides.수능전형 },
  { name: '계원예술대학교', department: '실내건축디자인과', guide: guides.계원실기 },
  { name: '계원예술대학교', department: '게임미디어과', guide: guides.계원실기 },
  { name: '계원예술대학교', department: '미래디자인학부', guide: guides.계원실기 },
  { name: '계원예술대학교', department: '플라워디자인과', guide: guides.수능전형 },
  { name: '계원예술대학교', department: '디지털미디어디자인과', guide: guides.수능전형 },
  { name: '계원예술대학교', department: '광고·브랜드디자인과', guide: guides.수능전형 },
  { name: '계원예술대학교', department: '스마트프로덕트디자인과', guide: guides.수능전형 },
  { name: '계원예술대학교', department: '사진예술과', guide: guides.면접전형 },
  { name: '계원예술대학교', department: '건축디자인과', guide: guides.계원실기 },
  { name: '계원예술대학교', department: '시각디자인과', guide: guides.계원실기 },
  { name: '계원예술대학교', department: '전시콘텐츠디자인과', guide: guides.계원실기 },
  { name: '계원예술대학교', department: '융합예술과', guide: guides.수능전형 },
  { name: '계원예술대학교', department: '디지털미디어디자인과', guide: guides.수능전형 },

  // ── 대구대학교 ──
  { name: '대구대학교', department: '웹툰영상애니메이션학부 영상애니메이션전공 (포트폴리오전형)', guide: guides.포트폴리오일반 },
  { name: '대구대학교', department: '실내건축디자인학과 (예체능실기전형)', guide: guides.기초디자인 },
  { name: '대구대학교', department: '게임학과 (예체능실기전형)', guide: guides.칸만화 },
  { name: '대구대학교', department: '서비스마케팅디자인전공 (예체능실기전형)', guide: guides.기초디자인 },
  { name: '대구대학교', department: '패션디자인학과 (예체능실기전형)', guide: guides.상황표현 },
  { name: '대구대학교', department: '웹툰영상애니메이션학부 영상애니메이션전공 (예체능실기전형)', guide: guides.칸만화 },
  { name: '대구대학교', department: '산업디자인학과 (예체능실기전형)', guide: guides.기초디자인 },
  { name: '대구대학교', department: '웹툰영상애니메이션학부 웹툰전공 (예체능실기전형)', guide: guides.칸만화 },
  { name: '대구대학교', department: '시각디자인전공 (예체능실기전형)', guide: guides.기초디자인 },

  // ── 경일대학교 ──
  { name: '경일대학교', department: '게임콘텐츠학과 (실기전형)', guide: {
    overview: '게임 관련 아이디어를 시각화하는 실기 시험이다. 상황표현·이미지보드·게임포스터 중 주제가 문제은행 방식으로 공지되며, 4시간 동안 색채 작품을 완성한다.',
    examInfo: { time: '4시간', paper: '4절지', materials: '색채도구 일체 (지참)' },
    trends: [
      { year: '2025', topic: '게임 세계관을 반영한 포스터·캐릭터 이미지' },
    ],
    scoring: [
      { item: '발상력', detail: '게임 콘셉트에 맞는 창의적 아이디어' },
      { item: '표현력', detail: '색채 도구를 활용한 시각 표현 능력' },
      { item: '완성도', detail: '4시간 내 작품의 전체적 마감 수준' },
    ],
    strategy: ['홈페이지에 공지되는 주제 목록을 사전 숙지하고 다양하게 연습한다.', '게임 포스터·캐릭터 디자인 등 게임 비주얼 스타일에 익숙해진다.'],
    cautions: ['주제가 사전 공지되므로 반드시 홈페이지를 확인하고 관련 연습을 해야 한다.'],
  }},
  { name: '경일대학교', department: '게임콘텐츠학과 (포트폴리오전형)', guide: guides.포트폴리오일반 },
  { name: '경일대학교', department: '만화애니메이션학부 (실기전형)', guide: guides.칸만화 },
  { name: '경일대학교', department: '만화애니메이션학부 (포트폴리오전형)', guide: guides.포트폴리오일반 },
  { name: '경일대학교', department: '뷰티스타일학과 (포트폴리오전형)', guide: guides.뷰티포트폴리오 },
  { name: '경일대학교', department: '사진영상학부 (포트폴리오전형)', guide: guides.포트폴리오일반 },
  { name: '경일대학교', department: '사진영상학부 (실기전형)', guide: guides.사진촬영 },
  { name: '경일대학교', department: '디자인융합학부 (실기전형)', guide: guides.기초디자인 },
  { name: '경일대학교', department: '피트니스산업학부 (실기전형)', guide: guides.피트니스실기 },

  // ── 가천대학교 ──
  { name: '가천대학교', department: '시각디자인전공', guide: guides.기초디자인 },
  { name: '가천대학교', department: '게임·영상학과', guide: {
    overview: '조기취업형 계약학과 전형으로, 서류 및 면접으로 선발한다. 실기 시험이 없으며, 게임·영상 분야 취업 역량과 잠재력을 평가한다.',
    examInfo: { time: '없음 (서류+면접)', paper: '해당 없음', materials: '포트폴리오 선택 지참' },
    trends: [],
    scoring: [
      { item: '서류', detail: '학업 역량과 게임·영상 분야 관심도' },
      { item: '면접', detail: '커뮤니케이션 능력과 전공 잠재력' },
    ],
    strategy: ['게임·영상 관련 포트폴리오나 프로젝트 경험을 준비해 면접에서 어필한다.', '조기취업형 전형이므로 산업체 연계 학습에 대한 의지를 강조한다.'],
    cautions: ['계약학과이므로 졸업 후 협약 기업 취업 의무가 있을 수 있으니 전형 조건을 확인한다.'],
  }},
  { name: '가천대학교', department: '연기예술학과', guide: guides.연기실기 },
  { name: '가천대학교', department: '회화전공', guide: guides.자유표현 },
  { name: '가천대학교', department: '조소전공', guide: guides.기초조형조소 },
  { name: '가천대학교', department: '산업디자인전공', guide: guides.기초디자인 },

  // ── 광주여자대학교 ──
  { name: '광주여자대학교', department: '실내건축디자인학과', guide: guides.학생부전형 },
  { name: '광주여자대학교', department: '뷰티산업학과', guide: guides.학생부전형 },
];

// ─── 실행 ────────────────────────────────────────────────────────────
async function run() {
  let success = 0, skip = 0, fail = 0;

  for (const { name, department, guide } of departmentGuides) {
    try {
      const doc = await db.findOneAsync({ name, department });
      if (!doc) { console.log(`[SKIP] 없음: ${name} / ${department}`); skip++; continue; }
      if (doc.practiceGuide && Object.keys(doc.practiceGuide).length > 0) {
        console.log(`[SKIP] 이미 있음: ${name} / ${department}`); skip++; continue;
      }
      await db.updateAsync({ _id: doc._id }, { $set: { practiceGuide: guide } });
      console.log(`[OK] ${name} / ${department}`);
      success++;
    } catch (e) {
      console.log(`[FAIL] ${name} / ${department}: ${e.message}`);
      fail++;
    }
  }

  // 시드 파일에 있지만 가이드 없는 3개도 업데이트
  const seedNoGuide = [
    {
      name: '강원대학교', department: '디자인학과',
      guide: {
        overview: '강원대학교 춘천캠퍼스 디자인학과의 실기 전형으로, 기초디자인 또는 발상과 표현 중 택1하여 응시한다.',
        examInfo: { time: '4시간', paper: '4절지 켄트지', materials: '수채화, 포스터컬러 등 채색도구 (지참)' },
        trends: [{ year: '2025', topic: '주제는 시험 당일 추첨 선정' }],
        scoring: [
          { item: '발상력', detail: '주제의 창의적 해석' },
          { item: '조형성', detail: '색채·구성의 완성도' },
          { item: '완성도', detail: '4시간 내 마감 수준' },
        ],
        strategy: ['기초디자인과 발상과 표현 모두 준비하되 주제가 당일 추첨이므로 다양한 주제에 대비한다.'],
        cautions: ['주제가 시험 당일 추첨으로 결정되므로 특정 주제에만 치중하지 않는다.'],
      },
    },
    {
      name: '국민대학교', department: '공간디자인학과',
      guide: {
        overview: '국민대학교 공간디자인학과 입시 실기 전형이다. 수시·정시 전형에 따라 실기 방식이 다를 수 있으므로 모집요강을 확인해야 한다.',
        examInfo: { time: '4시간', paper: '4절지', materials: '수채화, 포스터컬러 등 채색도구 (지참)' },
        trends: [{ year: '2025', topic: '공간·인테리어 관련 조형 표현' }],
        scoring: [
          { item: '공간 감각', detail: '3차원 공간을 2D로 표현하는 능력' },
          { item: '발상력', detail: '주제에 대한 창의적 해석' },
          { item: '완성도', detail: '색채·형태의 전체적 마감' },
        ],
        strategy: ['공간 디자인에 대한 기초 이해를 쌓고, 투시도법 등 공간 표현 기법을 연습한다.'],
        cautions: ['입시 전형 방식이 변경될 수 있으므로 반드시 최신 모집요강을 확인한다.'],
      },
    },
    {
      name: '계원예술대학교', department: '애니메이션과',
      guide: {
        overview: '계원예술대학교 애니메이션과 입시 실기 전형이다. 애니메이션 표현력과 스토리텔링 능력을 평가한다.',
        examInfo: { time: '학과별 상이', paper: '학과별 상이', materials: '학과별 상이 (요강 확인)' },
        trends: [{ year: '2025', topic: '캐릭터 및 스토리 중심의 애니메이션 기초 표현' }],
        scoring: [
          { item: '드로잉', detail: '캐릭터 기초 드로잉과 움직임 표현' },
          { item: '스토리', detail: '짧은 시퀀스 내 이야기 구성력' },
          { item: '완성도', detail: '전체적인 표현의 마감 수준' },
        ],
        strategy: ['캐릭터 기초 드로잉과 동작 연구를 꾸준히 훈련한다.', '계원예대 모집요강을 통해 정확한 실기 종목을 확인한다.'],
        cautions: ['모집요강에서 실기 종목과 평가 기준을 반드시 사전 확인한다.'],
      },
    },
  ];

  for (const { name, department, guide } of seedNoGuide) {
    try {
      const doc = await db.findOneAsync({ name, department });
      if (!doc) { console.log(`[SKIP] 없음: ${name} / ${department}`); skip++; continue; }
      if (doc.practiceGuide && Object.keys(doc.practiceGuide).length > 0) {
        console.log(`[SKIP] 이미 있음: ${name} / ${department}`); skip++; continue;
      }
      await db.updateAsync({ _id: doc._id }, { $set: { practiceGuide: guide } });
      console.log(`[OK-SEED] ${name} / ${department}`);
      success++;
    } catch (e) {
      console.log(`[FAIL] ${name} / ${department}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n✅ 완료: 업데이트 ${success}개, 스킵 ${skip}개, 실패 ${fail}개`);
  process.exit(0);
}

setTimeout(run, 500);
