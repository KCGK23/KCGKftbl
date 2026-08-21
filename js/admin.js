import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase.js';
import { loadFixtures, renderFixtures, getFixtures, addFixture, saveScore, saveManOfTheMatch } from './fixtures.js';
import { loadPlayerStats, savePlayerStats } from './stats.js';
import { loadTournaments, editTournament, addMatchRow, saveTournament } from './tournaments.js';

const unlocked = () => Boolean(auth.currentUser);
function message(text, type='') { const node=document.getElementById('fixtureAccessMessage'); if(node){node.textContent=text;node.className=`fixture-message ${type}`;} }
function syncUi() { const yes=unlocked(); document.querySelectorAll('[data-admin-only]').forEach(node=>node.classList.toggle('hidden',!yes)); document.getElementById('unlockFixturesButton')?.classList.toggle('hidden',yes); document.getElementById('logoutButton')?.classList.toggle('hidden',!yes); if(!yes) message('Log in to manage fixtures, scores, tournaments, and player stats.'); }
async function refresh() { const {fixtures,remoteFailed}=await loadFixtures(); renderFixtures(document.getElementById('fixtureList'),fixtures,{allowAdminActions:true}); populateScores(fixtures); await loadTournaments(); if(remoteFailed) message('Remote storage unavailable. Loaded locally saved fixtures.','error'); }
function populateScores(fixtures) { const select=document.getElementById('scoreFixtureSelect'); if(!select)return; select.innerHTML='<option value="">Select fixture</option>'; fixtures.filter(item=>item.id).forEach(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=`${item.date} — ${item.opponent}`;select.append(option);}); }
export function initAdmin() {
  onAuthStateChanged(auth, async () => { syncUi(); await refresh(); });
  document.getElementById('unlockFixturesButton').onclick=async()=>{ try { await signInWithEmailAndPassword(auth,document.getElementById('fixtureEmail').value.trim(),document.getElementById('fixturePassword').value); localStorage.setItem('fixturesUnlocked','true'); message('Fixture editor unlocked.','success'); } catch { message('Incorrect email or password.','error'); } };
  document.getElementById('logoutButton').onclick=async()=>{await signOut(auth);localStorage.removeItem('fixturesUnlocked');};
  document.getElementById('fixtureForm').addEventListener('submit',async event=>{event.preventDefault();const result=await addFixture({date:fixtureDate.value,opponent:fixtureOpponent.value.trim(),competition:fixtureComp.value.trim(),location:fixtureLocation.value.trim()});message(result.remoteSaved?'Fixture saved to Firebase.':'Saved locally because remote storage is unavailable.',result.remoteSaved?'success':'error');event.target.reset();await refresh();});
  document.getElementById('scoreFixtureSelect').onchange=()=>{const item=getFixtures().find(value=>value.id===scoreFixtureSelect.value);scoreHome.value=item?.homeScore ?? '';scoreAway.value=item?.awayScore ?? '';manOfTheMatch.checked=item?.manOfTheMatch===true;};
  document.getElementById('saveScoreButton').onclick=async()=>{if(!scoreFixtureSelect.value||scoreHome.value===''||scoreAway.value==='')return;await saveScore(scoreFixtureSelect.value,scoreHome.value,scoreAway.value);await refresh();};
  document.getElementById('saveManOfTheMatchButton').onclick=async()=>{if(!scoreFixtureSelect.value)return;await saveManOfTheMatch(scoreFixtureSelect.value,manOfTheMatch.checked);await refresh();};
  document.getElementById('saveStatsButton').onclick=async()=>{try{await savePlayerStats({kitNumber:editKitNumber.value,yellowCards:editYellowCards.value,redCards:editRedCards.value,injuries:editInjuries.value||'None'});statsSaveMessage.textContent='Stats saved to Firebase.';}catch{statsSaveMessage.textContent='Unable to save stats.';}};
  document.getElementById('createTournamentButton').onclick=()=>editTournament();document.getElementById('addTournamentMatchButton').onclick=()=>addMatchRow();document.getElementById('saveTournamentButton').onclick=async()=>{try{await saveTournament();tournamentEditorMessage.textContent='Tournament saved to Firebase.';}catch(error){tournamentEditorMessage.textContent=error.message||'Unable to save tournament.';}};document.getElementById('cancelTournamentButton').onclick=()=>tournamentEditPanel.classList.add('hidden');
  loadPlayerStats(); syncUi(); refresh();
}
