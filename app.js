// app.js – 화면 동작 (목록 그리기, 일정 추가)

const today = new Date();
const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const todayDate = document.getElementById('todayDate');
todayDate.textContent = todayText;
todayDate.dateTime = todayText;

let baseTasks = [];
let addedTasks = [];
let tasksReady = false;
let tasks = [];
let weatherByRegion = {};
let weatherLoading = false;

async function loadWeather() {
  if (weatherLoading) return;
  weatherLoading = true;
  const observationsRequest = loadObservations();
  const refreshButton = document.getElementById('refreshWeather');
  refreshButton.disabled = true;
  const box = document.getElementById('weatherBox');
  const testWind = new URLSearchParams(window.location.search).get('test') === 'wind';
  const failed = [];
  weatherByRegion = {};
  renderTasks();
  box.textContent = '오늘 날씨를 불러오는 중입니다…';
  await Promise.all(Object.keys(REGIONS).map(async (region) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(buildWeatherUrl(region), { signal: controller.signal });
      if (!response.ok) throw new Error('날씨 요청 실패');
      weatherByRegion[region] = parseWeather(await response.json(), testWind);
      weatherByRegion[region].receivedAt = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    } catch (error) {
      failed.push(region);
    } finally {
      clearTimeout(timeout);
      renderTasks();
    }
  }));
  box.textContent = failed.length
    ? `날씨를 불러오지 못한 지역: ${failed.join(' · ')}. 인터넷 연결을 확인하고 ‘날씨 다시 불러오기’를 눌러 주세요. 일정 목록은 계속 사용할 수 있습니다.`
    : '세종 · 대전 · 태안 · 보령 오늘 예보 — 최고 기온(℃) · 최대 풍속(m/s) · 최대 강수확률(%) | 출처: Open-Meteo';
  if (testWind) box.textContent += ' [강풍 테스트: 수신한 날씨의 풍속을 12m/s로 적용]';
  await observationsRequest;
  refreshButton.disabled = false;
  weatherLoading = false;
}

async function loadObservations() {
  const status = document.getElementById('observationStatus');
  const list = document.getElementById('observations');
  list.innerHTML = '';
  if (window.location.protocol === 'file:') {
    status.textContent = '기상청 현재 관측은 Vercel 배포 주소에서 확인할 수 있습니다. 일정 목록은 배포 주소에서 열어 주세요.';
    return;
  }
  status.textContent = '기상청 관측을 불러오는 중입니다…';
  const results = await Promise.all(Object.keys(REGIONS).map(async region => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/current-weather?region=' + encodeURIComponent(region), { signal: controller.signal });
      if (!response.ok) throw new Error('관측 요청 실패');
      const data = await response.json();
      if (![data.temperature, data.wind, data.rain].every(Number.isFinite) || !/^\d{8}$/.test(data.base_date) || !/^\d{4}$/.test(data.base_time)) throw new Error('관측 자료 오류');
      const date = data.base_date;
      return `${region}: ${data.temperature}℃ · ${data.wind}m/s · ${data.rain}mm (관측 ${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)} ${data.base_time.slice(0, 2)}:${data.base_time.slice(2)} KST)`;
    } catch {
      return `${region}: 관측 수신 실패 — 다시 불러오기를 눌러 주세요.`;
    } finally {
      clearTimeout(timeout);
    }
  }));
  for (const text of results) {
    const item = document.createElement('li');
    item.textContent = text;
    list.appendChild(item);
  }
  status.textContent = '출처: 기상청 초단기실황. 제공 지연을 고려해 1시간 전 정시 관측을 조회합니다.';
}

async function loadTasks() {
  const status = document.getElementById('taskStatus');
  const button = document.querySelector('#taskForm button');
  button.disabled = true;
  status.textContent = '일정 목록을 불러오는 중입니다…';
  try {
    const response = await fetch('data/tasks.json');
    if (!response.ok) throw new Error('일정 요청 실패');
    const data = await response.json();
    if (!Array.isArray(data) || !data.every(isTask)) throw new Error('일정 형식 오류');
    baseTasks = data;
  } catch {
    status.textContent = window.location.protocol === 'file:'
      ? '배포 주소로 열어 주세요'
      : '일정 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
    return;
  }
  try {
    const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
    if (!Array.isArray(saved) || !saved.every(isTask)) throw new Error('저장 형식 오류');
    addedTasks = saved;
    status.textContent = '';
  } catch {
    status.textContent = '브라우저에 저장된 추가 일정을 읽지 못했습니다. 기본 일정만 표시합니다.';
    renderTasksFromData();
    return;
  }
  tasksReady = true;
  button.disabled = false;
  renderTasksFromData();
}

function isTask(task) {
  return task && typeof task.title === 'string' && task.title.trim()
    && typeof task.owner === 'string' && task.owner.trim()
    && Object.hasOwn(REGIONS, task.region) && ['야외', '고소', '실내'].includes(task.kind);
}

function renderTasksFromData() {
  tasks = baseTasks.concat(addedTasks);
  renderTasks();
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '% (수신 ' + w.receivedAt + ')' : '-';
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

function addTask(e) {
  e.preventDefault();
  if (!tasksReady) return;
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const next = addedTasks.concat(t);
  try {
    localStorage.setItem('wx_added', JSON.stringify(next));
  } catch {
    document.getElementById('msgBox').textContent = '일정을 저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해 주세요.';
    return;
  }
  addedTasks = next;
  document.getElementById('msgBox').textContent = '';
  e.target.reset();
  renderTasksFromData();
}

document.getElementById('taskForm').addEventListener('submit', addTask);
document.getElementById('refreshWeather').addEventListener('click', loadWeather);
loadTasks();
renderTasks();
loadWeather();
