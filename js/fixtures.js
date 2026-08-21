import { auth, fixturesCollection, getDocs, query, orderBy, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from './firebase.js';

export const LOCAL_FIXTURE_KEY = 'localFixtures';
export const HOME_TEAM_NAME = 'Renfrew Juniors';
const teamLogo = new URL('../assets/images/team-logo.png', import.meta.url).href;
const fallbackLogo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='20' fill='%231a3964'/%3E%3Cpath d='M60 18 94 32v27c0 22-14 37-34 44C40 96 26 81 26 59V32z' fill='%234f9dff'/%3E%3Cpath d='M60 33v51M41 50h38' stroke='white' stroke-width='8'/%3E%3C/svg%3E";
let currentFixtures = [];

export function getLocalFixtures() { try { return JSON.parse(localStorage.getItem(LOCAL_FIXTURE_KEY) || '[]'); } catch { return []; } }
export function saveLocalFixtures(fixtures) { localStorage.setItem(LOCAL_FIXTURE_KEY, JSON.stringify(fixtures)); }
export function getFixtures() { return currentFixtures; }

export async function loadFixtures() {
  let remoteFailed = false;
  let fixtures = [];
  try {
    const snapshot = await getDocs(query(fixturesCollection, orderBy('date')));
    fixtures = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  } catch (error) { console.warn('Remote fixture load failed:', error); remoteFailed = true; }
  if (!fixtures.length) fixtures = getLocalFixtures();
  currentFixtures = fixtures;
  return { fixtures, remoteFailed };
}

function isCompleted(fixture) { return typeof fixture.homeScore === 'number' && typeof fixture.awayScore === 'number'; }
export function filterFixtures(fixtures, filter) {
  if (filter === 'upcoming') return fixtures.filter(item => !isCompleted(item));
  if (filter === 'results') return fixtures.filter(isCompleted);
  if (filter === 'league') return fixtures.filter(item => item.competition?.toLowerCase().includes('league'));
  if (filter === 'other') return fixtures.filter(item => !item.competition?.toLowerCase().includes('league'));
  return fixtures;
}

export function createFixtureItem(fixture, { allowAdminActions = false } = {}) {
  const completed = isCompleted(fixture);
  const outcome = !completed ? '' : fixture.homeScore > fixture.awayScore ? 'score-win' : fixture.homeScore < fixture.awayScore ? 'score-loss' : 'score-draw';
  const homeLogo = fixture.homeLogoUrl || fixture.homeLogo || teamLogo;
  const opponentLogo = fixture.opponentLogoUrl || fixture.opponentLogo || fixture.awayLogoUrl || fixture.awayLogo || fallbackLogo;
  const item = document.createElement('li');
  item.className = 'fixture-item';
  item.innerHTML = `<div class="fixture-card-header"><span class="fixture-status">${completed ? 'FULL TIME' : 'UPCOMING FIXTURE'}</span><span class="fixture-competition"></span></div>
    <div class="fixture-matchup"><div class="fixture-team"><div class="fixture-logo-shell"><img class="fixture-team-logo" src="${homeLogo}" alt="${HOME_TEAM_NAME} logo"></div><h4>${HOME_TEAM_NAME}</h4></div><div class="fixture-versus">${completed ? `<span class="score-badge ${outcome}">${fixture.homeScore} - ${fixture.awayScore}</span>` : '<span>VS</span>'}</div><div class="fixture-team"><div class="fixture-logo-shell"><img class="fixture-team-logo" src="${opponentLogo}" alt="Opponent logo"></div><h4 class="fixture-opponent"></h4></div></div>
    <div class="fixture-meta"><span>📍 </span><span>🕐 </span></div>${fixture.manOfTheMatch ? '<span class="motm-badge">🏆 MAN OF THE MATCH</span>' : ''}
    ${fixture.report ? '<button class="view-report-button" type="button">View Match Report</button><div class="match-report hidden"><h5>Match Report</h5><p></p></div>' : ''}<div class="fixture-actions"></div>`;
  item.querySelector('.fixture-competition').textContent = fixture.competition || 'Friendly';
  item.querySelector('.fixture-opponent').textContent = fixture.opponent || 'Opponent TBC';
  const meta = item.querySelectorAll('.fixture-meta span'); meta[0].append(fixture.location || 'Location TBC'); meta[1].append(fixture.date || 'Date / time TBC');
  if (fixture.report) item.querySelector('.match-report p').textContent = fixture.report;
  item.querySelectorAll('.fixture-team-logo').forEach(image => image.addEventListener('error', () => { image.src = fallbackLogo; }, { once: true }));
  const view = item.querySelector('.view-report-button');
  if (view) view.addEventListener('click', () => { const report = item.querySelector('.match-report'); report.classList.toggle('hidden'); view.textContent = report.classList.contains('hidden') ? 'View Match Report' : 'Hide Match Report'; });
  if (allowAdminActions && auth.currentUser && fixture.id) {
    const actions = item.querySelector('.fixture-actions');
    const report = document.createElement('button'); report.type = 'button'; report.className = 'report-button'; report.textContent = 'Match Report'; report.addEventListener('click', () => editMatchReport(fixture)); actions.append(report);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete-fixture-button'; remove.textContent = 'Delete'; remove.addEventListener('click', () => deleteFixture(fixture.id)); actions.append(remove);
  }
  return item;
}
export function renderFixtures(list, fixtures, options = {}) { list.innerHTML = ''; const displayed = filterFixtures(fixtures, options.filter || 'all'); if (!displayed.length) { list.innerHTML = '<li class="fixture-empty">No fixtures found.</li>'; return; } displayed.forEach(item => list.append(createFixtureItem(item, options))); }

export async function addFixture({ date, opponent, competition, location }) {
  const payload = { date, opponent, competition: competition || 'Friendly', location: location || 'TBC', manOfTheMatch: false, createdAt: serverTimestamp() };
  try { const ref = await addDoc(fixturesCollection, payload); return { remoteSaved: true, fixture: { id: ref.id, ...payload } }; }
  catch (error) { const local = getLocalFixtures(); local.push(payload); saveLocalFixtures(local); return { remoteSaved: false, fixture: payload, error }; }
}
export async function deleteFixture(id) { if (!confirm('Delete this fixture?')) return false; await deleteDoc(doc(fixturesCollection, id)); return true; }
export async function saveScore(id, homeScore, awayScore) { await updateDoc(doc(fixturesCollection, id), { homeScore: Number(homeScore), awayScore: Number(awayScore), scorePostedAt: serverTimestamp() }); }
export async function saveManOfTheMatch(id, value) { await updateDoc(doc(fixturesCollection, id), { manOfTheMatch: value }); }
export async function editMatchReport(fixture) { const report = prompt('Enter match report:', fixture.report || ''); if (report !== null) await updateDoc(doc(fixturesCollection, fixture.id), { report }); }
