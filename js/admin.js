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
  savePlayerStats,
  loadSeasonSettings,
  saveSeasonSettings,
  deleteSeason,
  getSeasonNames,
  UNASSIGNED_SEASON_KEY
} from './stats.js';

import {
  loadTournaments,
  editTournament,
  addMatchRow,
  saveTournament
} from './tournaments.js';
import {
  loadCustomTeamLogos,
  saveCustomTeamLogo
} from './team-logos.js';
import { initPlayerTimelineEditor } from './player-timeline.js?v=horizontal-timeline-editor-fix';

let currentSeasonSettings = {};

function prepareBadgeImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      reject(new Error('Choose a PNG, JPG, or WebP image.'));
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, 360 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

      let dataUrl = canvas.toDataURL('image/webp', 0.82);
      if (dataUrl.length > 320_000) dataUrl = canvas.toDataURL('image/webp', 0.62);
      if (dataUrl.length > 320_000) {
        canvas.width = Math.max(1, Math.round(canvas.width * 0.7));
        canvas.height = Math.max(1, Math.round(canvas.height * 0.7));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/webp', 0.52);
      }
      if (dataUrl.length > 320_000) {
        reject(new Error('That image is too large after compression. Choose a smaller badge image.'));
        return;
      }
      resolve(dataUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('That image could not be opened.'));
    };
    image.src = objectUrl;
  });
}

async function renderCustomTeamLogoGallery() {
  const gallery = document.getElementById('customTeamLogoGallery');
  if (!gallery) return;

  gallery.replaceChildren();
  const logos = await loadCustomTeamLogos();
  if (!logos.length) {
    const empty = document.createElement('p');
    empty.className = 'custom-logo-gallery-empty';
    empty.textContent = 'No custom team badges added yet.';
    gallery.append(empty);
    return;
  }

  logos.forEach(logo => {
    const card = document.createElement('article');
    card.className = 'custom-logo-gallery-item';
    const image = document.createElement('img');
    image.src = logo.imageDataUrl;
    image.alt = `${logo.name} badge`;
    const details = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = logo.name;
    const aliases = document.createElement('span');
    aliases.textContent = (logo.names || []).join(' · ');
    details.append(name, aliases);
    card.append(image, details);
    gallery.append(card);
  });
}

function populateSeasonManager(fixtures, settings) {
  currentSeasonSettings = settings;
  const selector = document.getElementById('editSeasonSelector');
  if (!selector) return;
  selector.innerHTML = '<option value="">+ New season</option>';
  getSeasonNames(fixtures, settings).forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    const status = settings.seasonStatuses?.[name] ||
      (name === settings.seasonName ? settings.seasonStatus : 'ended');
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
  document.getElementById('deleteSeasonButton').disabled = !selector.value;
  document.getElementById('editSeasonName').value = settings.seasonName || '';
  document.getElementById('editSeasonStatus').value = settings.seasonStatus || 'active';
}


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
      'Log in to manage fixtures, scores, tournaments, player stats, and the player timeline.'
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

  try {
    const seasonSettings = await loadSeasonSettings();
    populateSeasonManager(fixtures, seasonSettings);
  } catch (error) {
    console.warn('Unable to load season settings:', error);
  }

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

  document.getElementById('editFixtureTime').value =
    fixture.time || '';


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

  document.getElementById('editFixtureStatus').value =
    fixture.status || (
      typeof fixture.homeScore === 'number' &&
      typeof fixture.awayScore === 'number'
        ? 'completed'
        : 'upcoming'
    );

  document.getElementById('editGoalkeeperParticipation').value =
    fixture.goalkeeperParticipation || 'full';
  document.getElementById('editOpponentScoreAtSubstitution').value =
    fixture.opponentScoreAtSubstitution ?? '';

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
  fixture.playerCard || 'none';

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
    'editFixtureTime',
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


  const statusSelect = document.getElementById('editFixtureStatus');
  if (statusSelect) statusSelect.value = 'upcoming';
  document.getElementById('editGoalkeeperParticipation').value = 'full';
  document.getElementById('editOpponentScoreAtSubstitution').value = '';

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
  'editPlayerNoCard'
).checked = true;

document.getElementById(
  'editPlayerYellow'
).checked = false;

document.getElementById(
  'editPlayerRed'
).checked = false;

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

    time:
      document.getElementById('editFixtureTime').value,

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

    status:
      document.getElementById('editFixtureStatus').value,

    homeScore:
      document.getElementById(
        'editHomeScore'
      ).value,

    awayScore:
      document.getElementById(
        'editAwayScore'
      ).value,

    goalkeeperParticipation:
      document.getElementById('editGoalkeeperParticipation').value,

    opponentScoreAtSubstitution:
      document.getElementById('editOpponentScoreAtSubstitution').value,

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

    playerCard:
  document.querySelector(
    'input[name="kyleCard"]:checked'
  )?.value || 'none',

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

  if (['subbed-on', 'subbed-off'].includes(values.goalkeeperParticipation) &&
      values.awayScore !== '') {
    const scoreAtSubstitution = Number(values.opponentScoreAtSubstitution);
    if (values.opponentScoreAtSubstitution === '' ||
        !Number.isInteger(scoreAtSubstitution) ||
        scoreAtSubstitution < 0 ||
        scoreAtSubstitution > Number(values.awayScore)) {
      messageBox.textContent = 'Enter the opponent’s score at substitution, from 0 up to the final score.';
      return;
    }
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
      await initPlayerTimelineEditor();

      await refresh();
      if (auth.currentUser) {
        await renderCustomTeamLogoGallery();
      } else {
        document.getElementById('customTeamLogoGallery')?.replaceChildren();
      }

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

            time:
              document.getElementById('fixtureTime').value,

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


  /* CUSTOM TEAM BADGES */

  const logoForm = document.getElementById('teamLogoForm');
  const logoStatus = document.getElementById('customLogoStatus');
  const logoFileInput = document.getElementById('customLogoImage');
  const logoPreview = document.getElementById('customLogoPreview');
  let selectedLogoDataUrl = '';

  const setLogoStatus = (text, type = '') => {
    logoStatus.textContent = text;
    logoStatus.className = `fixture-message ${type}`;
  };

  logoFileInput.addEventListener('change', async () => {
    selectedLogoDataUrl = '';
    logoPreview.hidden = true;
    const file = logoFileInput.files?.[0];
    if (!file) return;

    try {
      selectedLogoDataUrl = await prepareBadgeImage(file);
      logoPreview.src = selectedLogoDataUrl;
      logoPreview.hidden = false;
      setLogoStatus('Badge ready to add to the gallery.', 'success');
    } catch (error) {
      setLogoStatus(error.message, 'error');
    }
  });

  document.getElementById('searchLogoButton').addEventListener('click', () => {
    const name = document.getElementById('customLogoTeamName').value.trim();
    if (!name) {
      setLogoStatus('Enter the team name first, then search for its badge.');
      return;
    }
    const query = encodeURIComponent(`${name} football club badge official`);
    window.open(`https://www.google.com/search?tbm=isch&q=${query}`, '_blank', 'noopener,noreferrer');
  });

  logoForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!auth.currentUser) {
      setLogoStatus('Log in as an admin to update the badge gallery.', 'error');
      return;
    }
    if (!selectedLogoDataUrl) {
      setLogoStatus('Choose a badge image before saving.', 'error');
      return;
    }

    const saveButton = document.getElementById('saveCustomLogoButton');
    saveButton.disabled = true;
    setLogoStatus('Adding badge to the gallery…');
    try {
      await saveCustomTeamLogo({
        name: document.getElementById('customLogoTeamName').value.trim(),
        aliases: document.getElementById('customLogoAliases').value.split(/[,;\n]+/),
        imageDataUrl: selectedLogoDataUrl
      });
      setLogoStatus('Badge added. Matching fixtures will use it automatically.', 'success');
      await renderCustomTeamLogoGallery();
      await refresh();
      logoForm.reset();
      selectedLogoDataUrl = '';
      logoPreview.removeAttribute('src');
      logoPreview.hidden = true;
    } catch (error) {
      console.error('Unable to save custom team badge:', error);
      setLogoStatus(error.message || 'Unable to save the badge. Try again.', 'error');
    } finally {
      saveButton.disabled = false;
    }
  });


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

  document.getElementById('saveSeasonSettingsButton')
    ?.addEventListener('click', async () => {
      const message = document.getElementById('seasonSettingsMessage');
      const targetSeasonName = document.getElementById('editSeasonSelector').value;
      const seasonName = document.getElementById('editSeasonName').value.trim();
      const seasonStatus = document.getElementById('editSeasonStatus').value;
      if (!auth.currentUser) return;
      if (!seasonName) {
        message.textContent = 'Enter a season name first.';
        return;
      }
      try {
        await saveSeasonSettings({ targetSeasonName, seasonName, seasonStatus });
        message.textContent = 'Season settings saved.';
        await refresh();
      } catch (error) {
        message.textContent = error.message || 'Unable to save season settings.';
      }
    });

  document.getElementById('editSeasonSelector')
    ?.addEventListener('change', event => {
      const name = event.target.value;
      const isUnassigned = name === UNASSIGNED_SEASON_KEY;
      document.getElementById('editSeasonName').value = isUnassigned ? '' : name;
      document.getElementById('editSeasonStatus').value = isUnassigned ? 'active' : name
        ? currentSeasonSettings.seasonStatuses?.[name] ||
          (name === currentSeasonSettings.seasonName ? currentSeasonSettings.seasonStatus : 'ended')
        : 'active';
      document.getElementById('deleteSeasonButton').disabled = !name || isUnassigned;
    });

  document.getElementById('startNewSeasonButton')
    ?.addEventListener('click', () => {
      const selector = document.getElementById('editSeasonSelector');
      selector.value = '';
      document.getElementById('editSeasonName').value = '';
      document.getElementById('editSeasonStatus').value = 'active';
      document.getElementById('deleteSeasonButton').disabled = true;
      document.getElementById('seasonSettingsMessage').textContent =
        'Enter the new season name, then save season settings.';
      document.getElementById('editSeasonName').focus();
    });

  document.getElementById('deleteSeasonButton')
    ?.addEventListener('click', async () => {
      const selector = document.getElementById('editSeasonSelector');
      const seasonName = selector.value;
      const message = document.getElementById('seasonSettingsMessage');
      if (!auth.currentUser) return;
      if (!seasonName || seasonName === UNASSIGNED_SEASON_KEY) {
        message.textContent = 'Select a season to remove.';
        return;
      }
      if (!confirm(`Remove ${seasonName} from the season list? Match results will be kept.`)) return;
      try {
        await deleteSeason(seasonName);
        message.textContent = 'Season removed. Match results were kept.';
        await refresh();
      } catch (error) {
        message.textContent = error.message || 'Unable to remove season.';
      }
    });


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
