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

if (typeof module !== 'undefined') module.exports = { REGIONS, buildWeatherUrl, parseWeather, RULES, judge };
