//node imports
var Console = require("console");
var fs = require("fs");

//external lib imports
var JsonFile = require("jsonfile");
var DateDiff = require("date-diff");

var users = {};
var config;

module.exports = (_config) => {
	config = _config || require("./config.json");

	this.onReady = (bot) => {
		if (fs.existsSync(config.saveFile))
			users = JsonFile.readFileSync(config.saveFile); //load any data we already have stored
		Console.log(users);

		writeToFile();
		checkUsersAgainstThreshold(bot);
	};

	this.onMessage = (bot, user, userID, channelID, message) => {
		users[userID] = new Date(); //save this message as the user's last active date
		Console.log(users);
	};

	return this;
};

var writeToFile = () => {
	JsonFile.writeFile(config.saveFile, users, (err) => { if (err) Console.error(err); });
	let saveIntervalMs = config.saveIntervalMins * 60 * 1000;	
	setTimeout(writeToFile, saveIntervalMs);
};

var checkUsersAgainstThreshold = (bot, doSetTimeout = true) => {
	var now = new Date(); //get current date
	var inactiveThresholdDays = parseInt(config.inactiveThresholdDays); //get an integer for the number of days a user must have been inactive for before the role is removed
	Object.keys(users).forEach(userID => { //iterate over the user IDs
		var diff = new DateDiff(now, users[userID]); //calculate the difference between the current date and the last time the user was active

		//remove the "active" role from the user if they haven't been active within the threshold, give them it if they have
		if (diff.days() > inactiveThresholdDays)
			bot.removeFromRole({
				serverID: config.serverID,
				userID: userID,
				roleID: config.activeRoleID
			}, (err, response) => { if (err) Console.error(err, response); });
		else
			bot.addToRole({
				serverID: config.serverID,
				userID: userID,
				roleID: config.activeRoleID
			}, (err, response) => { if (err) Console.error(err, response); });
	});

	//set the timeout to wait before this function should recur
	if (doSetTimeout) {
		var waitMs = parseInt(config.checkActivityIntervalDays) * 24 * 60 * 60 * 1000;
		setTimeout(() => { checkUsersAgainstThreshold(bot); }, waitMs);
	}
};