const googleAnalytics = require("./google.js");

process.on('message', function(eventObject) {
	googleAnalytics.sendAnalyticsEvent(eventObject);

	setTimeout(function(){
		process.exit(0);
	}, 5000);
});
