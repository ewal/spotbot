"use strict";
module.exports = function (spotify) {
  var Track = require("./track")(spotify);
  var firebaseRef = require("./firebase").ref.database().ref("playlist");
  var Url = require("url");

  var queue   = [],
      tracks  = [],
      shuffle = false,
      playlistRegex = /spotify:user:(?:[A-Za-z0-9_-]*):playlist:(?:[A-Za-z0-9]*)/,
      albumRegex = /spotify:album:(?:[A-Za-z0-9_-]*)/,
      localFileRegex = /spotify:local:(?:[A-Za-z0-9_-]*)/,
      name,
      playlistUri;

  firebaseRef.child("uri").on("value", function(data){
    var uri = convertToUri(data.val());
    if (uri != playlistUri && validUri(uri)) {
      change(uri);
    } else if(playlistUri !== undefined) {
      firebaseRef.child("uri").set(playlistUri);
    }
  });

  firebaseRef.child("shuffle").on("value", function(data){
    if (data.val() !== null) {
      shuffle = data.val();
      queue = [];
    } else {
      data.ref().set(false);
    }
  });

  function next(){
    var uri;
    if (queue.length) {
      uri = queue.shift();
      if (uri) {
        return new Track(uri);
      }
    } else if(tracks.length) {
      populateQueue();
      uri = queue.shift();
      if (uri) {
        return new Track(uri);
      }
    }
  }

  function change(uri){
    if (uri) {
      firebaseRef.set({uri: uri, name: "Loading...", tracks: [], shuffle: false});
      playlistUri = uri;
      queue  = [];
      tracks = [];
      fetchTracks();
    }
  }

  function fetchTracks(){
    var object = spotify.createFromLink(playlistUri);
    if (playlistUri.match(/:album:/)) {
      loadAlbum(object);
    } else {
      if (object.isLoaded) {
        loadPlaylist(object);
      } else {
        spotify.waitForLoaded([object], loadPlaylist);
      }
    }
  }

  function loadAlbum(album){
    album.browse(function(err, browsedAlbum){
      name = browsedAlbum.artist.name + " - " + album.name;
      tracks = browsedAlbum.tracks.map(function(track){
        return track.link;
      });
      firebaseRef.child("tracks").set(tracks);
      firebaseRef.child("name").set(name);
      populateQueue();
    });
  }

  function loadPlaylist(playlist){
    firebaseRef.child("name").set(playlist.name);
    tracks = playlist.getTracks().map(function(track){
      return (localFileRegex.test(track.link)) ? null : track.link;
    });
    firebaseRef.child("tracks").set(tracks);
    populateQueue();
  }

  function populateQueue(){
    if (shuffle) {
      var tempArray = tracks.slice();
      queue = shuffleArray(tempArray);
    } else {
      queue = tracks.slice();
    }
  }

  function shuffleArray(array) {
    var counter = array.length, temp, index;
    while (counter > 0) {
      index = Math.floor(Math.random() * counter);
      counter--;
      temp = array[counter];
      array[counter] = array[index];
      array[index] = temp;
    }
    return array;
  }

  function validUri(uri){
    return playlistRegex.test(uri) || albumRegex.test(uri);
  }

  function convertToUri(urlOrUri){
    if (urlOrUri.indexOf("https://") === 0) {
      var path = Url.parse(urlOrUri).path;
      return "spotify" + path.replace(/\//g, ":");
    } else {
      return urlOrUri;
    }
  }

  return {
    next: next,
  };
};
