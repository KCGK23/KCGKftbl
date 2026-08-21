import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getFirestore, collection, getDocs, getDoc, setDoc, query, orderBy, addDoc,
  doc, updateDoc, deleteDoc, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAn5L57Y1w2S0IMtjtNdevNq7Uzi6XJEsU',
  authDomain: 'kcgkftbl.firebaseapp.com',
  projectId: 'kcgkftbl',
  storageBucket: 'kcgkftbl.firebasestorage.app',
  messagingSenderId: '246624590251',
  appId: '1:246624590251:web:7fc1c27dcc3dd0270e1aee',
  measurementId: 'G-46SLDG5R2H'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const fixturesCollection = collection(db, 'fixtures');
const tournamentsCollection = collection(db, 'tournaments');
const statsDocRef = doc(db, 'siteData', 'playerStats');

export { auth, db, fixturesCollection, tournamentsCollection, statsDocRef, collection, getDocs, getDoc, setDoc, query, orderBy, addDoc, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp, signInWithEmailAndPassword, signOut, onAuthStateChanged };
