import {
  auth,
  fixturesCollection,
  statsDocRef,
  getDoc,
  getDocs,
  setDoc,
  updateDoc
} from './firebase.js';
import {
  getGoalsConcededWhilePlaying,
  isGoalkeeperAppearance,
  loadFixtures
} from './fixtures.js';

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

export async function loadSeasonSettings() {
  const snapshot = await getDoc(statsDocRef);
  const data = snapshot.exists() ? snapshot.data() : {};
  return {
    seasonName: data.currentSeasonName || '',
    seasonStatus: data.seasonStatus || 'active'
  };
}

export async function saveSeasonSettings({ seasonName, seasonStatus }) {
  if (!auth.currentUser) {
    throw new Error('You must be logged in to save season settings.');
  }
  const current = await getDoc(statsDocRef);
  const currentData = current.exists() ? current.data() : {};
  if (!currentData.currentSeasonName && seasonName.trim()) {
    const fixtures = await getDocs(fixturesCollection);
    await Promise.all(fixtures.docs
      .filter(fixture => !fixture.data().season)
      .map(fixture => updateDoc(fixture.ref, { season: seasonName.trim() })));
  }
  await setDoc(statsDocRef, {
    currentSeasonName: seasonName.trim(),
    seasonStatus
  }, { merge: true });
  return loadSeasonSettings();
}

export function updateSeasonStats(fixtures, settings = {}) {
  const seasonFixtures = settings.seasonName
    ? fixtures.filter(item => item.season === settings.seasonName)
    : fixtures;
  const completed = seasonFixtures.filter(item => typeof item.homeScore === 'number' && typeof item.awayScore === 'number' && item.competition?.toLowerCase().includes('league'));
  const appearances = completed.filter(isGoalkeeperAppearance);
  const values = [appearances.length, appearances.filter(item => item.homeScore > item.awayScore).length, appearances.filter(item => item.homeScore === item.awayScore).length, appearances.filter(item => item.homeScore < item.awayScore).length, appearances.filter(item => getGoalsConcededWhilePlaying(item) === 0).length, appearances.reduce((total, item) => total + getGoalsConcededWhilePlaying(item), 0)];
  ['statPlayed', 'statWins', 'statDraws', 'statLosses', 'statCleanSheets', 'statConceded'].forEach((id, index) => { const element = document.getElementById(id); if (element) element.textContent = values[index]; });
  const heading = document.getElementById('seasonStatsHeading');
  if (heading) heading.textContent = settings.seasonName ? `Season Stats · ${settings.seasonName}` : 'Season Stats';
  const seasonState = document.getElementById('seasonState');
  if (seasonState) {
    seasonState.textContent = settings.seasonStatus === 'ended'
      ? 'Season ended'
      : settings.seasonName && appearances.length === 0
        ? 'Season in progress · no appearances yet, 0 goals conceded'
        : settings.seasonName
          ? 'Season in progress'
          : 'Current season';
  }
  const form = document.getElementById('formMessage'); if (!form) return;
  const games = [...appearances].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!games.length) { form.textContent = 'No league form yet.'; return; }
  let unbeaten = 0, clean = 0; for (const item of games) { if (item.homeScore >= item.awayScore) unbeaten++; else break; } for (const item of games) { if (getGoalsConcededWhilePlaying(item) === 0) clean++; else break; }
  form.textContent = clean >= 2 ? `🧤 ${clean} clean sheets in a row` : unbeaten >= 2 ? `🔥 Unbeaten in ${unbeaten} league games` : games[0].homeScore > games[0].awayScore ? '✅ Won the latest league match' : games[0].homeScore === games[0].awayScore ? '➖ Drew the latest league match' : '🔴 Looking to bounce back next game';
}
function applyStats(stats = {}) { const values = { kitNumber: stats.kitNumber || '23', yellowCards: stats.yellowCards || '0', redCards: stats.redCards || '0', injuries: stats.injuries || 'None' }; const map = { kitNumber: 'kitNumberStat', yellowCards: 'yellowCardStat', redCards: 'redCardStat' }; Object.entries(map).forEach(([key, id]) => { const node = document.getElementById(id); if (node) node.textContent = values[key]; }); const injury = document.getElementById('injuryStat'); if (injury) { injury.querySelector('strong').textContent = values.injuries; injury.classList.toggle('injury-active', values.injuries.toLowerCase() !== 'none'); } return values; }
export async function loadPlayerStats() {
  try {
    const { fixtures } = await loadFixtures();

    const cardTotals = calculateCardTotals(fixtures);

    const snapshot = await getDoc(statsDocRef);

    const stats = snapshot.exists()
      ? snapshot.data()
      : {};

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

export async function savePlayerStats(values) {
  if (!auth.currentUser) {
    throw new Error('You must be logged in to save player stats.');
  }

  await setDoc(statsDocRef, values, { merge: true });

  return loadPlayerStats();
}
