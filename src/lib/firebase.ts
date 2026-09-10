import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const app = initializeApp(config);
export const secondaryApp = initializeApp(config, 'Secondary');
export const db = getFirestore(app);
export const auth = getAuth(app);
