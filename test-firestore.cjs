const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

signInWithEmailAndPassword(auth, "jos.antonio4772@gmail.com", "geoclock")
  .then(async (cred) => {
    console.log("Logged in:", cred.user.uid);
    const q = query(collection(db, 'users'), where('tenantId', '==', 'placeholder'));
    try {
        await getDocs(q);
        console.log("Firestore read succeeded");
    } catch(e) {
        console.log("Firestore read failed:", e.message);
    }
    process.exit(0);
  })
  .catch((e) => { console.error("Error:", e.code, e.message); process.exit(1); });
