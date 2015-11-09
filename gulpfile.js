
// --------------------------------------
// Setup
// --------------------------------------

var fs              = require( 'fs' );
var gulp            = require( 'gulp' );
var plugins         = require( 'gulp-load-plugins' )();
var runsequence     = require( 'run-sequence' );
var mysql           = require( 'mysql' );
var mkpath          = require( 'mkpath' );
var exec            = require( 'child_process' ).exec;
var wrench          = require( 'wrench' );
var colors          = require( 'colors' );

// --------------------------------------
// Configuration
// --------------------------------------

var config          = require( './config' );

// --------------------------------------
// Environment
// --------------------------------------
// Local: gulp ...
// Development: NODE_ENV=dev gulp ...
// Staging: NODE_ENV=staging gulp ...
// Production: $ NODE_ENV=production gulp ...
// --------------------------------------

var env             = process.env.NODE_ENV || 'local';

// --------------------------------------
// Paths
// --------------------------------------

var paths = {
  content: '../../',
  watch: '**/*.{js,css,jpeg,jpg,png,gif}'
};

// --------------------------------------
// Sync Static Assets
// --------------------------------------

gulp.task( 'statics', function () {

  gulp.src( paths.content + '**/*' )
    .pipe(plugins.rsync({
      root: paths.content,
      hostname: config.remote.ssh.hostname,
      destination: config.remote.ssh.destination,
      username: ( config.remote.ssh.username ) ? config.remote.ssh.username : null,
      port: config.remote.ssh.port,
      recursive: true,
      clean: true
    }));

});

// --------------------------------------
// Database Sync
// - export remote database
// - export local database
// - find/replace local database with remote database config
// - create 2 temporary databases for remote / local (transformed) databases
// - do a comparison of the 2 databases
// - save the diff that is returned
// - drop both databases
// - apply diff to remote database
// - sync assets
// --------------------------------------

gulp.task( 'deploy', function () {

  var local_dump = './sync/local_backup.sql';

  // Create dump command
  var local_dump_cmd = config.local.dump + ' -u ' + config.local.db_user + ' --password=' + config.local.db_password + ' ' + config.local.db_name + ' > ' + local_dump;

  // Create ./sync/ folders
  mkpath.sync('./sync');

  // --------------------------------------
  // Connect to Local Database
  // --------------------------------------

  var local = mysql.createConnection({
    host: config.local.db_host,
    user: config.local.db_user,
    password: config.local.db_password,
    database: config.local.db_name,
    port: config.local.port
  });

  local.connect( function( err ) {

    // Handle Errors
    if( err ) {
      console.log( err );
      console.log('Error connecting to DB');
      return;
    }

    // Log connection
    console.log('Connection established to local database:'.green, config.local.db_name.yellow );

    // Run local dump
    exec( local_dump_cmd,  function( err, out, code ) {

      // Replace local config with sync options
      var contents = fs.readFileSync( local_dump, 'utf-8' );
      contents = contents.replace( config.local.url, 'wordpress-deploy-sync' );
      fs.writeFileSync( local_dump, contents );

      // Clone relevant wp-contents/ folders
      wrench.copyDirSyncRecursive('../../plugins/', './sync/plugins/', { forceDelete: true });
      wrench.copyDirSyncRecursive('../../uploads/', './sync/uploads/', { forceDelete: true });

      // Setup connection to remote database
      var remote = mysql.createConnection({
        host: config.remote.db_host,
        user: config.remote.db_user,
        password: config.remote.db_password,
        database: config.remote.db_name
      });

      // Connect to remote database
      remote.connect( function( err ) {

        // Handle Errors
        if( err ) {
          console.log('Error connecting to remote databse:'.red, config.remote.db_name.yellow);
          return;
        }

        // Log connection
        console.log('Connection established to remote database:'.green, config.remote.db_name.yellow);

        // Execute database comparison
        // exec('mysqldbcompare --server1=' + config.local.db_user + '@' + config.local.db_host + ' deploylocal:deployremote --run-all-tests', function( err, out, code ) {
        //   if ( err ) throw err;
        //   process.stderr.write(err);
        //   process.stdout.write(out);
        //   process.exit(code);
        // });

      });

      // Handle remote handle
      remote.end(function(err) {

        console.log('Error Connecting to Remote Database', err);

      });

    });

  });

});

// --------------------------------------
// Default Task
// --------------------------------------

gulp.task('default', function () {});
