import { loadFixtures } from './fixtures.js';

function getMatchDay(fixture) {
  const value = String(fixture.date || '').trim();
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const uk = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  let year, month, day;

  if (iso) [, year, month, day] = iso.map(Number);
  else if (uk) [, day, month, year] = uk.map(Number);
  else {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    year = parsed.getFullYear();
    month = parsed.getMonth() + 1;
    day = parsed.getDate();
  }

  const time = String(fixture.time || '').match(/^(\d{1,2}):(\d{2})/);
  // Older fixtures may have no kick-off time; use midday for those until a time is added.
  return new Date(year, month - 1, day, time ? Number(time[1]) : 12, time ? Number(time[2]) : 0);
}

function renderEmpty(title, message) {
  document.querySelector('#nextMatchTitle').textContent = title;
  document.querySelector('#nextMatchMeta').textContent = message;
  document.querySelector('#matchCountdown').hidden = true;
  document.querySelector('#countdownNote').hidden = true;
}

export async function showNextMatch() {
  const card = document.querySelector('#nextMatch');
  if (!card) return;

  try {
    const { fixtures } = await loadFixtures();
    const now = new Date();
    const next = fixtures
      .filter(fixture => !['completed', 'postponed', 'abandoned'].includes(fixture.status || ''))
      .map(fixture => ({ fixture, matchDay: getMatchDay(fixture) }))
      .filter(item => item.matchDay && item.matchDay >= now &&
        !(item.fixture.status === 'completed' ||
          (typeof item.fixture.homeScore === 'number' && typeof item.fixture.awayScore === 'number')))
      .sort((a, b) => a.matchDay - b.matchDay)[0];

    if (!next) {
      renderEmpty('No match scheduled yet', 'Check back soon for the next fixture.');
      return;
    }

    const title = document.querySelector('#nextMatchTitle');
    title.textContent = `Renfrew Juniors vs ${next.fixture.opponent || 'Opponent'}`;
    const dateLabel = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(next.matchDay);
    const kickoffLabel = next.fixture.time ? `Kick-off ${next.fixture.time}` : '';
    const details = [dateLabel, kickoffLabel, next.fixture.competition, next.fixture.location]
      .filter(Boolean);
    document.querySelector('#nextMatchMeta').textContent = details.join(' · ');

    const updateCountdown = () => {
      const remaining = Math.max(0, next.matchDay.getTime() - Date.now());
      const days = Math.floor(remaining / 86_400_000);
      const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      document.querySelector('#countdownDays').textContent = String(days).padStart(2, '0');
      document.querySelector('#countdownHours').textContent = String(hours).padStart(2, '0');
      document.querySelector('#countdownMinutes').textContent = String(minutes).padStart(2, '0');
      if (remaining === 0) document.querySelector('#countdownNote').textContent = 'It’s match day!';
    };
    updateCountdown();
    window.setInterval(updateCountdown, 60_000);
  } catch (error) {
    console.error('Unable to load the next match:', error);
    renderEmpty('Next match unavailable', 'Visit the fixtures page to check the schedule.');
  }
}
