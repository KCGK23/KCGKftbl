import {
  auth,
  statsDocRef,
  getDoc,
  setDoc
} from './firebase.js';


export function updateSeasonStats(fixtures) {
  const completed = fixtures.filter(
    item =>
      typeof item.homeScore === 'number' &&
      typeof item.awayScore === 'number' &&
      item.competition?.toLowerCase().includes('league')
  );

  const values = [
    completed.length,
    completed.filter(item => item.homeScore > item.awayScore).length,
    completed.filter(item => item.homeScore === item.awayScore).length,
    completed.filter(item => item.homeScore < item.awayScore).length,
    completed.filter(item => item.awayScore === 0).length,
    completed.reduce((total, item) => total + item.awayScore, 0)
  ];

  [
    'statPlayed',
    'statWins',
    'statDraws',
    'statLosses',
    'statCleanSheets',
    'statConceded'
  ].forEach((id, index) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = values[index];
    }
  });

  const form = document.getElementById('formMessage');

  if (!form) return;

  const games = [...completed].sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  );

  if (!games.length) {
    form.textContent = 'No league form yet.';
    return;
  }

  let unbeaten = 0;
  let clean = 0;

  for (const item of games) {
    if (item.homeScore >= item.awayScore) {
      unbeaten++;
    } else {
      break;
    }
  }

  for (const item of games) {
    if (item.awayScore === 0) {
      clean++;
    } else {
      break;
    }
  }

  form.textContent =
    clean >= 2
      ? `🧤 ${clean} clean sheets in a row`
      : unbeaten >= 2
        ? `🔥 Unbeaten in ${unbeaten} league games`
        : games[0].homeScore > games[0].awayScore
          ? '✅ Won the latest league match'
          : games[0].homeScore === games[0].awayScore
            ? '➖ Drew the latest league match'
            : '🔴 Looking to bounce back next game';
}


/*
  Apply the player's profile stats to the page.
*/
function applyStats(stats = {}) {
  const values = {
    kitNumber: stats.kitNumber || '23',
    yellowCards: stats.yellowCards || '0',
    redCards: stats.redCards || '0',
    injuries: stats.injuries || 'None'
  };

  const map = {
    kitNumber: 'kitNumberStat',
    yellowCards: 'yellowCardStat',
    redCards: 'redCardStat'
  };

  Object.entries(map).forEach(([key, id]) => {
    const node = document.getElementById(id);

    if (node) {
      node.textContent = values[key];
    }
  });

  const injury = document.getElementById('injuryStat');

  if (injury) {
    const strong = injury.querySelector('strong');

    if (strong) {
      strong.textContent = values.injuries;
    }

    injury.classList.toggle(
      'injury-active',
      values.injuries.toLowerCase() !== 'none'
    );
  }

  return values;
}


/*
  Load the player's saved profile stats from Firebase.
*/
export async function loadPlayerStats() {
  try {
    const snapshot = await getDoc(statsDocRef);

    return applyStats(
      snapshot.exists()
        ? snapshot.data()
        : {}
    );
  } catch (error) {
    console.warn(
      'Unable to load player stats:',
      error
    );

    return applyStats();
  }
}


/*
  Save the player's profile stats.
*/
export async function savePlayerStats(values) {
  if (!auth.currentUser) {
    throw new Error('Not signed in');
  }

  await setDoc(
    statsDocRef,
    values
  );

  applyStats(values);
}


/*
  Show/hide the stats editor.
*/
export function enableStatsToggle() {
  const button = document.getElementById('statsButton');
  const section = document.getElementById('statsSection');

  if (button && section) {
    button.addEventListener('click', () => {
      const hidden =
        section.style.display === 'none' ||
        !section.style.display;

      section.style.display =
        hidden ? 'block' : 'none';

      button.textContent =
        hidden ? 'Hide Stats' : 'Show Stats';
    });
  }
}


/*
  Count Kyle's cards from all saved fixtures.

  Each match can only have ONE Kyle card:
  - none
  - yellow
  - red

  Older fixtures using playerYellowCards /
  playerRedCards are also supported.
*/
export function calculatePlayerCardTotals(fixtures = []) {
  let yellowCards = 0;
  let redCards = 0;

  fixtures.forEach(fixture => {
    const card = fixture.playerCard;

    if (card === 'yellow') {
      yellowCards++;
      return;
    }

    if (card === 'red') {
      redCards++;
      return;
    }

    /*
      Compatibility with older matches that may still
      have the old number fields saved.
    */
    if (!card) {
      const oldYellow =
        Number(fixture.playerYellowCards) || 0;

      const oldRed =
        Number(fixture.playerRedCards) || 0;

      yellowCards += oldYellow;
      redCards += oldRed;
    }
  });

  return {
    yellowCards: String(yellowCards),
    redCards: String(redCards)
  };
}


/*
  Automatically update Kyle's overall yellow/red
  card totals based on the fixtures.

  This only changes the card totals.
  Kit number and injuries are left untouched.
*/
export async function updateAutomaticCardTotals(
  fixtures = []
) {
  if (!auth.currentUser) {
    throw new Error('Not signed in');
  }

  const totals =
    calculatePlayerCardTotals(fixtures);

  /*
    Merge means we keep the existing:
    - kit number
    - injuries
    - any other saved stats
  */
  await setDoc(
    statsDocRef,
    totals,
    { merge: true }
  );

  /*
    Update only the two card counters on the
    current page, without resetting other stats.
  */
  const yellowNode =
    document.getElementById('yellowCardStat');

  const redNode =
    document.getElementById('redCardStat');

  if (yellowNode) {
    yellowNode.textContent =
      totals.yellowCards;
  }

  if (redNode) {
    redNode.textContent =
      totals.redCards;
  }

  return totals;
}