(function() {

    Crafty.c('ViewportBounded', {
        init: function() {
            this.requires('2D');
        },
        checkOutOfBounds: function(oldPosition) {
            if(!this.within(0, 0, Crafty.viewport.width, Crafty.viewport.height)) {
                // console.log('out of bounds', this.pos(), oldPosition);
                this.attr({x: oldPosition.x, y: oldPosition.y});
            }
        }
    });

    // a renderable entity -- provide utility function for setting name
    // also can change DOM/Canvas here
    Crafty.c('Renderable', {
        init: function() {
            this.requires('2D, DOM, Sprite');
        },
        spriteName: function(name) {
            this.requires(name)
            return this;
        } 
    });
    

    // Player component    
    Crafty.c('Player', {        
        init: function() {           
            this.requires('Renderable, Fourway, Collision, ViewportBounded')
                .spriteName('rocket')
                .attr({x: 64, y: 64,w:199, h:96})
                // set the speed and controls
                .fourway(5)
                //create a custom hit map here:
                .collision(new Crafty.polygon(
                    [10, 40],
                    [10, 80],
                    [180, 80],
                    [180, 40]
                ));

            //bind our movement handler to the NewDirection event
            this.bind('Moved', function(oldPosition) {
                this.checkOutOfBounds(oldPosition);
            });
            this.onHit('SpaceJunk', this.hitSpaceJunk)

        },

        hitSpaceJunk: function() {
            var score = Crafty('Score');
            score.decrement();

            if (score.score < 0) {
                // dead
                Crafty.e("Explosion").attr({x:this.x, y:this.y})
                this.destroy();
            }
        },

    });


    Crafty.c('FadeOut', {
        init: function() {
            this.requires('2D')
                .bind("EnterFrame", this._updateFade);

        },
        fadeOut: function(speed) {
            this._fadeSpeed = speed;
            return this;
        },
        _updateFade: function() {
            this.alpha = Math.max(this._alpha  - this._fadeSpeed, 0.0);
            if (this.alpha < 0.05) {
                this.destroy();
            }
        }

    });

    Crafty.c('Rotate', {
        init: function() {
            this.requires('2D')
                .bind("EnterFrame", this._updateRotation);
        },
        rotate: function(speed) {                
            this.origin('center');
            this._rotationSpeed = speed;
            return this;
        },
        _updateRotation: function() {
            this.rotation = this._rotation + this._rotationSpeed;
        }
    });

    Crafty.c('Explosion', {
        init: function() {
            this.requires('Renderable, FadeOut, Rotate')
                .spriteName('explosion')
                .rotate(4)
                .fadeOut(0.05);
        }
    });

    
    // Space Junk component - player must dodget this!
    Crafty.c('SpaceJunk', {
        init: function() {
            this.requires('Renderable, Rotate')                
                .bind("EnterFrame", this._updateJunk);
        },

        spaceJunk: function(sprite) {            
            this.spriteName(sprite);

            // set tighter collision bound
            var x = this.x + 10;
            var y = this.y + 10;
            var x2 = this.x + this.w - 20;
            var y2 = this.y + this.h - 20;

            this.requires("Collision")               
                .collision(new Crafty.polygon([x,y],[x,y2],[x2,y2],[x2,y]));

            this._randomlyPosition();
        },

        _randomlyPosition: function() {
            this.rotate(Crafty.math.randomNumber(-5,5));
            this._xSpeed = Crafty.math.randomNumber(1,10);
            this.attr({x: 1024, y: Crafty.math.randomInt(0,600-this.h)});
        },

        _updateJunk: function() {
            this.x = this._x - this._xSpeed            

            if ((this.x + this.w) < 0) {
                //  when off screen, re-position to come back on the screen!
                this._randomlyPosition();
            } 
        }
    });

    // A component to display the player's score
    Crafty.c('Score', {
        init: function() {
            this.score = 100;
            this.requires('2D, DOM, Text');
            this._textGen = function() {
                return "Score: " + this.score;
            };
            this.attr({w: 100, h: 20, x: 900, y: 0})
                .text(this._textGen);
        },
        increment: function() {
            this.score = this.score + 1;
            this.text(this._textGen);
        },
        decrement: function() {
            this.score = this.score - 1;
            this.text(this._textGen);
        }
    })


    //
    // Game loading and initialisation
    //
    
    var Game = function() {
        Crafty.scene('loading', this.loadingScene);
        Crafty.scene('main', this.mainScene);
    };
    
    Game.prototype.initCrafty = function() {
        console.log("page ready, starting CraftyJS");
        Crafty.init(1000, 600);
        Crafty.canvas.init();
        
        Crafty.modules({ 'crafty-debug-bar': 'release' }, function () {
            if (Crafty.debugBar) {
               Crafty.debugBar.show();
            }
        });
    };
    
    Game.prototype.loadingScene = function() {
        var loading = Crafty.e('2D, Canvas, Text, Delay');
        loading.attr({x: 512, y: 200, w: 100, h: 20});
        loading.text('loading...');
        
        function onLoaded() {
            Crafty.sprite('img/rocket.png', {rocket: [0, 0, 198, 96] });
            Crafty.sprite('img/rock.png', {asteroid: [0, 0, 198, 187] });
            Crafty.sprite('img/atom.png', {fuel: [0, 0, 198, 158] });
            Crafty.sprite('img/satellite.png', {satellite: [0,0, 198, 176] });
            Crafty.sprite('img/explode.png', {explosion: [0,0,180,180]});
            Crafty.sprite('img/debris.png', {debris: [0,0,64,64]});

            loading.delay(function() {
                Crafty.scene('main');
            }, 500);
        }
        
        function onProgress(progress) {
            loading.text('loading... ' + progress.percent + '% complete');
        }
        
        function onError() {
            loading.text('could not load assets');
        }
        
        Crafty.load([
            'img/atom.png',
            'img/rock.png',
            'img/rocket.png',
            'img/satellite.png',
            'img/explode.png',
            'img/debris.png'
        ], 
        onLoaded, onProgress, onError);
        
    };
    
    //
    // The main game scene
    //
    Game.prototype.mainScene = function() {
        //create a player...
        playerHealth = 1000;
        var player = Crafty.e('Player');
        
        var spaceJunk = [
            Crafty.e('SpaceJunk').spaceJunk('asteroid'),
            Crafty.e('SpaceJunk').spaceJunk('asteroid'),
            Crafty.e('SpaceJunk').spaceJunk('satellite'),
            ];

        
        var score = Crafty.e('Score');
    };
    
    $(document).ready(function() {
        var game = new Game();
        game.initCrafty();
        
        //play the main scene
        Crafty.scene('loading');
    });
    
})();