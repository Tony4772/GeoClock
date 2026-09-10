const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, query, where, orderBy, limit } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function check() {
    try {
        await signInWithEmailAndPassword(auth, "jos.antonio4772@gmail.com", "secreto123");
        const q = query(collection(db, 'punches'), where('employeeId', '==', 'random'), orderBy('timestamp', 'desc'), limit(1));
        await getDocs(q);
        console.log("SUCCESS");
        process.exit(0);
    } catch(e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}
check();
