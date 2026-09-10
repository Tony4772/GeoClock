const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const config = require('./firebase-applet-config.json');
const app = initializeApp(config);
const auth = getAuth(app);
signInAnonymously(auth)
  .then((cred) => { console.log("Anon Success:", cred.user.uid); process.exit(0); })
  .catch((e) => { console.error("Anon Error:", e.code, e.message); process.exit(1); });
