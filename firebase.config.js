const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.resolve(__dirname, "./service-account.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://travel-around-ec840.firebaseio.com",
  });
}

const firestore = admin.firestore();

module.exports = { admin, firestore };
