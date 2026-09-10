const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const auth = getAuth(app);

// Probar Admin
signInWithEmailAndPassword(auth, "jos.antonio4772@gmail.com", "geoclock")
  .then((cred) => {
    console.log("Admin login SUCCESS:", cred.user.uid);
    process.exit(0);
  })
  .catch((e) => { 
    console.error("Admin login FAILED:", e.code, e.message); 
    process.exit(1);
  });
