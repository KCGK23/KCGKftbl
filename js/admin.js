import {
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from './firebase.js';

import {
  loadFixtures,
  renderFixtures,
  getFixtures,
  addFixture,
  saveScore,
  saveManOfTheMatch,
  updateMatch,
  deleteFixture
} from './fixtures.js';

import {
  loadPlayerStats,
  savePlayerStats
} from './stats.js';

import {
  loadTournaments,
  editTournament,
  addMatchRow,
  saveTournament
} from './tournaments.js';


/* =========================================================
   ADMIN ACCESS
========================================================= */

const unlocked = () =>
  Boolean(auth.currentUser);


/* =========================================================
   MESSAGE
========================================================= */

function message(text, type = '') {

  const node =
    document.getElementById(
      'fixtureAccessMessage'
    );

  if (node) {

    node.textContent = text;

    node.className =
      `fixture-message ${type}`;

  }

}


/* =========================================================
   ADMIN UI
========================================================= */

function syncUi() {

  const loggedIn =
    unlocked();

  document
    .querySelectorAll(
      '[data-admin-only]'
    )
    .forEach(node => {

      node.classList.toggle(
        'hidden',
        !loggedIn
      );

    });


  document
    .getElementById(
      'unlockFixturesButton'
    )
    ?.classList.toggle(
      'hidden',
      loggedIn
    );


  document
    .getElementById(
      'logoutButton'
    )
    ?.classList.toggle(
      'hidden',
      !loggedIn
    );


  if (!loggedIn) {

    message(
      'Log in to manage fixtures, scores, tournaments, and player stats.'
    );

  }

}


/* =========================================================
   REFRESH EVERYTHING
========================================================= */

async function refresh() {

  const {
    fixtures,
    remoteFailed
  } =
    await loadFixtures();


  renderFixtures(
    document.getElementById(
      'fixtureList'
    ),
    fixtures,
    {
      allowAdminActions:
        unlocked()
    }
  );


  populateScores(
    fixtures
  );


  populateMatchEditor(
    fixtures
  );


  await loadTournaments();


  if (remoteFailed) {

    message(
      'Remote storage unavailable. Loaded locally saved fixtures.',
      'error'
    );

  }

}


/* =========================================================
   SCORE EDITOR
========================================================= */

function populateScores(fixtures) {

  const select =
    document.getElementById(
      'scoreFixtureSelect'
    );

  if (!select) return;


  select.innerHTML =
    '<option value="">Select fixture</option>';


  fixtures
    .filter(fixture => fixture.id)
    .forEach(fixture => {

      const option =
        document.createElement(
          'option'
        );

      option.value =
        fixture.id;

      option.textContent =
        `${fixture.date} — ${fixture.opponent}`;

      select.appendChild(
        option
      );

    });

}


/* =========================================================
   MATCH EDITOR
========================================================= */

function populateMatchEditor(fixtures) {

  const select =
    document.getElementById(
      'editFixtureSelect'
    );

  if (!select) return;


  select.innerHTML =
    '<option value="">Select fixture</option>';


  fixtures
    .filter(fixture => fixture.id)
    .forEach(fixture => {

      const option =
        document.createElement(
          'option'
        );

      option.value =
        fixture.id;

      option.textContent =
        `${fixture.date || 'No date'} — ${fixture.opponent || 'Opponent'}`;

      select.appendChild(
        option
      );

    });

}


/* =========================================================
   LOAD SELECTED MATCH
========================================================= */

function loadSelectedMatch() {

  const select =
    document.getElementById(
      'editFixtureSelect'
    );

  if (!select) return;


  const fixture =
    getFixtures().find(
      item =>
        item.id ===
        select.value
    );


  if (!fixture) {

    clearMatchEditor();

    return;

  }


  document.getElementById(
    'editFixtureDate'
  ).value =
    fixture.date || '';


  document.getElementById(
    'editFixtureOpponent'
  ).value =
    fixture.opponent || '';


  document.getElementById(
    'editFixtureComp'
  ).value =
    fixture.competition || 'Friendly';


  document.getElementById(
    'editFixtureLocation'
  ).value =
    fixture.location || '';


  document.getElementById(
    'editHomeScore'
  ).value =
    typeof fixture.homeScore === 'number'
      ? fixture.homeScore
      : '';


  document.getElementById(
    'editAwayScore'
  ).value =
    typeof fixture.awayScore === 'number'
      ? fixture.awayScore
      : '';


  document.getElementById(
    'editHomeYellow'
  ).value =
    Number(
      fixture.homeYellowCards || 0
    );


  document.getElementById(
    'editHomeRed'
  ).value =
    Number(
      fixture.homeRedCards || 0
    );


  document.getElementById(
    'editAwayYellow'
  ).value =
    Number(
      fixture.awayYellowCards || 0
    );


  document.getElementById(
    'editAwayRed'
  ).value =
    Number(
      fixture.awayRedCards || 0
    );

const playerCard =
  fixture.playerCard ||
  (Number(fixture.playerRedCards || 0) > 0
    ? 'red'
    : Number(fixture.playerYellowCards || 0) > 0
      ? 'yellow'
      : 'none');

document.getElementById('editPlayerNoCard').checked =
  playerCard === 'none';

document.getElementById('editPlayerYellow').checked =
  playerCard === 'yellow';

document.getElementById('editPlayerRed').checked =
  playerCard === 'red';


  document.getElementById(
    'editManOfTheMatch'
  ).checked =
    fixture.manOfTheMatch === true;


  document.getElementById(
    'editMatchReport'
  ).value =
    fixture.report || '';


  document.getElementById(
    'matchEditorMessage'
  ).textContent =
    '';

}


/* =========================================================
   CLEAR EDITOR
========================================================= */

function clearMatchEditor() {

  const ids = [

    'editFixtureDate',
    'editFixtureOpponent',
    'editFixtureComp',
    'editFixtureLocation',
    'editHomeScore',
    'editAwayScore',
    'editMatchReport'

  ];


  ids.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {
      element.value = '';
    }

  });


  document.getElementById(
    'editHomeYellow'
  ).value = 0;

  document.getElementById(
    'editHomeRed'
  ).value = 0;

  document.getElementById(
    'editAwayYellow'
  ).value = 0;

  document.getElementById(
    'editAwayRed'
  ).value = 0;

  document.getElementById(
    'editPlayerYellow'
  ).value = 0;

  document.getElementById(
    'editPlayerRed'
  ).value = 0;

  document.getElementById(
    'editManOfTheMatch'
  ).checked = false;

}


/* =========================================================
   SAVE MATCH
========================================================= */

async function saveCompleteMatch() {

  const messageBox =
    document.getElementById(
      'matchEditorMessage'
    );


  /* REAL AUTH CHECK */

  if (!auth.currentUser) {

    messageBox.textContent =
      'Admin login required.';

    return;

  }


  const fixtureId =
    document.getElementById(
      'editFixtureSelect'
    ).value;


  if (!fixtureId) {

    messageBox.textContent =
      'Select a fixture first.';

    return;

  }


  const values = {

    date:
      document.getElementById(
        'editFixtureDate'
      ).value,

    opponent:
      document.getElementById(
        'editFixtureOpponent'
      ).value.trim(),

    competition:
      document.getElementById(
        'editFixtureComp'
      ).value.trim(),

    location:
      document.getElementById(
        'editFixtureLocation'
      ).value.trim(),

    homeScore:
      document.getElementById(
        'editHomeScore'
      ).value,

    awayScore:
      document.getElementById(
        'editAwayScore'
      ).value,

    homeYellowCards:
      document.getElementById(
        'editHomeYellow'
      ).value,

    homeRedCards:
      document.getElementById(
        'editHomeRed'
      ).value,

    awayYellowCards:
      document.getElementById(
        'editAwayYellow'
      ).value,

    awayRedCards:
      document.getElementById(
        'editAwayRed'
      ).value,

    playerYellowCards:
      document.getElementById(
        'editPlayerYellow'
      ).value,

    playerRedCards:
      document.getElementById(
        'editPlayerRed'
      ).value,

    manOfTheMatch:
      document.getElementById(
        'editManOfTheMatch'
      ).checked,

    report:
      document.getElementById(
        'editMatchReport'
      ).value.trim()

  };


  if (!values.opponent) {

    messageBox.textContent =
      'Please enter an opponent.';

    return;

  }


  try {

    messageBox.textContent =
      'Saving...';


    await updateMatch(
      fixtureId,
      values
    );


    messageBox.textContent =
      '✅ Match updated successfully.';


    await refresh();


    document.getElementById(
      'editFixtureSelect'
    ).value =
      fixtureId;


    loadSelectedMatch();


    messageBox.textContent =
      '✅ Match updated successfully.';

  } catch (error) {

    console.error(
      'Match update failed:',
      error
    );


    messageBox.textContent =
      `❌ ${error.message || 'Unable to save match.'}`;

  }

}


/* =========================================================
   DELETE MATCH
========================================================= */

async function deleteSelectedMatch() {

  if (!auth.currentUser) {

    document.getElementById(
      'matchEditorMessage'
    ).textContent =
      'Admin login required.';

    return;

  }


  const fixtureId =
    document.getElementById(
      'editFixtureSelect'
    ).value;


  if (!fixtureId) {

    document.getElementById(
      'matchEditorMessage'
    ).textContent =
      'Select a fixture first.';

    return;

  }


  if (
    !confirm(
      'Are you sure you want to delete this match?'
    )
  ) {
    return;
  }


  try {

    await deleteFixture(
      fixtureId
    );


    document.getElementById(
      'matchEditorMessage'
    ).textContent =
      'Match deleted.';


    clearMatchEditor();


    await refresh();

  } catch (error) {

    console.error(
      error
    );

  }

}


/* =========================================================
   ADMIN INIT
========================================================= */

export function initAdmin() {

  /* AUTH STATE */

  onAuthStateChanged(
    auth,
    async () => {

      syncUi();

      await refresh();

    }
  );


  /* LOGIN */

  document
    .getElementById(
      'unlockFixturesButton'
    )
    .onclick =
    async () => {

      try {

        await signInWithEmailAndPassword(
          auth,

          document
            .getElementById(
              'fixtureEmail'
            )
            .value
            .trim(),

          document
            .getElementById(
              'fixturePassword'
            )
            .value
        );


        localStorage.setItem(
          'fixturesUnlocked',
          'true'
        );


        message(
          'Fixture editor unlocked.',
          'success'
        );

      } catch {

        message(
          'Incorrect email or password.',
          'error'
        );

      }

    };


  /* LOGOUT */

  document
    .getElementById(
      'logoutButton'
    )
    .onclick =
    async () => {

      await signOut(
        auth
      );

      localStorage.removeItem(
        'fixturesUnlocked'
      );

    };


  /* ADD FIXTURE */

  document
    .getElementById(
      'fixtureForm'
    )
    .addEventListener(
      'submit',
      async event => {

        event.preventDefault();


        if (!auth.currentUser) {

          return;

        }


        const result =
          await addFixture({

            date:
              fixtureDate.value,

            opponent:
              fixtureOpponent
                .value
                .trim(),

            competition:
              fixtureComp
                .value
                .trim(),

            location:
              fixtureLocation
                .value
                .trim()

          });


        message(
          result.remoteSaved
            ? 'Fixture saved to Firebase.'
            : 'Saved locally because remote storage is unavailable.',

          result.remoteSaved
            ? 'success'
            : 'error'
        );


        event.target.reset();

        await refresh();

      }
    );


  /* OLD SCORE EDITOR */

  document
    .getElementById(
      'scoreFixtureSelect'
    )
    ?.addEventListener(
      'change',
      () => {

        const item =
          getFixtures().find(
            value =>
              value.id ===
              document
                .getElementById(
                  'scoreFixtureSelect'
                )
                .value
          );


        if (!item) return;


        scoreHome.value =
          item.homeScore ?? '';

        scoreAway.value =
          item.awayScore ?? '';

        manOfTheMatch.checked =
          item.manOfTheMatch === true;

      }
    );


  document
    .getElementById(
      'saveScoreButton'
    )
    ?.addEventListener(
      'click',
      async () => {

        if (!auth.currentUser) return;


        const select =
          document.getElementById(
            'scoreFixtureSelect'
          );


        if (
          !select.value ||
          scoreHome.value === '' ||
          scoreAway.value === ''
        ) {
          return;
        }


        await saveScore(
          select.value,
          scoreHome.value,
          scoreAway.value
        );


        await refresh();

      }
    );


  document
    .getElementById(
      'saveManOfTheMatchButton'
    )
    ?.addEventListener(
      'click',
      async () => {

        if (!auth.currentUser) return;


        const select =
          document.getElementById(
            'scoreFixtureSelect'
          );


        if (!select.value) return;


        await saveManOfTheMatch(
          select.value,
          manOfTheMatch.checked
        );


        await refresh();

      }
    );


  /* =======================================================
     NEW MATCH EDITOR
  ======================================================= */

  document
    .getElementById(
      'editFixtureSelect'
    )
    ?.addEventListener(
      'change',
      loadSelectedMatch
    );


  document
    .getElementById(
      'saveMatchButton'
    )
    ?.addEventListener(
      'click',
      saveCompleteMatch
    );


  document
    .getElementById(
      'clearMatchEditorButton'
    )
    ?.addEventListener(
      'click',
      clearMatchEditor
    );


  /* =======================================================
     PLAYER STATS
  ======================================================= */

  document
    .getElementById(
      'saveStatsButton'
    )
    ?.addEventListener(
      'click',
      async () => {

        if (!auth.currentUser) return;


        try {

          await savePlayerStats({

            kitNumber:
              editKitNumber.value,

            yellowCards:
              editYellowCards.value,

            redCards:
              editRedCards.value,

            injuries:
              editInjuries.value ||
              'None'

          });


          statsSaveMessage.textContent =
            'Stats saved to Firebase.';

        } catch {

          statsSaveMessage.textContent =
            'Unable to save stats.';

        }

      }
    );


  /* =======================================================
     TOURNAMENTS
  ======================================================= */

  document
    .getElementById(
      'createTournamentButton'
    )
    ?.addEventListener(
      'click',
      () =>
        editTournament()
    );


  document
    .getElementById(
      'addTournamentMatchButton'
    )
    ?.addEventListener(
      'click',
      () =>
        addMatchRow()
    );


  document
    .getElementById(
      'saveTournamentButton'
    )
    ?.addEventListener(
      'click',
      async () => {

        try {

          await saveTournament();

          tournamentEditorMessage.textContent =
            'Tournament saved to Firebase.';

        } catch (error) {

          tournamentEditorMessage.textContent =
            error.message ||
            'Unable to save tournament.';

        }

      }
    );


  document
    .getElementById(
      'cancelTournamentButton'
    )
    ?.addEventListener(
      'click',
      () =>
        tournamentEditPanel
          .classList
          .add('hidden')
    );


  /* INITIAL LOAD */

  loadPlayerStats();

  syncUi();

  refresh();

}