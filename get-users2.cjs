const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app);

async function listUsers() {
    try {
        const snap = await getDocs(collection(db, 'users'));
        console.log("Found " + snap.docs.length + " users.");
        snap.docs.forEach(d => console.log(d.id, "=>", d.data()));
        process.exit(0);
    } catch(e) {
        console.error("Firestore error:", e.message);
        process.exit(1);
    }
}
listUsers();
