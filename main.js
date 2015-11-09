
// --------------------------------------
// Require
// --------------------------------------

var fs              = require( 'fs' );
var runsequence     = require( 'run-sequence' );
var mysql           = require( 'mysql' );
var mkpath          = require( 'mkpath' );
var rsync           = require( 'rsync' );
var exec            = require( 'child_process' ).exec;
var wrench          = require( 'wrench' );
var colors          = require( 'colors' );

// --------------------------------------
// Setup
// --------------------------------------

var deploySync = (function () {

  var _this = function ( config ) {
    this.config = config;
  };

  // --------------------------------------
  // Deploy
  // --------------------------------------

  _this.deploy = function () {

    var local_dump = './sync/local_backup.sql';

    var local_dump_cmd = config.local.dump + ' -u ' + config.local.db_user + ' --password=' + config.local.db_password + ' ' + config.local.db_name + ' > ' + local_dump;

    // Create ./sync/ folder
    mkpath.sync( './sync' );

    // Connect to Local Database
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
          database: config.remote.db_name,
          port: config.remote.port
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

          local.end();

        });

      });

    });

  };

  // --------------------------------------
  // Sync
  // --------------------------------------

  _this.sync = function () {

    rsync({
      root: '../../',
      hostname: config.remote.ssh.hostname,
      destination: config.remote.ssh.destination + 'wp-content',
      username: ( config.remote.ssh.username ) ? config.remote.ssh.username : null,
      port: config.remote.ssh.port,
      recursive: true,
      clean: true
    });

    rsync({
      root: '/',
      hostname: config.remote.ssh.hostname,
      destination: config.remote.ssh.destination + 'wp-content/themes/' + config.remote.theme_name,
      username: ( config.remote.ssh.username ) ? config.remote.ssh.username : null,
      port: config.remote.ssh.port,
      recursive: true,
      clean: true
    });

  });

  return _this;

})();

// --------------------------------------
// Export
// --------------------------------------

module.exports = deploySync;
