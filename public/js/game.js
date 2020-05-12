var config = {
  type: Phaser.AUTO,
  parent: "phaser-example",
  //   width: 800,
  //   height: 600,
  width: 512,
  height: 288,
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
var water_filtered;

function preload() {
  // this.load.image("background", "assets/background.png");

  this.load.image("tiles", "assets/map/tileset.png");
  this.load.tilemapTiledJSON("map", "assets/map/park.json");

  this.load.spritesheet("slime", "assets/slime_frames.png", {
    frameWidth: 31,
    frameHeight: 31,
  });

  this.load.image("star", "assets/star_gold.png");
  this.load.image("ball", "assets/ball.png");

  this.load.spritesheet("splash", "assets/splash.png", {
    frameWidth: 31,
    frameHeight: 31,
  });
}

function create() {
  // this.add.image(576, 384, "background");

  const map = this.make.tilemap({ key: "map" });

  // need more descriptive name for tileset
  const tileset = map.addTilesetImage("tileset", "tiles");
  const ground = map.createStaticLayer("Ground", tileset, 0, 0);
  const water = map.createDynamicLayer("Water", tileset, 0, 0);
  const skyBarrier = map.createStaticLayer("Sky_barrier", tileset, 0, 0);

  skyBarrier.setCollisionByProperty({ collide: true });

  //   const waterObjects = map.getObjectLayer("Water")["objects"];
  //   waterObjects.forEach((waterObject) => {
  //     const water = this.water
  //       .create(waterObject.x, waterObject.y + 200 - waterObject.height, tileset)
  //       .setOrigin(0, 0);
  //   });

  // I can make four layers and test for overlap between any of the four

  //   this.anims.create({
  //     key: "splash",
  //     frames: this.anims.generateFrameNumbers("splash", { start: 0, end: 0 }),
  //     frameRate: 10,
  //     repeat: -1,
  //   });

  createAnimations(this);

  water_filtered = water.filterTiles((t) => {
    return t.properties.collides;
  });

  var self = this;
  this.socket = io();

  // CHECK
  this.otherPlayers = this.physics.add.group();

  this.socket.on("currentPlayers", function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
        self.physics.add.collider(self.container, skyBarrier);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });

  const debugGraphics = this.add.graphics().setAlpha(0.75);
  skyBarrier.renderDebug(debugGraphics, {
    tileColor: null, // Color of non-colliding tiles
    collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
    faceColor: new Phaser.Display.Color(40, 39, 37, 255), // Color of colliding face edges
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
    // console.log(self.otherPlayers);
    // console.log(self.otherPlayers.getChildren());
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      // console.log(otherPlayer.list[0].playerId);
      if (playerInfo.playerId === otherPlayer.list[0].playerId) {
        // console.log(playerInfo.inWater);
        if (playerInfo.inWater) {
          otherPlayer.list[1].anims.play("splash", true);
        } else {
          otherPlayer.list[1].anims.play("nosplash", true);
        }
        switch (playerInfo.rotation) {
          case 1:
            otherPlayer.list[0].anims.play("up", true);
            break;
          case 2:
            otherPlayer.list[0].anims.play("right", true);
            break;
          case 3:
            otherPlayer.list[0].anims.play("down", true);
            break;
          case 4:
            otherPlayer.list[0].anims.play("left", true);
            break;
          default:
            otherPlayer.list[0].anims.play("down", true);
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
      self.container,
      //   self.ship,
      self.star,
      function () {
        this.socket.emit("starCollected");
      },
      null,
      self
    );
  });

  this.socket.on("ballLocation", function (ballLocation) {
    if (self.ball) self.ball.destroy();
    self.ball = self.physics.add.image(ballLocation.x, ballLocation.y, "ball");
    self.physics.add.collider(self.container, self.ball, (cb) => {
      console.log(cb);
    });
    // self.ball.oldPosition = {
    //     x: -1,
    //     y: -1
    // }
  });

  this.socket.on("ballMoved", function (ballInfo) {
    self.ball.setPosition(ballInfo.x, ballInfo.y);
  });

  this.cursors = this.input.keyboard.createCursorKeys();
}

function update() {
  //   if (this.ball) {
  //     // emit player movement
  //     var x = this.ball.x;
  //     var y = this.ball.y;
  //     if (
  //       this.ball.oldPosition &&
  //       (x !== this.ball.oldPosition.x || y !== this.ball.oldPosition.y)
  //     ) {
  //     this.socket.emit("ballMovement", {
  //       x: x,
  //       y: y,
  //       // inWater: inWater,
  //     });
  //     // }

  //     // // save old position data
  //     // this.ball.oldPosition = {
  //     //   x: x,
  //     //   y: y,
  //     //   // inWater: inWater,
  //     // };
  //   }

  if (this.container) {
    var inWater;
    var p = this.physics.world.overlapTiles(
      this.container,
      water_filtered,
      null,
      null,
      this
    );
    if (p) {
      this.splash.anims.play("splash", true);
      inWater = true;
    } else {
      this.splash.anims.play("nosplash", true);
      // this.splash.anims.remove();
      inWater = false;
    }

    this.container.body.setVelocity(0);

    var r;
    if (this.cursors.left.isDown) {
      this.container.body.setVelocityX(-80);
    } else if (this.cursors.right.isDown) {
      this.container.body.setVelocityX(80);
    }

    if (this.cursors.up.isDown) {
      this.container.body.setVelocityY(-80);
    } else if (this.cursors.down.isDown) {
      this.container.body.setVelocityY(80);
    }

    if (this.cursors.left.isDown) {
      this.player.anims.play("left", true);
      r = 4;
    } else if (this.cursors.right.isDown) {
      this.player.anims.play("right", true);
      r = 2;
    } else if (this.cursors.up.isDown) {
      this.player.anims.play("up", true);
      r = 1;
    } else if (this.cursors.down.isDown) {
      this.player.anims.play("down", true);
      r = 3;
    }

    // WE SHOULD BE EMITTING DIRECTION FACING
    // 4 1 2
    // 4   2
    // 4 3 2
    // THESE CAN BE THE DIRECTIONS FOR NOW

    // emit player movement
    var x = this.container.x;
    var y = this.container.y;
    if (
      this.container.oldPosition &&
      (x !== this.container.oldPosition.x || y !== this.container.oldPosition.y)
    ) {
      this.socket.emit("playerMovement", {
        x: x,
        y: y,
        rotation: r
          ? r
          : this.container.oldPosition
          ? this.container.oldPosition.rotation
          : 3,
        inWater: inWater,
      });
    }

    // save old position data
    this.container.oldPosition = {
      x: x,
      y: y,
      rotation: r
        ? r
        : this.container.oldPosition
        ? this.container.oldPosition.rotation
        : 3,
      inWater: inWater,
    };
  }
}

function addPlayer(self, playerInfo) {
  self.player = self.add.sprite(0, 0, "slime", 0);

  self.container = self.add.container(playerInfo.x, playerInfo.y);
  self.container.setSize(31, 31);
  self.physics.world.enable(self.container);
  self.container.add(self.player);

  self.splash = self.add.sprite(0, 0, "splash", 2);
  self.splash.setSize(31, 31);
  // self.physics.world.enable(self.splash);

  self.container.add(self.splash);

  self.container.body.setCollideWorldBounds(true);

  self.player.anims.play("down", true);
}

function addOtherPlayers(self, playerInfo) {
  var otherPlayer = self.add.sprite(0, 0, "slime", 0);
  otherPlayer.playerId = playerInfo.playerId;

  otherPlayer.anims.play("down");

  var container = self.add.container(playerInfo.x, playerInfo.y);
  container.setSize(31, 31);
  container.add(otherPlayer);

  self.otherPlayers.add(container);

  var splash = self.add.sprite(0, 0, "splash", 2);
  splash.setSize(31, 31);

  container.add(splash);
  // container.anims.play("down", true);

  //   const otherPlayer = self.add
  //     .sprite(playerInfo.x, playerInfo.y, "slime")
  //     .setOrigin(0.5, 0.5)
  //     .setDisplaySize(31, 31);
  //   //   if (playerInfo.team === "blue") {
  //   //     otherPlayer.setTint(0x0000ff);
  //   //   } else {
  //   //     otherPlayer.setTint(0xff0000);
  //   //   }
  //   otherPlayer.playerId = playerInfo.playerId;

  //   otherPlayer.anims.play("down", true);
  //   self.otherPlayers.add(otherPlayer);
}

function createAnimations(self) {
  self.anims.create({
    key: "right",
    frames: self.anims.generateFrameNumbers("slime", { start: 0, end: 4 }),
    frameRate: 10,
    repeat: -1,
  });

  self.anims.create({
    key: "left",
    frames: self.anims.generateFrameNumbers("slime", { start: 5, end: 9 }),
    frameRate: 10,
    repeat: -1,
  });

  self.anims.create({
    key: "up",
    frames: self.anims.generateFrameNumbers("slime", { start: 10, end: 14 }),
    frameRate: 10,
    repeat: -1,
  });

  self.anims.create({
    key: "down",
    frames: self.anims.generateFrameNumbers("slime", { start: 15, end: 19 }),
    frameRate: 10,
    repeat: -1,
  });

  self.anims.create({
    key: "splash",
    frames: self.anims.generateFrameNumbers("splash", { start: 0, end: 0 }),
    frameRate: 30,
    repeat: -1,
  });

  self.anims.create({
    key: "nosplash",
    frames: self.anims.generateFrameNumbers("splash", { start: 2, end: 2 }),
    frameRate: 180,
    repeat: -1,
  });
}
