var Stations = new Mongo.Collection('Stations');

var SOUNDCLOUD_CLIENT_ID = '',
    SOUNDCLOUD_SECRET = '';

if (Meteor.isClient) {
    var SoundCloudFavorites = new Mongo.Collection(null);

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
            Meteor.call('getStreamURL', track.stream_url, function(err, nextTrackUrl) {
                if (!err) {
                    $('audio').attr('src', nextTrackUrl).play();
                }
            });
        }
    }

    Template.Station.helpers({
        userFavorites: function() {
            return SoundCloudFavorites.find();
        },
        stations: function () {
            return Stations.find();
        },
        currentStation: function() {
            return getCurrentStation();
        }
    });

    Template.NowPlaying.helpers({
        streamURL: function() {
            var currentStation = getCurrentStation();
            Meteor.call('getStreamURL', currentStation.track.stream_url, function(err, resp) {
                if (!err) {
                    return resp;
                }
            });
        }
    });

    Template.Main.events({
        'click button#addStation': function () {
            var name = window.prompt('Enter a name for the station.');
            if (name) {
                Meteor.call('createStation', Meteor.user(), name, function(err, resp) {
                    if (!err) {
                        return resp;
                    }
                });
            }
        },
        'click a.removeStation': function () {
            Stations.remove({_id: this._id});
        },
        'click a.playStation': function () {
            // begin playing whatever is being streamed
            var station = Stations.findOne({ _id: this._id });
            if (station) {
                Meteor.users.update({_id: Meteor.user()._id}, {
                    $set: {
                        currentStation: station
                    }
                });
                Session.set('currentStation', station);
            }
        }
    });

    Template.Station.events({
        'click a.userFavorite': function() {
            var currentStation = Session.get('currentStation');
            currentStation.track = this;

            Meteor.call('changeStationTrack', Meteor.user(), currentStation, function(err, resp) {
                if (!err) {
                    return resp;
                }
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
                        SoundCloudFavorites.insert(track, function(err, id) {
                            if (err) {

                            }
                        });
                    });
                }
            });
        }

    });
}

if (Meteor.isServer) {
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
            check(oauth_token, String);
            this.unblock();
            return Meteor.http.call('GET', 'https://api.soundcloud.com/me/favorites.json?oauth_token=' + oauth_token);
        },
        getStreamURL: function(stream_url) {
            check(stream_url, String);
            this.unblock();
            return stream_url + '?client_id='+SOUNDCLOUD_CLIENT_ID;
        },
        changeStationTrack: function(user, station) {
            check(user, Object);
            check(station, Object);
            if (user) {
                Stations.update({ _id: station._id }, { $set: { track: station.track } });
            } else {
                throw new Meteor.Error('update-station-unauthorized', 'You don\'t have permission to update this station.');
            }
        },
        createStation: function(user, name) {
            if (user) {
                Stations.insert({name: name});
            } else {
                throw new Meteor.Error('create-station-unauthorized', 'You must connect to SoundCloud before you can create a station.');
            }

        }
    });

    // Update the station's track time based on the current DJ's currentTime on the audio object
    Meteor.setInterval(function() {
        var pos = Meteor.call('getTrackPosition', function(err, resp) {
            if (!err) { return resp; }
        });

    }, 5000);

}