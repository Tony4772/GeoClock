const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const config = require('./firebase-applet-config.json');
const app = initializeApp(config);
const auth = getAuth(app);
signInWithEmailAndPassword(auth, "jos.antonio4772@gmail.com", "geoclock")
  .then((cred) => { console.log("Login Success:", cred.user.uid); process.exit(0); })
  .catch((e) => { console.error("Error:", e.code, e.message); process.exit(1); });
