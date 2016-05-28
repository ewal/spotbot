"use strict";

var Firebase = require("firebase");
var serviceAccount = require('../firebase-service-account.json');

module.exports = function() {

  var config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    serviceAccount: serviceAccount
  };

  return {
    ref: Firebase.initializeApp(config),
    firebase: Firebase
  };

}();
