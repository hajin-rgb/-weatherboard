// logic.js – 판단 규칙과 날씨 데이터 처리 (화면을 다루는 코드 금지)

const REGIONS = {
  '세종': { latitude: 36.48, longitude: 127.29 },
  '대전': { latitude: 36.35, longitude: 127.38 },
  '태안': { latitude: 36.75, longitude: 126.30 },
  '보령': { latitude: 36.33, longitude: 126.61 },
};

function buildWeatherUrl(region) {
  const coordinates = REGIONS[region];
  if (!coordinates) throw new Error('지원하지 않는 지역');
  const params = new URLSearchParams({
    ...coordinates,
    daily: 'temperature_2m_max,wind_speed_10m_max,precipitation_probability_max',
    wind_speed_unit: 'ms',
    timezone: 'Asia/Seoul',
    forecast_days: '1',
  });
  return 'https://api.open-meteo.com/v1/forecast?' + params;
}

function parseWeather(data, testWind = false) {
  const daily = data && data.daily;
  const tempMax = daily?.temperature_2m_max?.[0];
  const windMax = daily?.wind_speed_10m_max?.[0];
  const rainProb = daily?.precipitation_probability_max?.[0];
  if (![tempMax, windMax, rainProb].every(Number.isFinite)) {
    throw new Error('날씨 데이터가 불완전합니다');
  }
  return { tempMax, windMax: testWind ? 12 : windMax, rainProb };
}

// 교육용 가상 기준 (실제 작업 중지 · 행사 취소 기준은 각 기관 규정을 따름)
const RULES = { wind: 10, rain: 60, heat: 33 };

// 일정 구분과 날씨로 판단 (w가 없으면 '날씨 확인 전')
function judge(kind, w) {
  if (kind === '실내') return { level: 'ok', text: '영향 없음' };
  if (!w) return { level: 'none', text: '날씨 확인 전' };
  if (kind === '고소' && w.windMax >= RULES.wind) return { level: 'stop', text: '중지 검토 (강풍)' };
  if (w.tempMax >= RULES.heat) return { level: 'warn', text: '폭염 휴식' };
  if (w.rainProb >= RULES.rain) return { level: 'warn', text: '우천 주의' };
  return { level: 'ok', text: '진행' };
}

function createJudgmentMarkdown(rows, date, testWind = false) {
  // HTML 문법과 표 구분 문자, 줄바꿈이 셀 구조를 깨뜨리지 않도록 처리합니다.
  const cell = value => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\\/g, '&#92;').replace(/\|/g, '&#124;')
    .replace(/\r\n|\r|\n/g, '<br>');
  const lines = [
    `# 현장 일정 판단 ${date}`,
    '',
    ...(testWind ? ['강풍 테스트 결과: 풍속 12m/s 적용.', ''] : []),
    '| 일정 | 지역 | 구분 | 담당 | 날씨 | 판단 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(row => '| ' + row.map(cell).join(' | ') + ' |'),
    '',
    `판단 기준(교육용): 고소 일정 풍속 ${RULES.wind}m/s 이상 → 중지 검토 · 강수확률 ${RULES.rain}% 이상 → 우천 주의 · 기온 ${RULES.heat}℃ 이상 → 폭염 휴식 (실내는 영향 없음, 우선순위: 강풍 → 폭염 → 우천).`,
  ];
  return lines.join('\n') + '\n';
}

if (typeof module !== 'undefined') module.exports = { REGIONS, buildWeatherUrl, parseWeather, RULES, judge, createJudgmentMarkdown };
