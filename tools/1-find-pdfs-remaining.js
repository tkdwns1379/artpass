require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const YEAR = new Date().getFullYear();
const DOWNLOAD_DIR = path.join(__dirname, 'downloaded');
const LOG_FILE = path.join(__dirname, 'download-log.json');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 남은 대학 목록만 읽기
const universities = fs.readFileSync(path.join(__dirname, 'universities-remaining.txt'), 'utf-8')
  .split('\n').map(s => s.trim()).filter(Boolean);

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];
let uaIdx = 0;
const getUA = () => USER_AGENTS[uaIdx++ % USER_AGENTS.length];

async function searchNaver(query) {
  const res = await axios.get('https://search.naver.com/search.naver', {
    params: { query, where: 'web' },
    headers: {
      'User-Agent': getUA(),
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Referer': 'https://www.naver.com/',
    },
    timeout: 15000,
  });
  return res.data;
}

function extractLinks(html) {
  const $ = cheerio.load(html);
  const links = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (href.startsWith('http') && (
      href.toLowerCase().includes('.pdf') ||
      href.includes('ac.kr') ||
      href.includes('ipsi') ||
      href.includes('admission')
    )) {
      links.push({ url: href, text });
    }
  });
  return links;
}

async function downloadPdf(url, filename) {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': new URL(url).origin,
      },
    });
    const contentType = res.headers['content-type'] || '';
    if (contentType.includes('pdf') || url.toLowerCase().includes('.pdf')) {
      const filePath = path.join(DOWNLOAD_DIR, filename);
      fs.writeFileSync(filePath, res.data);
      const sizeKB = Math.round(res.data.length / 1024);
      return { path: filePath, size: sizeKB };
    }
  } catch {}
  return null;
}

async function findAndDownload(uniName) {
  const safeName = uniName.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, '_');
  const filename = `${safeName}_${YEAR}.pdf`;

  // 이미 다운로드된 경우 건너뜀
  if (fs.existsSync(path.join(DOWNLOAD_DIR, filename))) {
    return { success: true, skipped: true, file: path.join(DOWNLOAD_DIR, filename) };
  }

  const queries = [
    `"${uniName}" ${YEAR} 수시 모집요강 filetype:pdf`,
    `"${uniName}" ${YEAR} 정시 모집요강 filetype:pdf`,
    `"${uniName}" ${YEAR} 모집요강 pdf site:ac.kr`,
    `"${uniName}" ${YEAR + 1} 모집요강 filetype:pdf`,
    `"${uniName}" 입학 모집요강 ${YEAR} pdf`,
  ];

  for (const query of queries) {
    console.log(`    🔍 ${query}`);
    try {
      const html = await searchNaver(query);
      const links = extractLinks(html);
      const pdfLinks = links.filter(l => l.url.toLowerCase().includes('.pdf'));
      for (const link of pdfLinks.slice(0, 3)) {
        const result = await downloadPdf(link.url, filename);
        if (result) {
          return { success: true, file: result.path, url: link.url, size: result.size };
        }
        await sleep(500);
      }
      await sleep(3000);
    } catch (e) {
      console.log(`    ⚠️  검색 오류: ${e.message}`);
      await sleep(3000);
    }
  }
  return { success: false };
}

async function main() {
  if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  console.log('\n========================================');
  console.log(`  아트패스 미시도 대학 PDF 수집`);
  console.log(`  대상 연도: ${YEAR}`);
  console.log(`  대학 수: ${universities.length}개`);
  console.log('========================================\n');

  // 기존 로그 로드
  let log = [];
  if (fs.existsSync(LOG_FILE)) {
    log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  }
  const logMap = new Map(log.map(l => [l.name, l]));

  for (let i = 0; i < universities.length; i++) {
    const uniName = universities[i];
    console.log(`\n[${i + 1}/${universities.length}] ${uniName}`);

    const result = await findAndDownload(uniName);

    if (result.skipped) {
      console.log(`  ⏭️  이미 다운로드됨`);
      continue;
    }

    if (result.success) {
      console.log(`  ✅ 완료: ${path.basename(result.file)} (${result.size}KB)`);
      logMap.set(uniName, { name: uniName, status: 'ok', file: result.file, url: result.url, size: result.size });
    } else {
      console.log(`  ❌ PDF를 찾지 못했습니다.`);
      logMap.set(uniName, { name: uniName, status: 'failed' });
    }
  }

  fs.writeFileSync(LOG_FILE, JSON.stringify([...logMap.values()], null, 2));

  const ok = [...logMap.values()].filter(l => l.status === 'ok').length;
  const failed = [...logMap.values()].filter(l => l.status === 'failed');

  console.log('\n========================================');
  console.log(`  완료! 성공: ${ok}개 / 실패: ${failed.length}개`);
  if (failed.length > 0) {
    console.log(`  수동 확인 필요:`);
    failed.forEach(f => console.log(`    - ${f.name}`));
  }
  console.log(`\n  다음 단계: node 2-parse-pdfs.js`);
  console.log('========================================\n');
}

main().catch(console.error);
