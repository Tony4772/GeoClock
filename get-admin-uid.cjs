const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const admin = require('firebase-admin');

// Note: I cannot run firebase-admin without service account creds in this env.
// Let's use the REST API to check the user directly.
