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

export const UNASSIGNED_SEASON_KEY = '__unassigned__';

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
  const seasonStatuses = Object.fromEntries(
    (Array.isArray(data.seasonStatusRecords) ? data.seasonStatusRecords : [])
      .map(record => [record.name, record.status])
  );
  if (data.currentSeasonName && !seasonStatuses[data.currentSeasonName]) {
    seasonStatuses[data.currentSeasonName] = data.seasonStatus || 'active';
  }
  return {
    seasonName: data.currentSeasonName || '',
    seasonStatus: data.seasonStatus || 'active',
    seasonStatuses
  };
}

export async function saveSeasonSettings({ targetSeasonName = '', seasonName, seasonStatus }) {
  if (!auth.currentUser) {
    throw new Error('You must be logged in to save season settings.');
  }
  seasonName = String(seasonName || '').trim();
  if (!seasonName) throw new Error('Enter a season name.');

  const current = await getDoc(statsDocRef);
  const currentData = current.exists() ? current.data() : {};
  const isUnassigned = targetSeasonName === UNASSIGNED_SEASON_KEY;
  const oldName = isUnassigned ? '' : targetSeasonName;
  const fixtures = await getDocs(fixturesCollection);
  const fixtureNames = new Set(fixtures.docs.map(fixture => fixture.data().season).filter(Boolean));
  const settingsNames = new Set([
    currentData.currentSeasonName,
    ...(Array.isArray(currentData.seasonStatusRecords)
      ? currentData.seasonStatusRecords.map(record => record.name)
      : [])
  ].filter(Boolean));
  if (!isUnassigned &&
      ((oldName && seasonName !== oldName) || !oldName) &&
      (fixtureNames.has(seasonName) || settingsNames.has(seasonName))) {
    throw new Error('That season already exists. Select it from the list to edit or restart it.');
  }

  if (isUnassigned || (!currentData.currentSeasonName && !oldName)) {
    await Promise.all(fixtures.docs
      .filter(fixture => !fixture.data().season)
      .map(fixture => updateDoc(fixture.ref, { season: seasonName })));
  } else if (oldName && seasonName !== oldName) {
    await Promise.all(fixtures.docs
      .filter(fixture => fixture.data().season === oldName)
      .map(fixture => updateDoc(fixture.ref, { season: seasonName })));
  }

  const seasonStatuses = Object.fromEntries(
    (Array.isArray(currentData.seasonStatusRecords) ? currentData.seasonStatusRecords : [])
      .map(record => [record.name, record.status])
  );
  if (oldName && seasonName !== oldName) delete seasonStatuses[oldName];
  seasonStatuses[seasonName] = seasonStatus;

  let currentSeasonName = currentData.currentSeasonName || '';
  if (oldName && currentSeasonName === oldName) currentSeasonName = seasonName;
  if (seasonStatus === 'active') {
    if (currentSeasonName && currentSeasonName !== seasonName) {
      seasonStatuses[currentSeasonName] = 'ended';
    }
    currentSeasonName = seasonName;
  }
  if (!currentSeasonName) currentSeasonName = seasonName;

  await setDoc(statsDocRef, {
    currentSeasonName,
    seasonStatus: seasonStatuses[currentSeasonName] || 'active',
    seasonStatusRecords: Object.entries(seasonStatuses)
      .map(([name, status]) => ({ name, status }))
  }, { merge: true });
  return loadSeasonSettings();
}

export async function deleteSeason(seasonName) {
  if (!auth.currentUser) {
    throw new Error('You must be logged in to manage seasons.');
  }
  if (!seasonName) throw new Error('Select a season to remove.');

  const [settingsSnapshot, fixtureSnapshot] = await Promise.all([
    getDoc(statsDocRef),
    getDocs(fixturesCollection)
  ]);
  const currentData = settingsSnapshot.exists() ? settingsSnapshot.data() : {};
  await Promise.all(fixtureSnapshot.docs
    .filter(fixture => fixture.data().season === seasonName)
    .map(fixture => updateDoc(fixture.ref, { season: null })));

  const seasonStatuses = Object.fromEntries(
    (Array.isArray(currentData.seasonStatusRecords) ? currentData.seasonStatusRecords : [])
      .filter(record => record.name !== seasonName)
      .map(record => [record.name, record.status])
  );
  const remainingNames = new Set(fixtureSnapshot.docs
    .filter(fixture => fixture.data().season && fixture.data().season !== seasonName)
    .map(fixture => fixture.data().season));
  const previousCurrentSeason = currentData.currentSeasonName;
  if (previousCurrentSeason && previousCurrentSeason !== seasonName) remainingNames.add(previousCurrentSeason);
  const nextCurrentSeasonName = previousCurrentSeason === seasonName
    ? [...remainingNames].sort((a, b) => b.localeCompare(a))[0] || ''
    : previousCurrentSeason || '';
  if (nextCurrentSeasonName && !seasonStatuses[nextCurrentSeasonName]) {
    seasonStatuses[nextCurrentSeasonName] = 'ended';
  }

  await setDoc(statsDocRef, {
    currentSeasonName: nextCurrentSeasonName,
    seasonStatus: nextCurrentSeasonName
      ? seasonStatuses[nextCurrentSeasonName]
      : 'active',
    seasonStatusRecords: Object.entries(seasonStatuses)
      .map(([name, status]) => ({ name, status }))
  }, { merge: true });
  return loadSeasonSettings();
}

export function getSeasonNames(fixtures, settings = {}) {
  const names = [...new Set(fixtures.map(fixture => fixture.season).filter(Boolean))];
  if (settings.seasonName && !names.includes(settings.seasonName)) {
    names.push(settings.seasonName);
  }
  return names.sort((a, b) => b.localeCompare(a));
}

export function populateSeasonSelector(fixtures, settings = {}) {
  const selector = document.getElementById('seasonSelector');
  if (!selector) return;

  const seasonNames = getSeasonNames(fixtures, settings);

  selector.innerHTML = '';
  const currentOption = document.createElement('option');
  currentOption.value = settings.seasonName || '';
  currentOption.textContent = settings.seasonName
    ? `${settings.seasonName} · ${settings.seasonStatus === 'ended' ? 'Ended' : 'In progress'}`
    : 'Current season';
  selector.append(currentOption);

  seasonNames
    .filter(name => name !== settings.seasonName)
    .forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      const status = settings.seasonStatuses?.[name] || 'ended';
      option.textContent = `${name} · ${status === 'active' ? 'In progress' : 'Ended'}`;
      selector.append(option);
    });
  if (fixtures.some(fixture => !fixture.season)) {
    const option = document.createElement('option');
    option.value = UNASSIGNED_SEASON_KEY;
    option.textContent = 'Unassigned / legacy matches';
    selector.append(option);
  }
  selector.value = settings.seasonName || '';
}

export function updateSeasonStats(fixtures, settings = {}) {
  const selectedSeasonName = Object.hasOwn(settings, 'selectedSeasonName')
    ? settings.selectedSeasonName
    : settings.seasonName;
  const showingUnassigned = selectedSeasonName === UNASSIGNED_SEASON_KEY;
  const seasonFixtures = showingUnassigned
    ? fixtures.filter(item => !item.season)
    : selectedSeasonName
      ? fixtures.filter(item => item.season === selectedSeasonName)
      : fixtures;
  const completed = seasonFixtures.filter(item => typeof item.homeScore === 'number' && typeof item.awayScore === 'number' && item.competition?.toLowerCase().includes('league'));
  const appearances = completed.filter(isGoalkeeperAppearance);
  const values = [appearances.length, appearances.filter(item => item.homeScore > item.awayScore).length, appearances.filter(item => item.homeScore === item.awayScore).length, appearances.filter(item => item.homeScore < item.awayScore).length, appearances.filter(item => getGoalsConcededWhilePlaying(item) === 0).length, appearances.reduce((total, item) => total + getGoalsConcededWhilePlaying(item), 0)];
  ['statPlayed', 'statWins', 'statDraws', 'statLosses', 'statCleanSheets', 'statConceded'].forEach((id, index) => { const element = document.getElementById(id); if (element) element.textContent = values[index]; });
  const heading = document.getElementById('seasonStatsHeading');
  if (heading) heading.textContent = showingUnassigned
    ? 'Season Stats · Unassigned matches'
    : selectedSeasonName
      ? `Season Stats · ${selectedSeasonName}`
      : 'Season Stats';
  const seasonState = document.getElementById('seasonState');
  const selectedSeasonStatus = showingUnassigned
    ? 'unassigned'
    : settings.seasonStatuses?.[selectedSeasonName] ||
      (selectedSeasonName === settings.seasonName ? settings.seasonStatus : 'ended');
  if (seasonState) {
    seasonState.textContent = selectedSeasonStatus === 'unassigned'
      ? 'These fixtures are not assigned to a season'
      : selectedSeasonStatus === 'ended'
        ? 'Season ended'
        : selectedSeasonName && appearances.length === 0
          ? 'Season in progress · no appearances yet, 0 goals conceded'
          : selectedSeasonName
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
