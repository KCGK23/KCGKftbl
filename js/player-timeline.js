import { auth, statsDocRef, getDoc, setDoc } from './firebase.js';

const starterTimeline = [
  {
    date: 'First season',
    title: 'Where it all began',
    description: 'Add the team and season where your football journey started.'
  },
  {
    date: 'Current chapter',
    title: 'Renfrew Juniors',
    description: 'Goalkeeper wearing number 23.'
  },
  {
    date: 'Up next',
    title: 'The next milestone',
    description: 'Add a memorable save, clean-sheet streak, tournament, or personal best.'
  }
];

const icons = ['⚽', '🧤', '🏆', '⭐', '🥇', '📍'];

export async function loadPlayerTimeline() {
  const snapshot = await getDoc(statsDocRef);
  const entries = snapshot.exists() ? snapshot.data().playerTimeline : null;
  return Array.isArray(entries) && entries.length ? entries : starterTimeline;
}

export async function savePlayerTimeline(entries) {
  if (!auth.currentUser) throw new Error('Log in as an admin to save the timeline.');
  const cleanEntries = entries
    .map(entry => ({
      date: String(entry.date || '').trim(),
      title: String(entry.title || '').trim(),
      description: String(entry.description || '').trim()
    }))
    .filter(entry => entry.date || entry.title || entry.description);
  if (!cleanEntries.length) throw new Error('Add at least one timeline milestone.');
  if (cleanEntries.some(entry => !entry.date || !entry.title || !entry.description)) {
    throw new Error('Fill in the date, heading, and story for each milestone.');
  }
  await setDoc(statsDocRef, { playerTimeline: cleanEntries }, { merge: true });
  return cleanEntries;
}

function makeTimelineItem(entry, index) {
  const item = document.createElement('li');
  item.className = `timeline-item${entry.date.toLowerCase() === 'current chapter' ? ' timeline-item--current' : ''}`;
  const marker = document.createElement('span');
  marker.className = 'timeline-marker';
  marker.setAttribute('aria-hidden', 'true');
  marker.textContent = icons[index % icons.length];
  const content = document.createElement('div');
  content.className = 'timeline-content';
  const date = document.createElement('span');
  date.className = 'timeline-date';
  date.textContent = entry.date;
  const title = document.createElement('h3');
  title.textContent = entry.title;
  const description = document.createElement('p');
  description.textContent = entry.description;
  content.append(date, title, description);
  item.append(marker, content);
  return item;
}

export async function renderPlayerTimeline() {
  const list = document.getElementById('playerTimelineList');
  if (!list) return;
  try {
    const entries = await loadPlayerTimeline();
    list.replaceChildren(...entries.map(makeTimelineItem));
  } catch (error) {
    console.warn('Unable to load player timeline:', error);
    list.replaceChildren(...starterTimeline.map(makeTimelineItem));
  }
}

function createEditorRow(entry = {}) {
  const row = document.createElement('div');
  row.className = 'timeline-editor-row';
  row.innerHTML = `
    <div class="fixture-row">
      <label>Season or date<input class="timeline-edit-date" maxlength="40" placeholder="e.g. 2024/25"></label>
      <label>Milestone heading<input class="timeline-edit-title" maxlength="70" placeholder="e.g. First clean sheet"></label>
    </div>
    <label>Story<textarea class="timeline-edit-description" rows="3" maxlength="240" placeholder="Add a short detail about this milestone"></textarea></label>
    <div class="timeline-editor-actions">
      <button class="secondary-button timeline-move-up" type="button" aria-label="Move milestone earlier">↑ Earlier</button>
      <button class="secondary-button timeline-move-down" type="button" aria-label="Move milestone later">↓ Later</button>
      <button class="secondary-button timeline-remove-button" type="button">Remove milestone</button>
    </div>`;
  row.querySelector('.timeline-edit-date').value = entry.date || '';
  row.querySelector('.timeline-edit-title').value = entry.title || '';
  row.querySelector('.timeline-edit-description').value = entry.description || '';
  row.querySelector('.timeline-move-up').addEventListener('click', () => {
    const previous = row.previousElementSibling;
    if (previous) row.parentElement.insertBefore(row, previous);
    updateTimelineRowButtons();
  });
  row.querySelector('.timeline-move-down').addEventListener('click', () => {
    const next = row.nextElementSibling;
    if (next) row.parentElement.insertBefore(next, row);
    updateTimelineRowButtons();
  });
  row.querySelector('.timeline-remove-button').addEventListener('click', () => {
    row.remove();
    updateTimelineRowButtons();
  });
  return row;
}

function updateTimelineRowButtons() {
  const rows = [...document.querySelectorAll('#timelineEditorRows .timeline-editor-row')];
  rows.forEach((row, index) => {
    row.querySelector('.timeline-remove-button').disabled = rows.length === 1;
    row.querySelector('.timeline-remove-button').textContent = `Remove milestone ${index + 1}`;
    row.querySelector('.timeline-move-up').disabled = index === 0;
    row.querySelector('.timeline-move-down').disabled = index === rows.length - 1;
  });
}

export async function initPlayerTimelineEditor() {
  const rows = document.getElementById('timelineEditorRows');
  if (!rows) return;
  try {
    const entries = await loadPlayerTimeline();
    rows.replaceChildren(...entries.map(createEditorRow));
  } catch (error) {
    console.warn('Unable to load timeline editor:', error);
    rows.replaceChildren(...starterTimeline.map(createEditorRow));
  }
  updateTimelineRowButtons();
  document.getElementById('addTimelineMilestoneButton')?.addEventListener('click', () => {
    rows.append(createEditorRow());
    updateTimelineRowButtons();
    rows.lastElementChild.querySelector('.timeline-edit-date').focus();
  });
  document.getElementById('saveTimelineButton')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const message = document.getElementById('timelineSaveMessage');
    if (!auth.currentUser) {
      message.textContent = 'Log in as an admin to edit the timeline.';
      return;
    }
    const entries = [...rows.querySelectorAll('.timeline-editor-row')].map(row => ({
      date: row.querySelector('.timeline-edit-date').value,
      title: row.querySelector('.timeline-edit-title').value,
      description: row.querySelector('.timeline-edit-description').value
    }));
    button.disabled = true;
    message.textContent = 'Saving timeline…';
    try {
      const saved = await savePlayerTimeline(entries);
      rows.replaceChildren(...saved.map(createEditorRow));
      updateTimelineRowButtons();
      message.textContent = 'Timeline saved. It will appear on the home page.';
    } catch (error) {
      message.textContent = error.message || 'Unable to save the timeline.';
    } finally {
      button.disabled = false;
    }
  });
}
