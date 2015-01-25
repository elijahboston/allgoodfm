UserFavoriteTracks = new Mongo.Collection('UserFavoriteTracks');
Stations = new Mongo.Collection('Stations');

if (Meteor.isClient) {

    // counter starts at 0
    Session.setDefault('currentStation', null);

    function getCurrentStation() {
        var currentStation = Session.get('currentStation');

        if (currentStation) {
            return Stations.findOne({_id: currentStation._id});
        } else {
            return null;
        }
    }

    function refreshPlayer(track) {
        var currentStation = getCurrentStation();
        if (!track && currentStation && currentStation.track) {
            track = currentStation.track;
        }
        if (track) {
            Meteor.call('getStreamURL', track, function(err, nextTrackUrl) {
                if (!err) {
                    $('audio').attr('src', nextTrackUrl).play();
                }
            });

        }
    }

    Template.body.helpers({
        userFavorites: function() {
            return UserFavoriteTracks.find();
        },
        stations: function () {
            return Stations.find();
        },
        currentStation: function() {
            return getCurrentStation();
        },
        userToken: function() {
            if (Meteor.user()) { return Meteor.user().services.soundCloud.accessToken; }

            return '';
        },
        streamURL: function() {
            var currentStation = getCurrentStation();
            Meteor.call('getStreamURL', currentStation.track, function(err, resp) {
                if (!err) {
                    return resp;
                }
            });
        }
    });

    Template.body.events({
        'click button#addStation': function () {
            var name = window.prompt('Enter a name for the station.');
            if (name) {
                Stations.insert({name: name});
            }
        },
        'click a.removeStation': function () {
            Stations.remove({_id: this._id});
        },
        'click a.playStation': function () {
            // begin playing whatever is being streamed
            var station = Stations.findOne({ _id: this._id });
            if (station) {
                Session.set('currentStation', station);
            }
        },
        'click a.userFavorite': function() {
            var currentStation = Session.get('currentStation');
            Stations.update({_id: currentStation._id}, {
                $set: { track: this }
            });
        }
    });

    Tracker.autorun(function() {
        Stations.findOne();
        refreshPlayer();
    });

    Meteor.startup(function() {
        // logged in
        var user = Meteor.user();
        if (user) {
            // get likes from soundcloud
            Meteor.call('getSoundcloudFavorites', user.services.soundCloud.accessToken, function (err, results) {
                if (!err) {
                    results.data.forEach(function (track) {
                        UserFavoriteTracks.insert(track);
                    });
                }
            });
        }

    });

}

if (Meteor.isServer) {
    var SOUNDCLOUD_CLIENT_ID = 'a47f239d7ef7ac1f73b8eb609f13aad6',
        SOUNDCLOUD_SECRET = '0033c83e7fb1d2cdd7b4574c63b1a8df';

    // code to run on server at startup
    ServiceConfiguration.configurations.upsert(
        {service: 'soundCloud'},
        {
            $set: {
                clientId: SOUNDCLOUD_CLIENT_ID,
                loginStyle: 'popup',
                secret: SOUNDCLOUD_SECRET
            }
        }
    );

    Meteor.methods({
        getSoundcloudFavorites: function (oauth_token) {
            this.unblock();
            return Meteor.http.call('GET', 'https://api.soundcloud.com/me/favorites.json?oauth_token=' + oauth_token);
        },
        getStreamURL: function(track) {
            this.unblock();
            return track.stream_url + '?client_id='+SOUNDCLOUD_CLIENT_ID;
        }
    });

};
