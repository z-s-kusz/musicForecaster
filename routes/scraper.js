let express = require('express');
let router = express.Router();
let request = require('request');
let cheerio = require('cheerio');
let moment = require('moment');
let rp = require('request-promise');

let redirectURI = 'http://localhost:5000';
let clientID = '6e1a767d1d594eb2a64e8ea872069b19';
let secretID = '*secret*'; //plz remember not to commit to github
let maxSpotifyArtists = 50; //max number of artists returned from a single spotify followed artists call

/* Log into spotify, get artists count, make calls to create followed artist collection and return it to front end */
let getSpotifyToken = function(spotifyCode) {
    let options = {
        method: 'POST',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            "Authorization": 'Basic ' + (new Buffer(clientID + ':' + secretID).toString('base64'))
        },
        form: {
            grant_type: 'authorization_code',
            code: spotifyCode,
            redirect_uri: redirectURI
        }
    };
    return rp(options).then(data => {
        let spotifyReturn = JSON.parse(data);
        return getArtistsCount(spotifyReturn.access_token);
    }).catch(err => {
        console.log('err in getSpotifyToken', err);
        return false;
    });
}

//https://beta.developer.spotify.com/documentation/web-api/reference/follow/get-followed/
let getArtistsCount = function(accessToken) {
    let options = {
        url: 'https://api.spotify.com/v1/me/following',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        },
        qs: {
            type: 'artist',
            limit: maxSpotifyArtists
        }
    };
    return rp(options).then(data => {
        let spotifyReturn = (JSON.parse(data)).artists;
        let count = Math.ceil( spotifyReturn.total / maxSpotifyArtists );
        let artists = spotifyReturn.items;
        let cursor = spotifyReturn.cursors.after;

        if (count === 0) {
            return [];
        } else if (count === 1) { // already got them all in 1st call
            return processArtists(artists);
        } else if (count > 10) { //set limit to 500 followed artists
            return getAllArtists(accessToken, 9, cursor, artists);
        } else {
            return getAllArtists(accessToken, count - 1, cursor, artists);
        }
    }).catch(err => {
        console.log('getArtistsCount request error', err);
        return false;
    });
}

let getAllArtists = function(accessToken, calls, cursor, artists) {
    if (calls === 0) {
        return processArtists(artists);
    }
    let options = {
        url: 'https://api.spotify.com/v1/me/following',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        },
        qs: {
            type: 'artist',
            limit: maxSpotifyArtists,
            after: cursor
        }
    };

    return rp(options).then(data => {
        let spotifyReturn = (JSON.parse(data)).artists;
        cursor = spotifyReturn.cursors.after;
        artists = artists.concat( spotifyReturn.items );
        return getAllArtists(accessToken, calls - 1, cursor, artists);
    }).catch(err => {
        console.log('error in getAllArtists call #' + calls);
        console.log('Full Error:', err);
        return false;
    });
}

let processArtists = function(spotifyArtists) {//right now only send name, could send other stuff tho
    let finalCollection = [];
    spotifyArtists.forEach(artist => {
        finalCollection.push(artist.name);
    });
    return finalCollection;
}

router.get('/getArtists', (req, res) => {
    let spotifyCode = req.query.code;

    getSpotifyToken(spotifyCode).then(data => {
        if (data) {//final data is an array of artist names
            res.send(data);
            return;
        } else {
            res.sendStatus(500);
            return;
        }
    });
});
/* */

/* Return Metacritics Anticipated Albums list to front end */
let getAlbums = function() {
    let options = {
        url: 'http://www.metacritic.com/browse/albums/release-date/coming-soon/date',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36'
        }
    };
    return rp(options).then(data => {
        return parseInfo(data);
    }).catch(err => {
        console.log('err in request to metacritic', err);
        return false;
    });
}

let parseInfo = async function(fullHTML) {
    $ = cheerio.load(fullHTML);
    let table = $('tbody', '#main_content'); // cheerio item to parse over
    let allReleaseDates = [];
    let anticipatedAlbums = [];

    await table.children().each((index, elem) => {
        let releaseDate;
        let album = {
            artistName: '',
            albumName: '',
            extraInfo: '',
            releaseDate: ''
        };

        // process headers/release date in if
        if ($(elem).hasClass('module')) {
            releaseDate = $(elem).find('th').text().trim();
            //releaseDate = moment(releaseDate).format(); //find new way to format date
            allReleaseDates.push(releaseDate);
        } 
        // process album info in else
        else {
            album.artistName = $(elem).find('.artistName').text().trim();
            album.albumName = $(elem).find('.albumTitle').text().trim();
            album.extraInfo = $(elem).find('.dataComment').text().trim();
            album.releaseDate = allReleaseDates[allReleaseDates.length -1];
            anticipatedAlbums.push(album);            
        }
    });
    return {
        allReleaseDates: allReleaseDates,
        anticipatedAlbums: anticipatedAlbums
    };
}

router.get('/getAlbums', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
    getAlbums().then(data => {
        if (data) {
            res.send(data);
            return;
        } else {
            res.sendStatus(500);
            return;
        }
    });
});
/* */

module.exports = router;
