const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const config = require('./firebase-applet-config.json');
const app = initializeApp(config);
const auth = getAuth(app);
createUserWithEmailAndPassword(auth, "test-user-3@geoclock.com", "password123")
  .then((cred) => console.log("Success:", cred.user.uid))
  .catch((e) => console.error("Error:", e.code, e.message));
