var config = {
  type: Phaser.AUTO,
  parent: "phaser-example",
  //   width: 800,
  //   height: 600,
  width: 1152,
  height: 768,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 },
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

var game = new Phaser.Game(config);

function preload() {
  // Temp background
  // this.load.image("background", "assets/background_temp.png");
  this.load.image("background", "assets/background.png");

  // this.load.image("ship", "assets/slime.png");
  // this.load.image("ship", "assets/spaceShips_001.png");

  this.load.spritesheet("slime", "assets/slime_frames.png", {
    frameWidth: 93,
    frameHeight: 93,
  });

  // this.load.image("otherPlayer", "assets/enemyBlack5.png");

  this.load.spritesheet("otherPlayer", "assets/slime_frames.png", {
    frameWidth: 93,
    frameHeight: 93,
  });
  this.load.image("star", "assets/star_gold.png");
}

function create() {
  //  A simple background for our game
  // this.add.image(192, 128, "background");
  this.add.image(576, 384, "background");

  this.anims.create({
    key: "right",
    frames: this.anims.generateFrameNumbers("slime", { start: 0, end: 4 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "left",
    frames: this.anims.generateFrameNumbers("slime", { start: 5, end: 9 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "up",
    frames: this.anims.generateFrameNumbers("slime", { start: 10, end: 14 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "down",
    frames: this.anims.generateFrameNumbers("slime", { start: 15, end: 19 }),
    frameRate: 10,
    repeat: -1,
  });

  var self = this;
  this.socket = io();
  this.otherPlayers = this.physics.add.group();
  this.socket.on("currentPlayers", function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });
  this.socket.on("newPlayer", function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });
  this.socket.on("disconnect", function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  this.socket.on("playerMoved", function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        // otherPlayer.setRotation(playerInfo.rotation);
        console.log(playerInfo.rotation);
        switch (playerInfo.rotation) {
          case 1:
            otherPlayer.anims.play("up", true);
            break;
          case 2:
            otherPlayer.anims.play("right", true);
            break;
          case 3:
            otherPlayer.anims.play("down", true);
            break;
          case 4:
            otherPlayer.anims.play("left", true);
            break;
          default:
            otherPlayer.anims.play("down", true);
        }
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.blueScoreText = this.add.text(16, 16, "", {
    fontSize: "32px",
    fill: "#0000FF",
  });
  // this.redScoreText = this.add.text(584, 16, "", {
  this.redScoreText = this.add.text(240, 16, "", {
    fontSize: "32px",
    fill: "#FF0000",
  });

  this.socket.on("scoreUpdate", function (scores) {
    self.blueScoreText.setText("Blue: " + scores.blue);
    self.redScoreText.setText("Red: " + scores.red);
  });

  this.socket.on("starLocation", function (starLocation) {
    if (self.star) self.star.destroy();
    self.star = self.physics.add.image(starLocation.x, starLocation.y, "star");
    self.physics.add.overlap(
      self.ship,
      self.star,
      function () {
        this.socket.emit("starCollected");
      },
      null,
      self
    );
  });

  this.cursors = this.input.keyboard.createCursorKeys();
}

function update() {
  if (this.ship) {
    var r;

    if (this.cursors.left.isDown) {
      this.ship.setVelocityX(-160);

      if (this.cursors.up.isDown) {
        this.ship.setVelocityY(-160);
        this.ship.anims.play("up", true);
        r = 1;
      } else if (this.cursors.down.isDown) {
        this.ship.setVelocityY(160);
        this.ship.anims.play("left", true);
        r = 4;
      } else {
        this.ship.setVelocityY(0);
        this.ship.anims.play("left", true);
        r = 4;
      }
    } else if (this.cursors.right.isDown) {
      this.ship.setVelocityX(160);

      if (this.cursors.up.isDown) {
        this.ship.setVelocityY(-160);
        this.ship.anims.play("up", true);
        r = 1;
      } else if (this.cursors.down.isDown) {
        this.ship.setVelocityY(160);
        this.ship.anims.play("right", true);
        r = 2;
      } else {
        this.ship.setVelocityY(0);
        this.ship.anims.play("right", true);
        r = 2;
      }
    } else {
      this.ship.setVelocityX(0);

      if (this.cursors.up.isDown) {
        this.ship.setVelocityY(-160);
        this.ship.anims.play("up", true);
        r = 1;
      } else if (this.cursors.down.isDown) {
        this.ship.setVelocityY(160);
        this.ship.anims.play("down", true);
        r = 3;
      } else {
        this.ship.setVelocityY(0);
        // this.ship.anims.play("down", true);
      }
    }

    // if (this.cursors.left.isDown && this.cursors.up.isDown)

    // World wrap is broken
    // this.physics.world.wrap(this.ship, 5);

    // WE SHOULD BE EMITTING DIRECTION FACING
    // 1 1 1
    // 4   2
    // 4 3 2
    // THESE CAN BE THE DIRECTIONS FOR NOW

    // emit player movement
    var x = this.ship.x;
    var y = this.ship.y;
    // var r = this.ship.rotation;
    if (
      this.ship.oldPosition &&
      (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y)
    ) {
      this.socket.emit("playerMovement", {
        x: this.ship.x,
        y: this.ship.y,
        rotation: r
          ? r
          : this.ship.oldPosition
          ? this.ship.oldPosition.rotation
          : 3,
        // rotation: this.ship.rotation,
      });
    }

    // save old position data
    this.ship.oldPosition = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: r
        ? r
        : this.ship.oldPosition
        ? this.ship.oldPosition.rotation
        : 3,
      // rotation: this.ship.rotation,
    };
  }
}

function addPlayer(self, playerInfo) {
  self.ship = self.physics.add
    .sprite(playerInfo.x, playerInfo.y, "slime")
    .setOrigin(0.5, 0.5)
    .setDisplaySize(93, 93);
  // .setDisplaySize(53, 40);
  if (playerInfo.team === "blue") {
    // self.ship.setTint(0x0000ff);
  } else {
    // self.ship.setTint(0xff0000);
  }
  self.ship.anims.play("down", true);
  self.ship.setCollideWorldBounds(true);
  //   self.ship.setDrag(100);
  //   self.ship.setAngularDrag(100);
  //   self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add
    .sprite(playerInfo.x, playerInfo.y, "otherPlayer")
    .setOrigin(0.5, 0.5)
    .setDisplaySize(93, 93);
  if (playerInfo.team === "blue") {
    otherPlayer.setTint(0x0000ff);
  } else {
    otherPlayer.setTint(0xff0000);
  }
  otherPlayer.playerId = playerInfo.playerId;

  otherPlayer.anims.play("down", true);
  self.otherPlayers.add(otherPlayer);
  console.log(self.otherPlayers);
}
