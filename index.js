
// --------------------------------------
// Require
// --------------------------------------

var _               = require( 'lodash' );
var fs              = require( 'fs' );
var path            = require( 'path' );
var runsequence     = require( 'run-sequence' );
var mysql           = require( 'mysql' );
var mkpath          = require( 'mkpath' );
var rsync           = require( 'rsync' );
var exec            = require( 'child_process' ).exec;
var wrench          = require( 'wrench' );
var rimraf          = require( 'rimraf' );
var colors          = require( 'colors' );
var sync            = require( 'ftpsync' );

// --------------------------------------
// Setup
// --------------------------------------

var deploySync = function ( config ) {

  this.config = config;

  // --------------------------------------
  // Deploy
  // --------------------------------------

  this.deploy = function () {

    var local_dump = './sync/local_backup.sql';

    var local_dump_cmd = config.local.dump + ' -u ' + config.local.db_user + ' --password=' + config.local.db_password + ' ' + config.local.db_name + ' > ' + local_dump;

    var sync_options = {
      port: 21,
      host: config.remote.ftp.host,
      user: config.remote.ftp.username,
      pass: config.remote.ftp.password,
      remoteRoot: '',
      localRoot: ''
    };

    var theme_options = {
      local: './',
      remote: config.remote.ftp.destination + 'wp-content/themes/' + config.remote.theme + '/',
      ignore: ['.git', '.DS_Store', 'node_modules', 'sync']
    };

    var contents_options = {
      local: './sync/',
      remote: config.remote.ftp.destination + 'wp-content/',
      ignore: ['.git', '.DS_Store', 'node_modules', '*.sql']
    };

    // Handle errors
    var sync_error = function( err ) {
      if ( err ) {
        console.log( 'Error syncing remote files:'.red, colors.yellow( err ) );
      }
      console.log( 'Completed static file sync!'.green );
    };

    // Handle success
    var sync_complete = function( data ) {
      var files = 'Synced '.green + colors.green( data.transferredFileCount ) + ' of ' + data.totalFileCount;
      console.log( files, 'file:'.green, data.filename.yellow );
    };

    // Clean up and then create ./sync/ folder
    rimraf.sync( './sync' );
    mkpath.sync( './sync' );

    // Sync theme
    sync.settings = _.extend( {}, sync_options, theme_options );
    sync.run( function ( err ) {
      console.log( err );
    });

    // Connect to Local Database
    var local = mysql.createConnection({
      host: config.local.db_host,
      user: config.local.db_user,
      password: config.local.db_password,
      database: config.local.db_name,
      port: config.local.port
    });

    local.connect( function( err ) {

      if( err ) {
        console.log( err );
        console.log( 'Error connecting to local database:'.red, config.local.db_name.yellow );
        return;
      }
      console.log( 'Connection established to local database:'.green, config.local.db_name.yellow );

      // Store copy of local database
      exec( local_dump_cmd,  function( err, out, code ) {

        // Replace local database dump config url with sync placeholders
        var contents = fs.readFileSync( local_dump, 'utf-8' );
        contents = contents.replace( config.local.url, 'wordpress-deploy-sync' );
        fs.writeFileSync( local_dump, contents );

        // Clone relevant wp-contents/ folders
        wrench.copyDirSyncRecursive('../../plugins/', './sync/plugins/', { forceDelete: true });
        wrench.copyDirSyncRecursive('../../uploads/', './sync/uploads/', { forceDelete: true });

        // Sync wp-contents/ folders
        // sync.settings = _.extend( {}, sync_options, contents_options );
        // sync.run();

      });

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
          console.log( 'Error connecting to remote databse:'.red, config.remote.db_name.yellow );
          console.log( colors.red( err ) );
          local.end();
          remote.end();
          return;
        }
        console.log( 'Connection established to remote database:'.green, config.remote.db_name.yellow );

        // Execute database comparison
        // exec('mysqldbcompare --server1=' + config.local.db_user + '@' + config.local.db_host + ' deploylocal:deployremote --run-all-tests', function( err, out, code ) {
        //   if ( err ) throw err;
        //   process.stderr.write(err);
        //   process.stdout.write(out);
        //   process.exit(code);
        // });

      });

    });

  };

  // --------------------------------------
  // Sync
  // --------------------------------------

  this.sync = function () {

    rsync({
      root: '../../',
      hostname: config.remote.ftp.hostname,
      destination: config.remote.ssh.destination + 'wp-content',
      username: ( config.remote.ssh.username ) ? config.remote.ssh.username : null,
      port: config.remote.ssh.port,
      recursive: true,
      clean: true
    });

    rsync({
      root: '/',
      hostname: config.remote.ftp.hostname,
      destination: config.remote.ssh.destination + 'wp-content/themes/' + config.remote.theme_name,
      username: ( config.remote.ssh.username ) ? config.remote.ssh.username : null,
      port: config.remote.ssh.port,
      recursive: true,
      clean: true
    });

  };

  return this;

};

// --------------------------------------
// Export
// --------------------------------------

module.exports = deploySync;
