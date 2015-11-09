
// --------------------------------------
// Setup
// --------------------------------------

var gulp      = require( 'gulp' );
var config    = require( './config' );
var wordpress = require( 'main' )( config );

// --------------------------------------
// Deploy Task
// --------------------------------------

gulp.task( 'deploy', function () {
  wordpress.deploy();
});

// --------------------------------------
// Sync Task
// --------------------------------------

gulp.task( 'sync', function () {
  wordpress.sync();
});
