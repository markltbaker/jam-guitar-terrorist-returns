(function() {
    //
    // Components
    //

    // a renderable entity
    Crafty.c('Renderable', {
        init: function() {
            // we're using DOM Spirtes
            this.requires('2D, DOM');
        },
        // set which sprite to use -- should match up with a call to Crafty.sprite()
        spriteName: function(name) {
            this.requires(name);
            return this; // so we can chain calls to setup functions
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
                    this.trigger('Faded');
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
        }
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
    Crafty.c('Corpse', {
        init: function() {
            // reuse some helpful components
            this.requires('Renderable, FadeOut, corpse')
                .fadeOut(0.005);
        }
    });

    Crafty.c('Explosion', {
        init: function() {
            // reuse some helpful components
            this.requires('Renderable, FadeOut, explosion')
                .fadeOut(0.1)
                .bind("Faded", function () {
                    Crafty.e('Corpse').attr({x: this.x, y:this.y});
                });
        }
    });

    // music OF DEATH
    Crafty.c('Music', {
        init: function() {
            this.requires('Renderable, Collision, Delay, note' + Crafty.math.randomInt(1,3))
                .collision()
                .bind("EnterFrame", function() {
                    this.x += 10;
                    if (this.x > 1024) {
                        this.destroy();
                    }
                })
                .onHit('Target', function() {
                    if (this._dead !== true) {
                        this._dead = true;
                        this.delay(function() {
                            this.destroy();
                        }, 1);
                    }
                });
        }
    });

    
    // targets to shoot at
    Crafty.c('Target', {
        init: function() {
            this.requires('Renderable, Collision, Delay, target' + Crafty.math.randomInt(1,2))
                .collision()
                .onHit('Music', this.hitByMusic);
            this._randomlyPosition();            
        },
        // randomly position 
        _randomlyPosition: function() {
            //this.rotate(Crafty.math.randomNumber(-5,5));
            this.attr({
                x: Crafty.math.randomNumber(500, 800), 
                y: Crafty.math.randomNumber(0,600-this.h)});
        },
        // we hit something!
        hitByMusic: function() {
            // find the global 'Score' component
            var score = Crafty('Score');
            score.increment();

            // replace the ship with an explosion!
            Crafty.e("Explosion").attr({x:this.x, y:this.y});
            this.x = -2000;
            this.delay(this._randomlyPosition, 1000);
        },
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
                .spriteName('terrorist')
                .attr({x: 64, y: 64})
                .fourway(5)
                .collision()
                .requires('Keyboard')
                .bind('KeyDown', function(e) {
                    if (e.key === Crafty.keys.SPACE) {
                        // fire music
                        Crafty.e("Music").attr({x: this.x + 130, y: this.y + 40});
                    }
                });

            // bind our movement handler to keep us within the Viewport
            this.bind('Moved', function(oldPosition) {
                this.checkOutOfBounds(oldPosition);
            });
        },
    });

    // A component to display the player's score
    Crafty.c('Score', {
        init: function() {
            this.score = 0;
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
            Crafty.sprite('img/terrorist.png', {terrorist: [0, 0, 243, 177] });
            Crafty.sprite('img/note1.png', {note1: [0, 0, 100, 123] });
            Crafty.sprite('img/note2.png', {note2: [0, 0, 81, 87] });
            Crafty.sprite('img/note3.png', {note3: [0, 0, 74, 103] });             
            Crafty.sprite('img/mother1.png', {target1: [0, 0, 115, 162] });
            Crafty.sprite('img/mother2.png', {target2: [0, 0, 128, 130] });
            Crafty.sprite('img/ash.png', {corpse: [0, 0, 54, 72] });
            Crafty.sprite('img/zap.png', {explosion: [0, 0, 128, 159] });

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
            'img/terrorist.png',
            'img/mother1.png',
            'img/mother2.png',
            'img/note1.png',
            'img/note2.png',
            'img/note3.png',
            'img/ash.png',
            'img/zap.png'
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
        for (i = 0; i < 5; i++) {
            Crafty.e('Target');
        }
    };
    
    // kick off the game when the web page is ready
    $(document).ready(function() {
        var game = new Game();
        game.initCrafty();
        
        // start loading things
        Crafty.scene('loading');
    });
    
})();