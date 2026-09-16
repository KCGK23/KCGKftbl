import { auth, statsDocRef, getDoc, setDoc } from './firebase.js';
import { loadFixtures } from './fixtures.js';

function getPlayerCard(fixture) {
  return fixture.playerCard || 'none';
}

export function calculateCardTotals(fixtures = []) {
  return {
    yellowCards: fixtures.filter(
      fixture => getPlayerCard(fixture) === 'yellow'
    ).length,

    redCards: fixtures.filter(
      fixture => getPlayerCard(fixture) === 'red'
    ).length
  };
}

export function updateSeasonStats(fixtures) {
  const completed = fixtures.filter(item => typeof item.homeScore === 'number' && typeof item.awayScore === 'number' && item.competition?.toLowerCase().includes('league'));
  const values = [completed.length, completed.filter(item => item.homeScore > item.awayScore).length, completed.filter(item => item.homeScore === item.awayScore).length, completed.filter(item => item.homeScore < item.awayScore).length, completed.filter(item => item.awayScore === 0).length, completed.reduce((total, item) => total + item.awayScore, 0)];
  ['statPlayed', 'statWins', 'statDraws', 'statLosses', 'statCleanSheets', 'statConceded'].forEach((id, index) => { const element = document.getElementById(id); if (element) element.textContent = values[index]; });
  const form = document.getElementById('formMessage'); if (!form) return;
  const games = [...completed].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!games.length) { form.textContent = 'No league form yet.'; return; }
  let unbeaten = 0, clean = 0; for (const item of games) { if (item.homeScore >= item.awayScore) unbeaten++; else break; } for (const item of games) { if (item.awayScore === 0) clean++; else break; }
  form.textContent = clean >= 2 ? `🧤 ${clean} clean sheets in a row` : unbeaten >= 2 ? `🔥 Unbeaten in ${unbeaten} league games` : games[0].homeScore > games[0].awayScore ? '✅ Won the latest league match' : games[0].homeScore === games[0].awayScore ? '➖ Drew the latest league match' : '🔴 Looking to bounce back next game';
}
function applyStats(stats = {}) { const values = { kitNumber: stats.kitNumber || '23', yellowCards: stats.yellowCards || '0', redCards: stats.redCards || '0', injuries: stats.injuries || 'None' }; const map = { kitNumber: 'kitNumberStat', yellowCards: 'yellowCardStat', redCards: 'redCardStat' }; Object.entries(map).forEach(([key, id]) => { const node = document.getElementById(id); if (node) node.textContent = values[key]; }); const injury = document.getElementById('injuryStat'); if (injury) { injury.querySelector('strong').textContent = values.injuries; injury.classList.toggle('injury-active', values.injuries.toLowerCase() !== 'none'); } return values; }
export async function loadPlayerStats() {
  try {
    const snapshot = await getDoc(statsDocRef);
    const stats = snapshot.exists()
      ? snapshot.data()
      : {};

    const { fixtures } = await loadFixtures();
    const cardTotals = calculateCardTotals(fixtures);

    return applyStats({
      ...stats,
      ...cardTotals
    });
  } catch (error) {
    console.warn('Unable to load player stats:', error);
    return applyStats();
  }
}
export function enableStatsToggle() { const button = document.getElementById('statsButton'); const section = document.getElementById('statsSection'); if (button && section) button.addEventListener('click', () => { const hidden = section.style.display === 'none' || !section.style.display; section.style.display = hidden ? 'block' : 'none'; button.textContent = hidden ? 'Hide Stats' : 'Show Stats'; }); }
