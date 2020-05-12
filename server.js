var express = require("express");
var app = express();
var server = require("http").Server(app);

var io = require("socket.io").listen(server);

var h = 288;
var w = 512;
var m = 32;

var players = {};
var star = {
  x: Math.floor(Math.random() * w - 2 * m) + m,
  y: Math.floor(Math.random() * h - 2 * m) + 4 * m,
  //   x: Math.floor(Math.random() * 700) + 50,
  //   y: Math.floor(Math.random() * 500) + 50,
};
var ball = {
  x: Math.floor(Math.random() * w - 2 * m) + m,
  y: Math.floor(Math.random() * h - 2 * m) + 4 * m,
};
var scores = {
  blue: 0,
  red: 0,
};

app.use(express.static(__dirname + "/public"));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", function (socket) {
  console.log("a user connected");

  // create a new player and add it to our players object
  players[socket.id] = {
    rotation: 0,
    inWater: false,
    x: Math.floor(Math.random() * w - 2 * m) + m,
    y: Math.floor(Math.random() * h - 2 * m) + 4 * m,
    // x: Math.floor(Math.random() * 700) + 50,
    // y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
    team: Math.floor(Math.random() * 2) == 0 ? "red" : "blue",
  };

  // send the players object to the new player
  socket.emit("currentPlayers", players);

  // send the star object to the new player
  socket.emit("starLocation", star);

  // send the ball object to the new player
  socket.emit("ballLocation", ball);

  // send the current scores
  socket.emit("scoreUpdate", scores);

  // update all other players of the new player
  socket.broadcast.emit("newPlayer", players[socket.id]);

  socket.on("disconnect", function () {
    console.log("user disconnected");

    // remove this player from out players object
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit("disconnect", socket.id);
  });

  // when a player moves, update the player data
  socket.on("playerMovement", function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    players[socket.id].inWater = movementData.inWater;
    // emit a message to all players about the player that moved
    socket.broadcast.emit("playerMoved", players[socket.id]);
  });

  // when the ball moves
  socket.on("ballMovement", function (movementData) {
    socket.broadcast.emit("ballMoved", movementData);
  });

  socket.on("starCollected", function () {
    if (players[socket.id].team === "red") {
      scores.red += 10;
    } else {
      scores.blue += 10;
    }
    star.x = Math.floor(Math.random() * w - 2 * m) + m;
    star.y = Math.floor(Math.random() * h - 2 * m) + 4 * m;
    io.emit("starLocation", star);
    io.emit("scoreUpdate", scores);
  });
});

// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

server.listen(port, function () {
  console.log(`Listening on ${server.address().port}`);
});
