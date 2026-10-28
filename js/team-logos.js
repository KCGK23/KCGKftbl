import { auth, getDoc, setDoc, statsDocRef } from './firebase.js';

const teamLogos = [
  { file: '03289c33-0736-42cb-9439-fad0e5b471d4.jpeg', names: ['Castlemilk Community', 'Castlemilk Community FC'] },
  { file: '100291.png', names: ['Drumsagard', 'Drumsagard FC'] },
  { file: '77b09c3f-66da-4dc0-b035-deba15bb87de.jpeg', names: ['Kilbirnie Ladeside', 'Kilbirnie Ladeside FC'] },
  { file: '8825396abfb310d9a104ed04dacd60f4.png', names: ['Clydebank', 'Clydebank FC'] },
  { file: 'ardeer.png', names: ['Ardeer', 'Ardeer Thistle'] },
  { file: 'ardgowan(1).jpg', names: ['Ardgowan', 'Ardgowan Thistle'] },
  { file: 'baljaffray.png', names: ['Baljaffray', 'Baljaffray Football Club'] },
  { file: 'balloch.jpg', names: ['Balloch', 'Balloch Juniors'] },
  { file: 'barrhead(8).png', names: ['Barrhead', 'Barrhead Youth'] },
  { file: 'bow.jpg', names: ['Bridge of Weir', 'Bridge of Weir United'] },
  { file: 'brandane.jpg', names: ['Brandane', 'Brandane Bulls'] },
  { file: 'bsc(1).png', names: ['BSC', 'BSC Glasgow'] },
  { file: 'caledonian-braves.png', names: ['Caledonian Braves'] },
  { file: 'cambuslang-fa-blue.jpg', names: ['Cambuslang', 'Cambuslang FA', 'Cambuslang Football Academy'] },
  { file: 'carolside-badge(1).jpg', names: ['Carolside', 'Carolside Athletic'] },
  { file: 'cmfa.jpg', names: ['Charlie Miller', 'Charlie Miller Football Academy', 'CMFA'] },
  { file: 'cranhill-utd.jpg', names: ['Cranhill', 'Cranhill United'] },
  { file: 'dean.jpg', names: ['Dean Thistle'] },
  { file: 'drum-utd(1).jpg', names: ['Drumchapel United', 'Drumchapel Utd'] },
  { file: 'dumbarton-fc(1).png', names: ['Dumbarton FC'] },
  { file: 'dumbarton-utd(1).png', names: ['Dumbarton United', 'Dumbarton Utd'] },
  { file: 'eastend.jpg', names: ['East End', 'East End BC', 'East End Boys Club'] },
  { file: 'erskine(1).jpg', names: ['Erskine', 'Erskine Youth'] },
  { file: 'evro.jpg', names: ['Evro', 'Evro Football Club'] },
  { file: 'ghs.jpg', names: ['Greenock HSFP', 'Greenock HSFP AFC', 'GHSFP'] },
  { file: 'giffnock(1).jpeg', names: ['Giffnock SC', 'Giffnock Soccer Centre', 'Giffnock S C'] },
  { file: 'glasgow-utd.jpg', names: ['Glasgow United', 'Glasgow Utd'] },
  { file: 'glenni.png', names: ['Gleniffer', 'Gleniffer Thistle'] },
  { file: 'glenvale(1).jpg', names: ['Glenvale'] },
  { file: 'greenock-morton-fc-1.png', names: ['Greenock Morton', 'Morton Community'] },
  { file: 'hilwood(1).jpg', names: ['Hilwood', 'Hillwood', 'Hilwood FC'] },
  { file: 'houston(2).jpg', names: ['Houston United', 'Houston United FC'] },
  { file: 'hr.jpg', names: ['Harmony Row', 'Harmony Row YC'] },
  { file: 'image0.png', names: ['Dumbarton Riverside', 'Dumbarton Riverside FC'] },
  { file: 'img_2582.png', names: ['Stamperland', 'Stamperland Athletic'] },
  { file: 'img_2584.jpeg', names: ['Bonnyton', 'Bonnyton Thistle'] },
  { file: 'img_2639.jpeg', names: ['East Kilbride YC', 'East Kilbride Youth'] },
  { file: 'johnstoneburgh(1).jpg', names: ['Johnstone Burgh'] },
  { file: 'js.png', names: ['Johnstone Star', 'Johnstone Stars'] },
  { file: 'kfa.jpg', names: ['Kilmarnock FC Academy', 'Kilmarnock Academy', 'KFA'] },
  { file: 'kilwining-r.jpg', names: ['Kilwinning Rangers', 'Kilwinning Ranges'] },
  { file: 'largs-colts.jpg', names: ['Largs Colts'] },
  { file: 'linwood.jpeg', names: ['Linwood Rangers', 'Linwood Rangers YC', 'Linwood'] },
  { file: 'nk(1).png', names: ['North Kelvin', 'North Kelvin United', 'NK United'] },
  { file: 'oip-(7).jpg', names: ['Castlemilk Dynamo'] },
  { file: 'oip-(9).jpg', names: ['Greenock Juniors'] },
  { file: 'ola-badge-site.png', names: ['Our Lady of Annunciation', 'Our Lady Annunciation', 'OLA'] },
  { file: 'olm(1).jpg', names: ['Our Lady of Lourdes', 'Our Lady Lourdes', 'OLM'] },
  { file: 'parkmoor.jpeg', names: ['Parkmoor'] },
  { file: 'pollok(1).jpeg', names: ['Pollok United', 'Pollok'] },
  { file: 'port-bc(1).jpg', names: ['Port Glasgow Boys Club', 'Port Glasgow BC', 'Port Glasgow B C'] },
  { file: 'port-juniors(1).jpeg', names: ['Port Glasgow Juniors', 'Port Glasgow Juniors CSC'] },
  { file: 'psp-badge(1).jpg', names: ['Park Sports Project', 'PSP'] },
  { file: 'r(1).png', names: ['Bishopton', 'Bishopton FC'] },
  { file: 'renton(1).jpg', names: ['Renton', 'Renton Craigandro'] },
  { file: 'rutherglen.jpg', names: ['Rutherglen'] },
  { file: 'scoutable.png', names: ['Scoutable United', 'Scoutable'] },
  { file: 'st-cadocs-yc(1).jpg', names: ["St Cadoc's", 'St Cadocs', "St Cadoc's Youth Club", 'St Cadocs YC'] },
  { file: 'st-convals(2).jpg', names: ['St Convals', "St Conval's"] },
  { file: 'st-mirren(1).png', names: ['St Mirren', 'St Mirren Youth'] },
  { file: 'st-peters(1).jpg', names: ['St Peters', "St Peter's"] },
  { file: 'standrews(1).jpg', names: ['St Andrews BC', "St Andrew's BC", 'St Andrews'] },
  { file: 'tass-thislte.jpg', names: ['Tass Thistle'] },
  { file: 'thorn.jpeg', names: ['Thorn Athletic', 'Thorn Athletic YFC'] },
  { file: 'vale.jpg', names: ['Vale of Leven'] },
  { file: 'westerton.png', names: ['Westerton United', 'Westerton Athletic', 'Westerton'] },
  { file: 'whitacre-wolves.jpeg', names: ['Whitacre Wolves', 'Whitacre'] }
];

function normalizeTeamName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const searchableNames = teamLogos.flatMap(entry =>
  entry.names.map(name => ({ entry, normalized: normalizeTeamName(name) }))
);

let customTeamLogos = [];
let customTeamLogosLoaded = false;
let customTeamLogosRequest;

export async function loadCustomTeamLogos() {
  if (customTeamLogosLoaded) return customTeamLogos;
  if (customTeamLogosRequest) return customTeamLogosRequest;

  customTeamLogosRequest = getDoc(statsDocRef)
    .then(snapshot => {
      const records = snapshot.exists() ? snapshot.data().customTeamLogos : [];
      customTeamLogos = Array.isArray(records) ? records : [];
      customTeamLogosLoaded = true;
      return customTeamLogos;
    })
    .catch(error => {
      console.warn('Custom team badges could not be loaded:', error);
      customTeamLogosRequest = null;
      return customTeamLogos;
    });

  return customTeamLogosRequest;
}

export async function saveCustomTeamLogo({ name, aliases, imageDataUrl }) {
  if (!auth.currentUser) throw new Error('Log in as an admin to update the badge gallery.');

  name = String(name || '').trim();
  if (!name) throw new Error('Enter the team name.');
  if (!String(imageDataUrl || '').startsWith('data:image/')) {
    throw new Error('Choose a valid image file for the badge.');
  }

  const names = [...new Set([name, ...aliases]
    .map(value => String(value || '').trim())
    .filter(Boolean))];
  const key = normalizeTeamName(name);
  const snapshot = await getDoc(statsDocRef);
  const documentData = snapshot.exists() ? snapshot.data() : {};
  const current = Array.isArray(documentData.customTeamLogos)
    ? documentData.customTeamLogos
    : [];
  const record = {
    key,
    name,
    names,
    imageDataUrl,
    updatedAt: new Date().toISOString()
  };
  const next = current.filter(item => item.key !== key).concat(record);
  const estimatedSize = new TextEncoder().encode(JSON.stringify({
    ...documentData,
    customTeamLogos: next
  })).length;

  if (estimatedSize > 850_000) {
    throw new Error('The badge gallery is nearly full. Use a smaller image or remove an old badge first.');
  }

  await setDoc(statsDocRef, { customTeamLogos: next }, { merge: true });
  customTeamLogos = next;
  customTeamLogosLoaded = true;
  customTeamLogosRequest = Promise.resolve(customTeamLogos);
  return record;
}

export async function removeCustomTeamLogo(key) {
  if (!auth.currentUser) throw new Error('Log in as an admin to update the badge gallery.');

  const snapshot = await getDoc(statsDocRef);
  const documentData = snapshot.exists() ? snapshot.data() : {};
  const next = (Array.isArray(documentData.customTeamLogos) ? documentData.customTeamLogos : [])
    .filter(item => item.key !== key);
  await setDoc(statsDocRef, { customTeamLogos: next }, { merge: true });
  customTeamLogos = next;
  customTeamLogosLoaded = true;
  customTeamLogosRequest = Promise.resolve(customTeamLogos);
}

export function getTeamLogoUrl(teamName) {
  const normalized = normalizeTeamName(teamName);
  if (!normalized) return '';

  if (normalized.includes('renfrew')) {
    return new URL('../assets/images/team-logo.png', import.meta.url).href;
  }

  const paddedName = ` ${normalized} `;
  const customMatch = customTeamLogos
    .flatMap(entry => (entry.names || [entry.name]).map(name => ({ entry, normalized: normalizeTeamName(name) })))
    .filter(item => item.normalized && paddedName.includes(` ${item.normalized} `))
    .sort((a, b) => b.normalized.length - a.normalized.length)[0];

  if (customMatch?.entry.imageDataUrl) return customMatch.entry.imageDataUrl;

  const match = searchableNames
    .filter(item => paddedName.includes(` ${item.normalized} `))
    .sort((a, b) => b.normalized.length - a.normalized.length)[0];

  return match
    ? new URL(`../assets/club-logos/${match.entry.file}`, import.meta.url).href
    : '';
}
