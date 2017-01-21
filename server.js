// server.js will be our website's server that handles communication
// between the front-end and the database

// - Express is a Node framework that makes everything easier
// - require returns a 'module', which is essentially an object
// packed with functions
var express = require('express');
var app = express();

// - Mongodb is the database that we will be using
// - mongojs is a module that has some useful functions
var mongojs = require('mongojs');
var db = mongojs('users', ['users']); // we want the 'users' database

// - body-parser is middle-ware that parses http objects
// or something to that effect (don't worry about it)
var bodyParser = require('body-parser');

// used for log messages
var LOG = "server: "

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// returns all users, not useful atm
/*app.get('/users', function(req, res) {
	console.log(LOG + "get users");
	db.users.find(function (err, docs) {
		console.log(LOG + docs);
		res.json(docs);
	})
});*/

app.post('/users/:email/:password', function(req, res) {
	var email = req.params.email;
	var password = req.params.password;
	console.log(LOG + "get user with email " + email + " and pass " + password);
	db.users.findOne({email: email, password: password}, function (err, doc) {
		res.json(doc);
	})
})

app.listen(3000);
console.log("Server running on port 3000");
