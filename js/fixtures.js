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

const DEFAULT_OPPONENT_LOGO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='20' fill='%231a3964'/%3E%3Cpath d='M60 18 94 32v27c0 22-14 37-34 44C40 96 26 81 26 59V32z' fill='%234f9dff' opacity='.9'/%3E%3Cpath d='M60 33v51M41 50h38' stroke='white' stroke-width='8' stroke-linecap='round'/%3E%3C/svg%3E";

let currentFixtures = [];


/* =========================================================
   LOCAL FIXTURES
========================================================= */

export function getLocalFixtures() {
  try {
    const raw = localStorage.getItem(LOCAL_FIXTURE_KEY);
    return raw ? JSON.parse(raw) : [];
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


/* =========================================================
   LOAD FIXTURES
========================================================= */

export async function loadFixtures() {
  let fixtures = [];
  let remoteFailed = false;

  try {
    const snapshot = await getDocs(
      query(
        fixturesCollection,
        orderBy('date')
      )
    );

   fixtures = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
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


/* =========================================================
   FILTERS
========================================================= */

export function filterFixtures(
  fixtures,
  filter
) {

  if (filter === 'upcoming') {
    return fixtures.filter(fixture =>
      typeof fixture.homeScore !== 'number' ||
      typeof fixture.awayScore !== 'number'
    );
  }

  if (filter === 'results') {
    return fixtures.filter(fixture =>
      typeof fixture.homeScore === 'number' &&
      typeof fixture.awayScore === 'number'
    );
  }

  if (filter === 'league') {
    return fixtures.filter(fixture =>
      fixture.competition &&
      fixture.competition
        .toLowerCase()
        .includes('league')
    );
  }

  if (filter === 'other') {
    return fixtures.filter(fixture =>
      !fixture.competition ||
      !fixture.competition
        .toLowerCase()
        .includes('league')
    );
  }

  return fixtures;
}


/* =========================================================
   CREATE FIXTURE CARD
========================================================= */

export function createFixtureItem(fixture) {

  const scoreText =
    typeof fixture.homeScore === 'number' &&
    typeof fixture.awayScore === 'number';

  let scoreClass = '';

  if (scoreText) {

    if (
      fixture.homeScore >
      fixture.awayScore
    ) {
      scoreClass = 'score-win';

    } else if (
      fixture.homeScore <
      fixture.awayScore
    ) {
      scoreClass = 'score-loss';

    } else {
      scoreClass = 'score-draw';
    }
  }


  const item =
    document.createElement('li');

  item.className =
    'fixture-item';


  const DEFAULT_HOME_LOGO =
  new URL('../assets/images/team-logo.png', import.meta.url).href;

const homeLogo =
  fixture.homeLogoUrl ||
  fixture.homeLogo ||
  DEFAULT_HOME_LOGO;

  const opponentLogo =
    fixture.opponentLogoUrl ||
    fixture.opponentLogo ||
    fixture.awayLogoUrl ||
    fixture.awayLogo ||
    DEFAULT_OPPONENT_LOGO;


  /* CARD COUNTS */

  const homeYellow =
    Number(fixture.homeYellowCards || 0);

  const homeRed =
    Number(fixture.homeRedCards || 0);

  const awayYellow =
    Number(fixture.awayYellowCards || 0);

  const awayRed =
    Number(fixture.awayRedCards || 0);

    const playerCard =
  fixture.playerCard || 'none';

const playerCardDisplay =
  playerCard === 'yellow'
    ? '<div class="player-card-counts">🟨 Kyle</div>'
    : playerCard === 'red'
      ? '<div class="player-card-counts">🟥 Kyle</div>'
      : '';

  const homeCards =
    homeYellow > 0 || homeRed > 0
      ? `
        <div class="team-card-counts">

          ${
            homeYellow > 0
              ? `<span class="yellow-card-count">
                   🟨 ${homeYellow}
                 </span>`
              : ''
          }

          ${
            homeRed > 0
              ? `<span class="red-card-count">
                   🟥 ${homeRed}
                 </span>`
              : ''
          }

        </div>
      `
      : '';


  const awayCards =
    awayYellow > 0 || awayRed > 0
      ? `
        <div class="team-card-counts">

          ${
            awayYellow > 0
              ? `<span class="yellow-card-count">
                   🟨 ${awayYellow}
                 </span>`
              : ''
          }

          ${
            awayRed > 0
              ? `<span class="red-card-count">
                   🟥 ${awayRed}
                 </span>`
              : ''
          }

        </div>
      `
      : '';


  item.innerHTML = `

    <div class="fixture-card-header">

      <span class="fixture-status">
        ${
          scoreText
            ? 'FULL TIME'
            : 'UPCOMING FIXTURE'
        }
      </span>

      <span class="fixture-competition">
        ${fixture.competition || 'Friendly'}
      </span>

    </div>


    <div class="fixture-matchup">


      <!-- RENFREW -->

      <div class="fixture-team">

        <div class="fixture-logo-shell">

          <img
            class="fixture-team-logo"
            src="${homeLogo}"
            alt="${HOME_TEAM_NAME} logo"
          />

        </div>

        <h4>
  ${HOME_TEAM_NAME}
</h4>

${homeCards}

${playerCardDisplay}

      </div>


      <!-- SCORE -->

      <div class="fixture-versus">

        ${
          scoreText
            ? `
              <span
                class="score-badge ${scoreClass}"
              >
                ${fixture.homeScore}
                -
                ${fixture.awayScore}
              </span>
            `
            : `
              <span>VS</span>
            `
        }

      </div>


      <!-- OPPONENT -->

      <div class="fixture-team">

        <div class="fixture-logo-shell">

          <img
            class="fixture-team-logo"
            src="${opponentLogo}"
            alt="${fixture.opponent || 'Opponent'} logo"
          />

        </div>

        <h4>
          ${fixture.opponent || 'Opponent'}
        </h4>

        ${awayCards}

      </div>

    </div>


    <div class="fixture-meta">

      <span>
        📍 ${fixture.location || 'Location TBC'}
      </span>

      <span>
        🕐 ${fixture.date || 'Date / time TBC'}
      </span>

    </div>


    ${
      fixture.manOfTheMatch === true
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


    <div class="fixture-actions">

      ${
        auth.currentUser
          ? `
            <button
              class="report-button"
              data-id="${fixture.id}"
            >
              Match Report
            </button>
          `
          : ''
      }

      ${
        auth.currentUser && fixture.id
          ? `
            <button
              class="delete-fixture-button"
              data-id="${fixture.id}"
            >
              Delete
            </button>
          `
          : ''
      }

    </div>

  `;


  /* =======================================================
     LOGO FALLBACK
  ======================================================= */

  item
    .querySelectorAll('.fixture-team-logo')
    .forEach(logo => {

      logo.addEventListener(
        'error',
        () => {
          logo.src =
            DEFAULT_OPPONENT_LOGO;
        },
        { once: true }
      );

    });


  /* =======================================================
     MATCH REPORT
  ======================================================= */

  const reportButton =
    item.querySelector(
      '.report-button'
    );

  const viewReportButton =
    item.querySelector(
      '.view-report-button'
    );

  const matchReport =
    item.querySelector(
      '.match-report'
    );


  if (reportButton) {

    reportButton.addEventListener(
      'click',
      () => {

        if (
          typeof window.openMatchReport ===
          'function'
        ) {
          window.openMatchReport(
            fixture
          );
        }

      }
    );

  }


  if (
    viewReportButton &&
    matchReport
  ) {

    matchReport
      .querySelector('p')
      .textContent =
      fixture.report || '';


    viewReportButton.addEventListener(
      'click',
      function () {

        matchReport.classList.toggle(
          'hidden'
        );

        this.textContent =
          matchReport.classList.contains(
            'hidden'
          )
            ? 'View Match Report'
            : 'Hide Match Report';

      }
    );

  }


  /* =======================================================
     DELETE
  ======================================================= */

  const deleteButton =
    item.querySelector(
      '.delete-fixture-button'
    );

  if (deleteButton) {

    deleteButton.addEventListener(
      'click',
      () => {
        deleteFixture(
          fixture.id
        );
      }
    );

  }


  return item;
}


/* =========================================================
   RENDER
========================================================= */

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


  displayed.forEach(fixture => {

    list.appendChild(
      createFixtureItem(
        fixture
      )
    );

  });

}


/* =========================================================
   ADD FIXTURE
========================================================= */

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

    manOfTheMatch:
      false,

    createdAt:
      serverTimestamp()

  };


  try {

    const docRef =
      await addDoc(
        fixturesCollection,
        payload
      );

    return {

      remoteSaved: true,

      fixture: {
        id: docRef.id,
        ...payload
      }

    };

  } catch (error) {

    console.warn(
      'Saving fixture locally due to remote failure:',
      error
    );

    const fixtures =
      getLocalFixtures();

    fixtures.push(payload);

    saveLocalFixtures(
      fixtures
    );

    return {

      remoteSaved: false,

      fixture: payload,

      error

    };

  }

}


/* =========================================================
   DELETE
========================================================= */

export async function deleteFixture(
  fixtureId
) {

  if (
    !confirm(
      'Delete this fixture?'
    )
  ) {
    return false;
  }


  try {

    await deleteDoc(
      doc(
        fixturesCollection,
        fixtureId
      )
    );

    return true;

  } catch (error) {

    console.error(
      'Error deleting fixture:',
      error
    );

    alert(
      'Unable to delete fixture.'
    );

    return false;

  }

}


/* =========================================================
   SAVE SCORE
========================================================= */

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

      scorePostedAt:
        serverTimestamp()

    }
  );

}


/* =========================================================
   SAVE MAN OF THE MATCH
========================================================= */

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


/* =========================================================
   SAVE MATCH REPORT
========================================================= */

export async function editMatchReport(
  fixture
) {

  const report =
    prompt(
      'Enter match report:',
      fixture.report || ''
    );


  if (report === null) {
    return false;
  }


  try {

    await updateDoc(
      doc(
        fixturesCollection,
        fixture.id
      ),
      {

        report

      }
    );

    return true;

  } catch (error) {

    console.error(
      'Failed to save match report:',
      error
    );

    alert(
      'Unable to save match report.'
    );

    return false;

  }

}


/* =========================================================
   UPDATE COMPLETE MATCH
========================================================= */

export async function updateMatch(fixtureId, values) {

  // Extra security check — editor must be logged in
  if (!auth.currentUser) {
    throw new Error('Admin login required.');
  }

  if (!fixtureId) {
    throw new Error('No fixture selected.');
  }

  const fixtureRef = doc(
    fixturesCollection,
    fixtureId
  );

  await updateDoc(fixtureRef, {

    date: values.date,

    opponent: values.opponent,

    competition:
      values.competition || 'Friendly',

    location:
      values.location || 'TBC',

    homeScore:
      values.homeScore === ''
        ? null
        : Number(values.homeScore),

    awayScore:
      values.awayScore === ''
        ? null
        : Number(values.awayScore),

    /* TEAM CARDS */

    homeYellowCards:
      Number(values.homeYellowCards || 0),

    homeRedCards:
      Number(values.homeRedCards || 0),

    awayYellowCards:
      Number(values.awayYellowCards || 0),

    awayRedCards:
      Number(values.awayRedCards || 0),

    /* KYLE'S CARDS */

  playerCard:
  values.playerCard || 'none',

    /* OTHER MATCH INFORMATION */

    manOfTheMatch:
      Boolean(values.manOfTheMatch),

    report:
      values.report || '',

    updatedAt:
      serverTimestamp()

  });

  return true;
}
