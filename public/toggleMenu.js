/* Test program to show/hide splah */

$(document).ready( function() {
  $('#btn-login').on('click', function(event) {
    $('#login-screen').slideToggle(600, 'easeInOutQuad');
    $('#navbar-site').toggleClass('navbar-site-post');
  });
});

/*
   $('#btn-login').click( function() {
   var body    = document.body;
   var canvas  = $( '.canvas-login' );
   var context = canvas.getContext( '2d' );

   var angle   = Math.PI * 2;
   var width, height;

   function createMenu() {
   var btn        = $( '#btn-login' );
   var btn-offset = btn.offset();
   var btn-width  = btn.width();
   var btn-height = btn.height();

   var x = btn-offset.left + width/2;
   var y = btn-offset.top + height/2;
   var radius = maxDist( x, y ); 

   width  = canvas.width  = body.scrollWidth;
   height = canvas.height = window.innerHeight;

   var menu = {
   radius: 0,
   x: x,
   y: y
   }

   var tl = new TimelineMax({ onUpdate: drawMenu.bind(menu) })
   .to(menu, 0.4, { radius: radius });
   }

   function drawMenu() {  
   ctx.clearRect(0, 0, width, height);  
   ctx.beginPath();
   ctx.arc(this.x, this.y, this.radius, 0, angle, false);
   ctx.fillStyle = '#aaaaaa';
   ctx.fill();
   }

   function maxDist( x, y ) {
   var point = { x: x, y: y };
   var da = distSq( point, { x: 0, y: 0 } );
   var db = distSq( point, { x: 0, y: height } );
   var dc = distSq( point, { x: width, y: height } );
   var dd = distSq( point, { x: width; y: 0 } );

   return Math.sqrt( Math.max( da, db, dc, dd ) );
   }

   function distSq(p1, p2) {
   return Math.pow( p1.x - p2.x, 2 ) + Math.pow( p1.y - p2.y, 2 );
   }
   });
   */
