import {
  auth,
  fixturesCollection,
  getDocs,
  query,
  orderBy,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from './firebase.js';

export const LOCAL_FIXTURE_KEY = 'localFixtures';
export const HOME_TEAM_NAME = 'Renfrew Juniors';

const teamLogo = new URL(
  '../assets/images/team-logo.png',
  import.meta.url
).href;

const fallbackLogo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='20' fill='%231a3964'/%3E%3Cpath d='M60 18 94 32v27c0 22-14 37-34 44C40 96 26 81 26 59V32z' fill='%234f9dff'/%3E%3Cpath d='M60 33v51M41 50h38' stroke='white' stroke-width='8'/%3E%3C/svg%3E";

let currentFixtures = [];

export function getLocalFixtures() {
  try {
    return JSON.parse(
      localStorage.getItem(LOCAL_FIXTURE_KEY) || '[]'
    );
  } catch {
    return [];
  }
}

export function saveLocalFixtures(fixtures) {
  localStorage.setItem(
    LOCAL_FIXTURE_KEY,
    JSON.stringify(fixtures)
  );
}

export function getFixtures() {
  return currentFixtures;
}

export async function loadFixtures() {
  let remoteFailed = false;
  let fixtures = [];

  try {
    const snapshot = await getDocs(
      query(fixturesCollection, orderBy('date'))
    );

    fixtures = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));
  } catch (error) {
    console.warn(
      'Remote fixture load failed:',
      error
    );

    remoteFailed = true;
  }

  if (!fixtures.length) {
    fixtures = getLocalFixtures();
  }

  currentFixtures = fixtures;

  return {
    fixtures,
    remoteFailed
  };
}


/* ---------------------------------------------------------
   FIXTURE STATUS / RESULT HELPERS
--------------------------------------------------------- */

function isCompleted(fixture) {
  return (
    typeof fixture.homeScore === 'number' &&
    typeof fixture.awayScore === 'number'
  );
}

function getFixtureStatus(fixture) {
  if (fixture.status) {
    return fixture.status;
  }

  return isCompleted(fixture)
    ? 'played'
    : 'scheduled';
}

function getStatusLabel(status) {
  switch (status) {
    case 'played':
      return 'FULL TIME';

    case 'postponed':
      return 'POSTPONED';

    case 'abandoned':
      return 'ABANDONED';

    case 'cancelled':
      return 'CANCELLED';

    case 'scheduled':
    default:
      return 'UPCOMING FIXTURE';
  }
}

export function filterFixtures(fixtures, filter) {
  if (filter === 'upcoming') {
    return fixtures.filter(item => {
      const status = getFixtureStatus(item);

      return (
        status === 'scheduled' &&
        !isCompleted(item)
      );
    });
  }

  if (filter === 'results') {
    return fixtures.filter(item => {
      return (
        getFixtureStatus(item) === 'played' ||
        isCompleted(item)
      );
    });
  }

  if (filter === 'league') {
    return fixtures.filter(item =>
      item.competition
        ?.toLowerCase()
        .includes('league')
    );
  }

  if (filter === 'other') {
    return fixtures.filter(item =>
      !item.competition
        ?.toLowerCase()
        .includes('league')
    );
  }

  return fixtures;
}


/* ---------------------------------------------------------
   CREATE FIXTURE CARD
--------------------------------------------------------- */

export function createFixtureItem(
  fixture,
  { allowAdminActions = false } = {}
) {
  const completed = isCompleted(fixture);
  const status = getFixtureStatus(fixture);

  const outcome =
    !completed
      ? ''
      : fixture.homeScore > fixture.awayScore
        ? 'score-win'
        : fixture.homeScore < fixture.awayScore
          ? 'score-loss'
          : 'score-draw';

  const homeLogo =
    fixture.homeLogoUrl ||
    fixture.homeLogo ||
    teamLogo;

  const opponentLogo =
    fixture.opponentLogoUrl ||
    fixture.opponentLogo ||
    fixture.awayLogoUrl ||
    fixture.awayLogo ||
    fallbackLogo;

  const item = document.createElement('li');

  item.className = 'fixture-item';

  item.innerHTML = `
    <div class="fixture-card-header">

      <span class="fixture-status">
        ${getStatusLabel(status)}
      </span>

      <span class="fixture-competition"></span>

    </div>

    <div class="fixture-matchup">

      <div class="fixture-team">

        <div class="fixture-logo-shell">
          <img
            class="fixture-team-logo"
            src="${homeLogo}"
            alt="${HOME_TEAM_NAME} logo"
          >
        </div>

        <h4>${HOME_TEAM_NAME}</h4>

      </div>

      <div class="fixture-versus">

        ${
          completed
            ? `
              <span class="score-badge ${outcome}">
                ${fixture.homeScore} - ${fixture.awayScore}
              </span>
            `
            : `
              <span>VS</span>
            `
        }

      </div>

      <div class="fixture-team">

        <div class="fixture-logo-shell">
          <img
            class="fixture-team-logo"
            src="${opponentLogo}"
            alt="Opponent logo"
          >
        </div>

        <h4 class="fixture-opponent"></h4>

      </div>

    </div>

    <div class="fixture-meta">

      <span>📍 </span>

      <span>🕐 </span>

    </div>

    ${
      status === 'postponed' ||
      status === 'abandoned' ||
      status === 'cancelled'
        ? `
          <div class="fixture-status-notice">
            ${
              fixture.statusReason
                ? fixture.statusReason
                : `This fixture has been ${status}.`
            }
          </div>
        `
        : ''
    }

    ${
      completed
        ? `
          <div class="fixture-cards">

            <span>
              🟨 ${Number(fixture.homeYellowCards || 0)}
            </span>

            <span>
              🟥 ${Number(fixture.homeRedCards || 0)}
            </span>

            <span class="fixture-cards-divider">
              |
            </span>

            <span>
              🟨 ${Number(fixture.awayYellowCards || 0)}
            </span>

            <span>
              🟥 ${Number(fixture.awayRedCards || 0)}
            </span>

          </div>
        `
        : ''
    }

    ${
      fixture.manOfTheMatch
        ? `
          <span class="motm-badge">
            🏆 MAN OF THE MATCH
          </span>
        `
        : ''
    }

    ${
      fixture.report
        ? `
          <button
            class="view-report-button"
            type="button"
          >
            View Match Report
          </button>

          <div class="match-report hidden">

            <h5>Match Report</h5>

            <p></p>

          </div>
        `
        : ''
    }

    <div class="fixture-actions"></div>
  `;


  /* ---------------------------------------------------------
     BASIC INFORMATION
  --------------------------------------------------------- */

  item.querySelector(
    '.fixture-competition'
  ).textContent =
    fixture.competition || 'Friendly';

  item.querySelector(
    '.fixture-opponent'
  ).textContent =
    fixture.opponent || 'Opponent TBC';

  const meta =
    item.querySelectorAll(
      '.fixture-meta span'
    );

  meta[0].append(
    fixture.location || 'Location TBC'
  );

  meta[1].append(
    fixture.date || 'Date / time TBC'
  );


  /* ---------------------------------------------------------
     MATCH REPORT
  --------------------------------------------------------- */

  if (fixture.report) {
    item.querySelector(
      '.match-report p'
    ).textContent = fixture.report;
  }


  /* ---------------------------------------------------------
     LOGO FALLBACK
  --------------------------------------------------------- */

  item
    .querySelectorAll('.fixture-team-logo')
    .forEach(image => {

      image.addEventListener(
        'error',
        () => {
          image.src = fallbackLogo;
        },
        { once: true }
      );

    });


  /* ---------------------------------------------------------
     VIEW REPORT BUTTON
  --------------------------------------------------------- */

  const view =
    item.querySelector(
      '.view-report-button'
    );

  if (view) {

    view.addEventListener(
      'click',
      () => {

        const report =
          item.querySelector(
            '.match-report'
          );

        report.classList.toggle(
          'hidden'
        );

        view.textContent =
          report.classList.contains(
            'hidden'
          )
            ? 'View Match Report'
            : 'Hide Match Report';

      }
    );

  }


  /* ---------------------------------------------------------
     ADMIN CONTROLS
  --------------------------------------------------------- */

  if (
    allowAdminActions &&
    auth.currentUser &&
    fixture.id
  ) {

    const actions =
      item.querySelector(
        '.fixture-actions'
      );


    /* EDIT FIXTURE */

    const edit =
      document.createElement(
        'button'
      );

    edit.type = 'button';

    edit.className =
      'edit-fixture-button';

    edit.textContent =
      'Edit Fixture';

    edit.addEventListener(
      'click',
      () => editFixture(fixture)
    );

    actions.append(edit);


    /* MATCH REPORT */

    const report =
      document.createElement(
        'button'
      );

    report.type = 'button';

    report.className =
      'report-button';

    report.textContent =
      'Match Report';

    report.addEventListener(
      'click',
      () => editMatchReport(fixture)
    );

    actions.append(report);


    /* DELETE */

    const remove =
      document.createElement(
        'button'
      );

    remove.type = 'button';

    remove.className =
      'delete-fixture-button';

    remove.textContent =
      'Delete';

    remove.addEventListener(
      'click',
      () => deleteFixture(fixture.id)
    );

    actions.append(remove);

  }

  return item;
}


/* ---------------------------------------------------------
   RENDER FIXTURES
--------------------------------------------------------- */

export function renderFixtures(
  list,
  fixtures,
  options = {}
) {

  list.innerHTML = '';

  const displayed =
    filterFixtures(
      fixtures,
      options.filter || 'all'
    );

  if (!displayed.length) {

    list.innerHTML =
      '<li class="fixture-empty">No fixtures found.</li>';

    return;
  }

  displayed.forEach(item => {

    list.append(
      createFixtureItem(
        item,
        options
      )
    );

  });
}


/* ---------------------------------------------------------
   ADD FIXTURE
--------------------------------------------------------- */

export async function addFixture({
  date,
  opponent,
  competition,
  location
}) {

  const payload = {

    date,

    opponent,

    competition:
      competition || 'Friendly',

    location:
      location || 'TBC',

    status:
      'scheduled',

    statusReason:
      '',

    homeYellowCards:
      0,

    homeRedCards:
      0,

    awayYellowCards:
      0,

    awayRedCards:
      0,

    manOfTheMatch:
      false,

    createdAt:
      serverTimestamp()

  };

  try {

    const ref =
      await addDoc(
        fixturesCollection,
        payload
      );

    return {
      remoteSaved: true,

      fixture: {
        id: ref.id,
        ...payload
      }

    };

  } catch (error) {

    const local =
      getLocalFixtures();

    local.push(payload);

    saveLocalFixtures(local);

    return {
      remoteSaved: false,

      fixture: payload,

      error

    };

  }

}


/* ---------------------------------------------------------
   DELETE FIXTURE
--------------------------------------------------------- */

export async function deleteFixture(id) {

  if (
    !confirm(
      'Delete this fixture?'
    )
  ) {
    return false;
  }

  await deleteDoc(
    doc(
      fixturesCollection,
      id
    )
  );

  return true;
}


/* ---------------------------------------------------------
   SAVE SCORE
--------------------------------------------------------- */

export async function saveScore(
  id,
  homeScore,
  awayScore
) {

  await updateDoc(
    doc(
      fixturesCollection,
      id
    ),
    {

      homeScore:
        Number(homeScore),

      awayScore:
        Number(awayScore),

      status:
        'played',

      scorePostedAt:
        serverTimestamp()

    }
  );

}


/* ---------------------------------------------------------
   SAVE MAN OF THE MATCH
--------------------------------------------------------- */

export async function saveManOfTheMatch(
  id,
  value
) {

  await updateDoc(
    doc(
      fixturesCollection,
      id
    ),
    {
      manOfTheMatch:
        value
    }
  );

}


/* ---------------------------------------------------------
   EDIT MATCH REPORT
--------------------------------------------------------- */

export async function editMatchReport(
  fixture
) {

  const report =
    prompt(
      'Enter match report:',
      fixture.report || ''
    );

  if (report !== null) {

    await updateDoc(
      doc(
        fixturesCollection,
        fixture.id
      ),
      {
        report
      }
    );

  }

}


/* ---------------------------------------------------------
   EDIT FULL FIXTURE
--------------------------------------------------------- */

export async function editFixture(
  fixture
) {

  if (
    !auth.currentUser ||
    !fixture.id
  ) {

    alert(
      'You must be logged in as the site administrator.'
    );

    return false;

  }


  /* DATE */

  const date =
    prompt(
      'Date / time:',
      fixture.date || ''
    );

  if (date === null) {
    return false;
  }


  /* OPPONENT */

  const opponent =
    prompt(
      'Opponent:',
      fixture.opponent || ''
    );

  if (opponent === null) {
    return false;
  }


  /* COMPETITION */

  const competition =
    prompt(
      'Competition:',
      fixture.competition || 'Friendly'
    );

  if (competition === null) {
    return false;
  }


  /* LOCATION */

  const location =
    prompt(
      'Location:',
      fixture.location || 'TBC'
    );

  if (location === null) {
    return false;
  }


  /* STATUS */

  const currentStatus =
    getFixtureStatus(fixture);

  const statusInput =
    prompt(
      `Status:

scheduled
played
postponed
abandoned
cancelled

Enter status:`,
      currentStatus
    );

  if (statusInput === null) {
    return false;
  }

  const status =
    statusInput
      .trim()
      .toLowerCase();


  const allowedStatuses = [
    'scheduled',
    'played',
    'postponed',
    'abandoned',
    'cancelled'
  ];

  if (
    !allowedStatuses.includes(
      status
    )
  ) {

    alert(
      'Invalid status. Please use scheduled, played, postponed, abandoned or cancelled.'
    );

    return false;

  }


  /* STATUS REASON */

  let statusReason =
    fixture.statusReason || '';

  if (
    status === 'postponed' ||
    status === 'abandoned' ||
    status === 'cancelled'
  ) {

    const reason =
      prompt(
        'Reason / notice:',
        statusReason
      );

    if (reason === null) {
      return false;
    }

    statusReason =
      reason.trim();

  } else {

    statusReason = '';

  }


  /* SCORE */

  let homeScore =
    fixture.homeScore;

  let awayScore =
    fixture.awayScore;

  if (
    status === 'played'
  ) {

    const homeScoreInput =
      prompt(
        'Renfrew Juniors score:',
        typeof homeScore === 'number'
          ? homeScore
          : '0'
      );

    if (
      homeScoreInput === null
    ) {
      return false;
    }

    const awayScoreInput =
      prompt(
        `${opponent} score:`,
        typeof awayScore === 'number'
          ? awayScore
          : '0'
      );

    if (
      awayScoreInput === null
    ) {
      return false;
    }

    homeScore =
      Number(homeScoreInput);

    awayScore =
      Number(awayScoreInput);

    if (
      Number.isNaN(homeScore) ||
      Number.isNaN(awayScore)
    ) {

      alert(
        'Scores must be numbers.'
      );

      return false;

    }

  } else {

    homeScore = null;
    awayScore = null;

  }


  /* YELLOW CARDS */

  const homeYellowCardsInput =
    prompt(
      `Renfrew Juniors yellow cards:`,
      Number(
        fixture.homeYellowCards || 0
      )
    );

  if (
    homeYellowCardsInput === null
  ) {
    return false;
  }


  const awayYellowCardsInput =
    prompt(
      `${opponent} yellow cards:`,
      Number(
        fixture.awayYellowCards || 0
      )
    );

  if (
    awayYellowCardsInput === null
  ) {
    return false;
  }


  /* RED CARDS */

  const homeRedCardsInput =
    prompt(
      `Renfrew Juniors red cards:`,
      Number(
        fixture.homeRedCards || 0
      )
    );

  if (
    homeRedCardsInput === null
  ) {
    return false;
  }


  const awayRedCardsInput =
    prompt(
      `${opponent} red cards:`,
      Number(
        fixture.awayRedCards || 0
      )
    );

  if (
    awayRedCardsInput === null
  ) {
    return false;
  }


  const homeYellowCards =
    Number(
      homeYellowCardsInput
    );

  const awayYellowCards =
    Number(
      awayYellowCardsInput
    );

  const homeRedCards =
    Number(
      homeRedCardsInput
    );

  const awayRedCards =
    Number(
      awayRedCardsInput
    );


  if (
    [
      homeYellowCards,
      awayYellowCards,
      homeRedCards,
      awayRedCards
    ].some(value =>
      Number.isNaN(value) ||
      value < 0
    )
  ) {

    alert(
      'Card counts must be zero or greater.'
    );

    return false;

  }


  /* SAVE EVERYTHING */

  try {

    await updateDoc(
      doc(
        fixturesCollection,
        fixture.id
      ),
      {

        date,

        opponent,

        competition:
          competition || 'Friendly',

        location:
          location || 'TBC',

        status,

        statusReason,

        homeScore,

        awayScore,

        homeYellowCards,

        homeRedCards,

        awayYellowCards,

        awayRedCards,

        scorePostedAt:
          status === 'played'
            ? serverTimestamp()
            : null

      }
    );


    alert(
      'Fixture updated successfully!'
    );

    return true;

  } catch (error) {

    console.error(
      'Failed to update fixture:',
      error
    );

    alert(
      'Could not update fixture. Check the console for details.'
    );

    return false;

  }

}