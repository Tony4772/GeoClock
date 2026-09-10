const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function check() {
    try {
        await signInWithEmailAndPassword(auth, "jos.antonio4772@gmail.com", "secreto123");
        console.log("Logged in");
        const snap = await getDocs(collection(db, 'users'));
        snap.docs.forEach(d => console.log(d.id, "=>", d.data()));
        process.exit(0);
    } catch(e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}
check();
