// 키는 서버 환경변수에서만 읽으며 응답이나 오류에 포함하지 않습니다.
const GRIDS = { '세종': [66, 103], '대전': [67, 100], '태안': [48, 109], '보령': [54, 100] };

function observationBase(now = new Date()) {
  // 정시 관측 자료의 제공 지연을 고려해 1시간 전 정시를 요청합니다.
  const kst = new Date(now.getTime() + 9 * 3600000 - 3600000);
  return {
    base_date: kst.toISOString().slice(0, 10).replaceAll('-', ''),
    base_time: String(kst.getUTCHours()).padStart(2, '0') + '00',
  };
}

function parseObservation(data) {
  if (data?.response?.header?.resultCode !== '00') throw new Error('관측 조회 실패');
  const items = data.response.body?.items?.item;
  if (!Array.isArray(items)) throw new Error('관측 자료 없음');
  function value(category) {
    const raw = items.find(item => item.category === category)?.obsrValue;
    if (raw === undefined || raw === null || String(raw).trim() === '') throw new Error('관측 자료 누락');
    const number = Number(raw);
    if (!Number.isFinite(number) || number <= -900) throw new Error('관측 자료 오류');
    return number;
  }
  const result = { temperature: value('T1H'), wind: value('WSD'), rain: value('RN1') };
  if (result.wind < 0 || result.rain < 0) throw new Error('관측 자료 오류');
  return result;
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET 요청만 지원합니다.' });
  }
  const region = req.query?.region;
  if (typeof region !== 'string' || !Object.hasOwn(GRIDS, region)) return res.status(400).json({ error: '지원하지 않는 지역입니다.' });
  const key = process.env.key_publicdata?.trim();
  if (!key) return res.status(503).json({ error: '기상청 연결 설정을 확인해 주세요.' });
  try {
    // 포털의 일반 키와 URL 인코딩 키를 모두 지원합니다.
    const serviceKey = key.includes('%') ? decodeURIComponent(key) : key;
    const base = observationBase();
    const [nx, ny] = GRIDS[region];
    const params = new URLSearchParams({ serviceKey, ...base, nx, ny, pageNo: '1', numOfRows: '100', dataType: 'JSON' });
    const response = await fetch('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?' + params, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('기상청 응답 실패');
    const observation = parseObservation(await response.json());
    return res.status(200).json({ region, ...base, ...observation, source: '기상청' });
  } catch {
    return res.status(502).json({ error: '기상청 실황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}

module.exports = handler;
module.exports.observationBase = observationBase;
module.exports.parseObservation = parseObservation;
