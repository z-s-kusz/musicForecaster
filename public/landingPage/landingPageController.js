mainApp.controller('LandingPageController', ['$scope', '$http', '$route', '$routeParams',
function ($scope, $http) {

    $scope.albums = {
        allReleaseDates: [],
        anticipatedAlbums: []
    };
    $scope.collectedByDate = [];
    $scope.followedArtists = [];
    $scope.loadedAlbums = false;
    $scope.loadedArtists = false;
    $scope.message = '';
    $scope.userForecast = [];
    let lastLoadedTime;

    checkLocalStorage().then(() => {
        parseSpotifyResponse();
    });

    function buildUsersForecast(anticipatedAlbums, artists) {
        let match = [];
        anticipatedAlbums.filter((album, i) => {
            return artists.filter((artist, j) => {
                if (artist.toLowerCase() === album.artistName.toLowerCase()) {
                    match.push(album);
                }
            });
        });
        if (match.length < 1) {
            $scope.message = 'None of the artists you follow have anything reported right now';
        }
        return $scope.userForecast = match;
    }

    async function checkLocalStorage() {
        if (localStorage.getItem('lastLoadedTime') && localStorage.getItem('albums')) {
            lastLoadedTime = new Date(JSON.parse(localStorage.getItem('lastLoadedTime')));
            if (new Date() - lastLoadedTime > 3600000) return getAlbums();
            $scope.albums = JSON.parse(localStorage.getItem('albums'));
            $scope.loadedAlbums = true;
            organizeAlbumsByDate($scope.albums.allReleaseDates, $scope.albums.anticipatedAlbums);
            return true;
        } else {
            await getAlbums();
            return true;
        }
    }

    async function getAlbums() {
        $scope.message = 'Loading Albums...';
        $http({
            method: 'GET',
            url: 'http://localhost:5000/anticipatedAlbums/getAlbums'
        }).then((res, err) => {
            if (res.data) {
                $scope.albums = res.data;
                localStorage.setItem('albums', JSON.stringify(res.data));
                localStorage.setItem('lastLoadedTime', JSON.stringify(new Date()));
                organizeAlbumsByDate($scope.albums.allReleaseDates, $scope.albums.anticipatedAlbums);
                $scope.message = '';
                $scope.loadedAlbums = true;
                return true;
            } else {
                console.log('Error', err);
                $scope.message = 'Error Loading Artists. Please Refresh the Page.';
                return false;
            }
        });
    }

    function getArtists(code) {
        $http({
            method: 'GET',
            url: 'http://localhost:5000/anticipatedAlbums/getArtists',
            params: { 'code': code }
        }).then((res, err) => {
            if (res.data) {
                $scope.loadedArtists = true;
                $scope.followedArtists = res.data;
                buildUsersForecast($scope.albums.anticipatedAlbums, $scope.followedArtists);
            } else {
                console.log('Error', err);
                $scope.message = 'Error Connecting to Spotify. Please Try Again.';
            }
        });
    }

    function organizeAlbumsByDate(dates, albums) {
        dates.forEach((date, i) => {
            $scope.collectedByDate.push([]);// make an empty array for this date collection
            albums.filter(album => {
                if (album.releaseDate === date) {
                    $scope.collectedByDate[i].push(album);// push into this sub-array of collectionByDate
                }
            });
        });
    }

    function parseSpotifyResponse() {
        let response = window.location.search;
        if (response.match(/\\?code=/)) {
            let code = response.substr(6);
            return getArtists(code);
        } else if (response.match(/\\?error=/)) {
            return console.log('full error reads: ' + response);
        } else {
            return console.log('no params found :)');
        }
    }

    $scope.connectSpotify = function () {// spotify step 1 - the rest on backend
        let clientID = '6e1a767d1d594eb2a64e8ea872069b19';
        let redirectURI = 'http://localhost:5000';
        let scope = 'user-follow-read';

        let url = 'https://accounts.spotify.com/authorize/'
            + '?response_type=code'
            + '&client_id=' + encodeURIComponent(clientID)
            + '&scope=' + encodeURIComponent(scope)
            + '&redirect_uri=' + encodeURIComponent(redirectURI)
            + '&show_dialog=true';

        window.location.href = url;
    }

}]);
