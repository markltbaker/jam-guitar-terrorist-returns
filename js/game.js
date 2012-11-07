(function() {
    //
    // Components
    //

    // a renderable entity
    Crafty.c('Renderable', {
        init: function() {
            // we're using DOM Spirtes
            this.requires('2D, DOM, Sprite');
        },
        // set which sprite to use -- should match up with a call to Crafty.sprite()
        spriteName: function(name) {
            this.requires(name)
            return this;
        } 
    });

    // a component to fade out an entity over time
    Crafty.c('FadeOut', {
        init: function() {
            this.requires('2D');

            // the EnterFrame event is very useful for per-frame updates!
            this.bind("EnterFrame", function() {
                this.alpha = Math.max(this._alpha - this._fadeSpeed, 0.0);
                if (this.alpha < 0.05) {
                    // its practically invisible at this point, remove the object
                    this.destroy();
                }
            });
        },
        // set the speed of fading out - should be a small number e.g. 0.01
        fadeOut: function(speed) {
            // reminder: be careful to avoid name clashes...
            this._fadeSpeed = speed;
            return this; // so we can chain calls to setup functions
        },
    });

    // rotate an entity continually
    Crafty.c('Rotate', {
        init: function() {
            this.requires('2D');

            // update rotation each frame
            this.bind("EnterFrame", function() {
                this.rotation = this._rotation + this._rotationSpeed;
            });
        },
        // set speed of rotation in degrees per frame
        rotate: function(speed) { 
            // rotate about the center of the entity               
            this.origin('center');
            this._rotationSpeed = speed;
            return this; // so we can chain calls to setup functions
        },
    });

    // an exciting explosion!
    Crafty.c('Explosion', {
        init: function() {
            // reuse some helpful components
            this.requires('Renderable, FadeOut, Rotate')
                .spriteName('explosion')
                .rotate(4)
                .fadeOut(0.05);
        }
    });

    
    // Space Junk component - player must dodge this!
    Crafty.c('SpaceJunk', {
        init: function() {
            this.requires('Renderable, Rotate')                
                .bind("EnterFrame", this._updateJunk);
        },
        // set up the space junk
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
        // randomly position the space junk to the right of the screen
        _randomlyPosition: function() {
            this.rotate(Crafty.math.randomNumber(-5,5));
            this._xSpeed = Crafty.math.randomNumber(1,10);
            this.attr({x: 1024, y: Crafty.math.randomInt(0,600-this.h)});
        },
        // update space junk each frame
        _updateJunk: function() {
            // move to the left of the screen
            this.x = this._x - this._xSpeed            

            //  when off screen, re-position to come back on the screen!
            if ((this.x + this.w) < 0) {
                this._randomlyPosition();
            } 
        }
    });

    // Limit movement to within the viewport
    Crafty.c('ViewportBounded', {
        init: function() {
            this.requires('2D');
        },
        // this must be called when the element is moved event callback
        checkOutOfBounds: function(oldPosition) {
            if(!this.within(0, 0, Crafty.viewport.width, Crafty.viewport.height)) {
                this.attr({x: oldPosition.x, y: oldPosition.y});
            }
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
                // create a custom hit map here:
                .collision(new Crafty.polygon(
                    [10, 40],
                    [10, 80],
                    [180, 80],
                    [180, 40]
                ));

            // bind our movement handler to keep us within the Viewport
            this.bind('Moved', function(oldPosition) {
                this.checkOutOfBounds(oldPosition);
            });
            // when we hit some space junk, react to it
            this.onHit('SpaceJunk', this.hitSpaceJunk)
        },
        // we hit something!
        hitSpaceJunk: function() {
            // find the global 'Score' component
            var score = Crafty('Score');
            score.decrement();

            // is the player dead?
            if (score.score < 0) {
                // replace the ship with an explosion!
                Crafty.e("Explosion").attr({x:this.x, y:this.y});
                this.destroy();
            }
        },
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
            // todo: also track time played
        },
        // decrement the score (todo: make it player health)
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
    
    // A loading scene -- pull in all the slow things here and create sprites
    Game.prototype.loadingScene = function() {
        var loading = Crafty.e('2D, Canvas, Text, Delay');
        loading.attr({x: 512, y: 200, w: 100, h: 20});
        loading.text('loading...');
        
        function onLoaded() {
            // set up sprites
            Crafty.sprite('img/rocket.png', {rocket: [0, 0, 198, 96] });
            Crafty.sprite('img/rock.png', {asteroid: [0, 0, 198, 187] });
            Crafty.sprite('img/atom.png', {fuel: [0, 0, 198, 158] });
            Crafty.sprite('img/satellite.png', {satellite: [0,0, 198, 176] });
            Crafty.sprite('img/explode.png', {explosion: [0,0,180,180]});
            Crafty.sprite('img/debris.png', {debris: [0,0,64,64]});

            // jump to the main scene in half a second
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
            // list of images to load
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
        // create a scoreboard
        Crafty.e('Score');

        //create a player...
        Crafty.e('Player');
        
        // create some junk to avoid
        Crafty.e('SpaceJunk').spaceJunk('asteroid');
        Crafty.e('SpaceJunk').spaceJunk('asteroid');
        Crafty.e('SpaceJunk').spaceJunk('satellite');
    };
    
    // kick off the game when the web page is ready
    $(document).ready(function() {
        var game = new Game();
        game.initCrafty();
        
        // start loading things
        Crafty.scene('loading');
    });
    
})();