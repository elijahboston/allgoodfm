Router.route('/', function() {
	var templateData = {
		stations: Stations.find().fetch()
	};
	this.layout('LayoutMain');
	this.render('Main', { data: templateData });
});

Router.route('/listen/:_id',function() {
	var _id = this.params._id,
		currentStation = Stations.findOne({ _id: _id });
	var templateData = {
		currentStation: currentStation
	};

	Session.set('currentStation', currentStation);

	this.layout('LayoutMain');
	this.render('Station', { data: templateData });
});