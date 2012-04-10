/* 
 * Spotify application: Subscribey
 *
 * Developers: 	Mick van Dijk
 *				Randy Dijkstra
 *
 * © 2012 Subscribey Applications. All rights reserved.
 */

var sp = getSpotifyApi(1);
var views = sp.require('sp://import/scripts/api/views');
var models = sp.require('sp://import/scripts/api/models');
var player = models.player;

//tabs
tabs();
models.application.observe(models.EVENT.ARGUMENTSCHANGED, tabs);

function tabs() {
    var args = models.application.arguments;
    
    console.log(args[0]);
    $('.section').hide();
    $('#'+args[0]).show();
}

//init
exports.init = init;

function init() {

	updatePageWithTrackDetails();
	updatePageWithAlbumName();
	albumPlayer();
	subscribe();
	artistPage();
	updatePageWithAlbumCover();
	lastfmInfo();
	tabs();
	
	sp.trackPlayer.addEventListener("playerStateChanged", function (event) {
		// Only update the page if the track changed
		if (event.data.curtrack == true) {
			updatePageWithTrackDetails();
			updatePageWithAlbumName();
			albumPlayer();
			artistPage();
			updatePageWithAlbumCover();
			lastfmInfo();
			tabs();
		}
	});

}

//making contact with the last.fm api
var lastFM = {
    makeRequest: function(method, args, callback) {
        args.api_key = "7343e0c64db2c1effe3b061ea3d58ba5";
        args.format = "json";
        args.method = method;
        
        //console.log("LASTFM: " + "http://ws.audioscrobbler.com/2.0/", args);
        $.ajax({
            dataType: "jsonp",
            cache: false,
            data: args,
            url: "http://ws.audioscrobbler.com/2.0/",
            success: function (data) {
                if (lastFM.checkResponse(data)) {
                    callback(data);
                } else {
                    console.error("LASTFM: makeRequest bailed");
                }
            },
            error: function (jqxhr, textStatus, errorThrown) {
                console.error("LASTFM: Problem making request", jqxhr); 
                console.error(textStatus);
                console.error(errorThrown);
            }       
        });
    },
    checkResponse: function(data) {
        if (data.error) {
            console.error("Error from Last.FM: (" + data.error + ") " + data.message);
            return false;
        } else {
            return true;
        }
    }
}

//function for current artist & track detail information
function updatePageWithTrackDetails() {
	
	var header = document.getElementById("title");

	// This will be null if nothing is playing.
	var playerTrackInfo = sp.trackPlayer.getNowPlayingTrack();

	if (playerTrackInfo == null) {
		header.innerText = "Nothing playing!";
	} else {
		var track = playerTrackInfo.track;
		header.innerText = track.name;
	}
}

//function for album name
function updatePageWithAlbumName() {
	
	var header = document.getElementById("album");

	// This will be null if nothing is playing.
	var playerTrackInfo = sp.trackPlayer.getNowPlayingTrack();

	if (playerTrackInfo == null) {
		header.innerText = "No album!";
	} else {
		var track = playerTrackInfo.track;
	}
}

//function for album cover
function updatePageWithAlbumCover() {
	var playerTrackInfo = player.track;
	var track = playerTrackInfo.data;
	
	$(".albumcover").html("<img src= "+track.album.cover+" height=\"128\">");
}

//show artist information on the page
function artistPage() {
	var playerTrackInfo = player.track;
	var track = playerTrackInfo.data;

	var albumUri = track.album.uri;
	var artistUri = track.album.artist.uri;
	
	$(".artist-title").html("<a href="+artistUri+">"+track.album.artist.name+"</a>");
	$(".album-title").html("<a href="+albumUri+">"+track.album.name+"</a>");

	//share function
	$("#current-album a").click(function(e){
    	models.application.showSharePopup(document.getElementById($(this).attr('id')),player.track.uri); 
    });
}

//showing the album player and playlist
function albumPlayer() {
	var playerTrackInfo = player.track;
	var track = playerTrackInfo.data;
	var albumUri = track.album.uri;
	var playlist = new models.Playlist();

	models.Album.fromURI(albumUri, function(album){
		$(album.tracks).each(function(i) {
			playlist.add(album.tracks[i]);
		});

		//append album player on .album-cover
		var player = new views.Player();
		player.context = playlist;
		$(".album-cover").empty().append(player.node);

		//append album playlist on #playlist
		var list = new views.List(playlist);
		//add class sp-light for eve color
		list.node.classList.add('sp-light');
		$(".playlist").empty().append(list.node);
	});
}

//function for subscribing to a playlist
function subscribe() {
	$(".subscribe button").on("click", function(playlist){
		console.log("Button work!");

		//cache important information
		var playerTrackInfo = player.track;
		var track = playerTrackInfo.data;
		var albumUri = track.album.uri;

		//creates new playlist "Albumtitle - Artistname"
		var albumTitle = track.album.name;
		var artistFromAlbum = track.album.artist.name;
		var playlist = new models.Playlist(albumTitle +" - "+ artistFromAlbum);

		//fills in playlist with data from current playing track
		models.Album.fromURI(albumUri, function(album){
			$(album.tracks).each(function(i) {
				playlist.add(album.tracks[i]);
			});
		});
		
		playlist.subscribed = true;

		playlist.observe(models.EVENT.CHANGE, function() {
			console.log("Playlist was subscribed!");
		});
	});
}

//function wich handles the lastfm information
function lastfmInfo(artist) {
	var playerTrackInfo = player.track;
	var track = playerTrackInfo.data;
	var albumUri = track.album.uri;
	var albumName = track.album.name;
	var artistName = track.album.artist.name;

	//lastFM request getSimilar
	lastFM.makeRequest(
	    "artist.getSimilar",
	    {
	        artist: track.artists[0].name,
	        //limit 4 for width
	        limit: 4,
	        autocorrect: 1
	    },
	    function(data) {
	      	var artists = data.similarartists.artist;

	       	//make the div empty first
	       	$(".similar-artist-album").empty();

	       	//loop the similar artists
	       	$.each(artists, function(index, artist) {
	       		var name = artist.name;
	       		//append similar artist name
	       		$('.similarartists').append("<p>"+name+"</p>");
	       		
		       	var image = artist.image[2]['#text'];
		       	var url = artist.url;

		       	$(".similar-artist-album").append("<a href="+url+"><img src="+image+" height=\"50\"></a>");	       		
	       	});
	    }
	);

	//lastFM request getTopAlbums
	lastFM.makeRequest(
	    "artist.getTopAlbums",
	    {
	        artist: track.artists[0].name,
	        //limit 5 for width
	        limit: 5,
	        autocorrect: 1
	    },
	    function(data) {
	      	var topAlbum = data.topalbums.album;

	       	//make the div empty first
	       	$(".topalbumcover").empty();

	       	//loop the top albums
	       	$.each(topAlbum, function(index, album) {
	       		var name = album.name;
	       		
	       		var image = album.image[2]['#text'];
	       		var url = album.url;
	       		$(".topalbumcover").append("<a href="+url+"><img src="+image+"></a>");
	       	});
	    }
	);

	//lastFM request getTopTracks
	lastFM.makeRequest(
	    "artist.getTopTracks",
	    {
	        artist: track.artists[0].name,
	        //limit 4 for length
	        limit: 4,
	        autocorrect: 1
	    },
	    function(data) {
	      	var topTracks = data.toptracks.track;

	       	//make the div empty first
	       	$(".toptracks").empty();

	       	//zorgen dat de toptracks playable worden via spotify
	       	$.each(topTracks, function(index, track) {
	       		var name = track.name;
	       		var count = track.playcount;

	       		$('.toptracks').append(
		       		"<div class=\'toptrack-container\'><div class=\'toptrackname\'><strong>"+name+"</strong></div><div class=\'toptrackcount\'><span class=\'playcount\'>Playcount: "+count+"</span></div></div>"
		       	);
	       	});
	    }
	);
}

/*
 * OEFFFFFFFFFFF.............
 * End of the code, Its getting hot in here! [/nelly]
 */