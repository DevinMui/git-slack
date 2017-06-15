var SlackBot = require('slackbots');
var mongoose = require('mongoose')
var exec = require('child_process').execSync

mongoose.connect("mongodb://localhost/gitslack")

// define the schema for our user model
var channelsSchema = mongoose.Schema({
	channel_id: String,
	name: String
});

var Channel = mongoose.model('Channel', channelsSchema);
// create a bot 
var bot = new SlackBot({
	token: 'xoxb-198889802839-Ezhs3NWToujt8mOCxNNl0prx', // Add a bot https://my.slack.com/services/new/bot and put the token  
	name: 'gitslack'
});
 
bot.on('start', function() {
	for(var i=0;i<bot.channels.length;i++){
		if(bot.channels[i].is_member){
			var id = bot.channels[i].id
			var name = bot.channels[i].name
			Channel.findOne({ channel_id: bot.channels[i].id}, function(err, channel){
				if(!channel){
					new Channel({
						channel_id: id,
						name: name
					}).save(function(){
						console.log("Joined: "+ name)
					})
				}
			})
		}
	}

	bot.postMessageToChannel('server', "Hey, I'm GitSlack. I can control the server! Just mention me with a simple message like `@gitslack deploy production`.")
});

bot.on('message', function(data) {
	// all ingoing events https://api.slack.com/rtm 
	if(data.type==='channel_joined'){
		new Channel({
			channel_id: data.channel.id,
			name: data.channel.name
		}).save(function(){
			console.log("Joined " + data.channel.name)
		})
	}

	if(data.type==='message' && data.user!==bot.self.id){
		var text = data.text.split(" ")
		if(text[0]==="<@"+bot.self.id+">"){
			if(text[1]==="deploy"){
				if(text[2]==="production"){
					Channel.findOne({channel_id: data.channel}, function(err, channel){
						var name = channel.name
						bot.postMessageToChannel(name, "Pulling from Github...")
						exec("cd ../loaf && git pull")
						bot.postMessageToChannel(name, "Killing server...")	
						exec("ps aux | grep -i 'node app.js' | awk '{print $2}' | xargs sudo kill -9")
						bot.postMessageToChannel(name, "Restarting server...")
						exec("cd ../loaf && sudo nohup node app.js &")
						bot.postMessageToChannel(name, "Done!")						
					})
				}
			}
		}
	}
});