const BAD_WORDS = [
  // 기본 욕설
  '씨발', '시발', '씨팔', '시팔', '쓰발',
  '개새끼', '개색기', '개세끼',
  '병신', '빙신',
  '지랄', '지X랄',
  '닥쳐', '닥처',
  '꺼져', '꺼지다',
  '죽어', '뒤져', '뒤지다',
  '미친놈', '미친년', '미친새끼', '미친넘',
  '개년', '개놈', '개넘',
  '창녀', '창년',
  '보지', '보X지',
  '자지', '자X지',
  '섹스', '섹쓰', 'sex',
  '씹년', '씹놈', '씹새끼',
  '존나', '졌나', '존내',
  '좆', '좆같', '좆까',
  '개같다', '개같은',
  '찐따', '찐다',
  '정신병자', '정신이상자',
  '느개비', '느개미',
  '거지같다', '거지새끼',
  '새끼야', '새끼들',
  '쌍년', '쌍놈', '쌍욕',
  '한남', '한녀',
  '보빨', '보X빨',
  '걸레년', '걸레같은',
  '개소리', '개X소리',
  '퇴물', '찌질이', '찌질이',
  '호로새끼', '호로자식',
  '꼴통', '멍청이', '바보새끼',
  '넌씨눈', '좀비같은',
  '떡치다', '박아', '쑤셔',
];

// 단어를 필터링해서 ***로 대체 (글자 수만큼)
export function filterBadWords(text: string): string {
  let result = text;
  BAD_WORDS.forEach(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    result = result.replace(regex, '*'.repeat(word.length));
  });
  return result;
}

// 필터링 여부 확인
export function hasBadWords(text: string): boolean {
  return BAD_WORDS.some(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'gi').test(text);
  });
}
