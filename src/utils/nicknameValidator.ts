export const NICKNAME_REGEX = /^[가-힣a-zA-Z]{1,7}$/;

// 비속어 / 욕설 / 성인 단어 필터
const BANNED_WORDS = new Set([
  // 한글 욕설
  '시발','씨발','씨팔','쉬발','시팔','ㅅㅂ','ㅆㅂ',
  '개새끼','개쉐끼','개세끼','개씨발','개같은',
  '병신','ㅂㅅ','지랄','존나','좆','ㅈㄴ','좆같','좆나',
  '새끼','쌍년','쌍놈','미친놈','미친년',
  '창녀','창년','창놈','매춘','매춘부',
  '강간','윤간',
  // 한글 성적 단어
  '보지','자지','보짓','자짓',
  '섹스','색스','스엑스','쎅스','섹쓰','쎄스','세스',
  '섹시','야동','야설','야사',
  '성교','성기','음경','음부','음핵','음모',
  '항문','유두','젖꼭지','가슴','유방',
  '자위','오럴','변태','포르노','포르',
  '몸매','누드','나체',
  // 영어 욕설
  'fuck','shit','bitch','ass','asshole',
  'dick','pussy','cock','cunt',
  'nigger','nigga','bastard','whore','slut',
  'motherfucker','motherfuck','fucker','fuckup',
  'bullshit','jackass','dumbass',
  // 영어 성인 단어
  'sex','sexy','sexe',
  'porn','porno','pornography',
  'nude','naked','nudity',
  'rape','rapist',
  'anal','oral','vagina','penis','vulva',
  'masturbate','masturbation','orgasm',
  'erotic','hentai','fetish',
  'boob','boobs','tit','tits','nipple',
  'horny','cum','jizz','blowjob','handjob',
]);

export function containsBannedWord(value: string): boolean {
  const lower = value.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) return true;
  }
  return false;
}

export function validateNickname(value: string): string | null {
  if (!value) return null;
  if (!NICKNAME_REGEX.test(value)) return '한글 또는 영어만, 7자 이내로 입력하세요 (띄어쓰기·숫자·특수문자 불가)';
  if (containsBannedWord(value)) return '사용할 수 없는 닉네임입니다.';
  return null;
}
