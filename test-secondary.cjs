const { initializeApp } = require('firebase/app');
const config = require('./firebase-applet-config.json');

try {
  const app1 = initializeApp(config);
  console.log("App 1 initialized");
  const app2 = initializeApp(config, 'Secondary');
  console.log("App 2 initialized");
} catch(e) {
  console.error("Error:", e.message);
}
