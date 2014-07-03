var canvas = document.getElementById("game");
var context = canvas.getContext("2d");

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

config = {
	playerx: 100,
	playery: 100,
	jump: -.75,
	gravity: .0015,
	size: {
		width: 640,
		height: 480
	},
	missles: {
		size: {
			width: 32,
			height: 16
		},
		vel: -.5
	},
	keys: {
		left: 37,
		right: 39,
		up: 38,
		down: 40,
		r: 82,
		enter: 13,
		space: 32
	}
}

//rect and point utils... pollute global namespace!!!!!
var areCollided = function(a, b) {
	var hcol = (a.x < b.x && a.x + a.w > b.x) || (b.x < a.x && b.x + b.w > a.x)
	var vcol = (a.y < b.y && a.y + a.h > b.y) || (b.y < a.y && b.y + b.h > a.y)
	return hcol && vcol
}

function inRect(p, r) {
	return (p.x >= r.x && p.x < r.x + r.w)&&(p.y >= r.y && p.y < r.y + r.h)
}

function rect(x, y, w, h) {
	return {
		x: x,
		y: y,
		w: w,
		h: h
	}
}

function point(x, y) {
	return {
		x: x,
		y: y
	}
}

var controls = {
	keystate: {},
	callbacks: {},
	press: function(key) {
		this.keystate[key] = true;

		if (this.callbacks[key] !== undefined) {
			for (var i = 0; i < this.callbacks[key].length; i++) {
				this.callbacks[key][i]();
			}
		}
	},
	release: function(key) {
		this.keystate[key] = false;
	},
	onPress: function(key, func) {
		if (this.callbacks[key] === undefined) {
			this.callbacks[key] = [];
		}
		this.callbacks[key].push(func);
	},
	getState: function(name) {
		var state = this.keystate[config.keymap[name]];
		if (state === undefined) {
			return this.keystate[config.keymap[name]] = false;
		}
		return state;
	},
	init: function() {
		document.addEventListener('keydown', function(event) {
			controls.press(event.keyCode);
		});
		document.addEventListener('keyup', function(event) {
			controls.release(event.keyCode);
		});		
	}
}
controls.init();

game = {
	update: function(delta) {
		this.misslespawner.update(delta)
		this.world.update(delta);
	},
	render: function(delta) {
		context.clearRect(0, 0, config.size.width, config.size.height);
		this.world.render(delta);
		context.fillStyle = "#000"
		context.fillText("score: " + game.player.score, 10, 10)
	},
	init: function() {
		canvas.width = config.size.width;
		canvas.height = config.size.height;

		controls.onPress(config.keys.r, function() {
			game.reset()
		})

		game.world.init()
		game.player.init()
		game.misslespawner.init()
	},
	reset: function() {
		game.world.reset()
	}
}
game.world = {
	entities: [],
	update: function(delta) {
		for (var i = 0; i < this.entities.length; i++) {
			if (this.entities[i].shouldRemove && this.entities[i].shouldRemove()) {
				this.entities.splice(i--, 1)
			} else {
				this.entities[i].update(delta);
			}
		}
	},
	render: function(delta) {
		for (var i = 0; i < this.entities.length; i++) {
			this.entities[i].render(delta);
		}
	},
	init: function() {

	},
	reset: function() {
		for (var i = 0; i < this.entities.length; i++) {
			this.entities[i].reset()
		}
	},
	attach: function(e) {
		this.entities.push(e)
	}
}
game.player = {
	pos: undefined,
	vel: undefined,
	dead: false,
	jumps: 2,
	score: 0,
	update: function(delta) {
		if (this.dead) return;
		this.vel.y += config.gravity * delta
		
		this.pos.y += this.vel.y * delta
		if (this.pos.y >= config.size.height) {
			this.pos.y = config.size.height
			this.vel.y = 0
			this.jumps = 2
		}
		this.pos.x += this.vel.x * delta

	},
	render: function(delta) {
		context.fillStyle = "#ff0000"
		context.fillRect(this.pos.x - 8, this.pos.y - 16, 16, 16)
	},
	init: function() {
		game.world.attach(this)
		var jump = function() {
			game.player.jump()
		}
		controls.onPress(config.keys.up, jump)
		controls.onPress(config.keys.space, jump)
		this.reset()
	},
	reset: function() {
		this.pos = point(config.playerx, config.playery)
		this.vel = point(0, 0)
		this.dead = false
		this.jumps = 2
		this.score = 0
	},
	jump: function() {
		if (this.jumps > 0) {
			this.vel.y = config.jump
			this.jumps -= 1
		}
	},
	addScore: function(x) {
		this.score += x
	},
	die: function() {
		this.dead = true
	},
	getRect: function() {
		return rect(this.pos.x - 8, this.pos.y - 16, 16, 16)
	}
}
game.misslespawner = {
	img: undefined,
	update: function(delta) {
		if (Math.random() < .1) {
			this.spawn(point(config.size.width, Math.random() * config.size.height))
		}
	},
	init: function() {
		this.img = new Image()
		this.img.src = "img/missle.png"
	},
	createMissle: function(pos) {
		return {
			pos: pos,
			remove: false,
			offsetoffset: Math.PI * Math.random(),
			update: function(delta) {
				if (!game.player.dead) {
					this.pos.x += config.missles.vel * delta
					if (areCollided(this.getRect(), game.player.getRect())) {
						game.player.die()
					}
				}
			},
			render: function(delta) {
				if (game.misslespawner.img !== undefined) {
					context.drawImage(game.misslespawner.img, this.pos.x, this.pos.y - config.missles.size.height/2 + this.offset())
				}
			},
			offset: function() {
				return Math.cos(this.pos.x/(config.size.width/Math.PI) + this.offsetoffset)*30
			},
			reset: function() {
				this.remove = true;
			},
			shouldRemove: function() {
				var rem = this.pos.x < -50
				if (!game.player.dead && rem) {
					game.player.addScore(10)
				}
				return this.remove || rem;
			},
			getRect: function() {
				return rect(this.pos.x, this.pos.y- config.missles.size.height/2 + this.offset(), config.missles.size.width, config.missles.size.height)
			}
		}
	},
	spawn: function(pos) {
		game.world.attach(this.createMissle(pos))
	}
}
game.init()

//start
var oldtime = Date.now();
var time;


(function loop() {
	window.requestAnimFrame(loop);

	time = Date.now();
	game.update(time - oldtime);
	game.render(time - oldtime);
	oldtime = time;
})();
