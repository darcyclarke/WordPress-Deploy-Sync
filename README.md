
# Gulp WordPress Deploy

A WordPress Deployment workflow that doesn't kill braincells

### Table of Contents

- [Installation](#installation)
- [Deploying](#deploying)
- [Syncing](#syncing)

### Installation

#### Install Dependancies

`npm install`

#### Update `config.json`

The configuration file holds all the relevant database, user and path information.

```json
{
  "local": {
  	"url": "http://localhost:8888",
    "db_name": "local_db_name",
    "db_user": "local_db_username",
    "db_password": "local_db_password",
    "db_host": "localhost",
    "port": 8889,
    "dump": "/applications/MAMP/library/bin/mysqldump"
  },
  "remote": {
    "url": "http://domain.com",
    "db_name": "remote_db_name",
    "db_user": "remote_db_username",
    "db_password": "remote_db_password",
    "db_host": "localhost",
    "port": 3306,
    "ssh": {
      "hostname": "ftp.domain.com",
      "username": "ftp_username",
      "password": "ftp_password",
      "destination": "./public_html/",
      "port": 21
    }
  }
}
````

**Note:** Don't add trailing slashes to `local.url` or `remote.url` values.

**Note:** You shouldn't have to update values like `local.port` or `local.dump` unless you've changed where [MAMP]() has been installed or is running the MySQL server.

**Note:** The `remote.ssh.desination` value should be the path to your theme directory on your server.

### Deploying

Gulp WordPress Deploy will generate a `./sync` folder in your theme directory. This will store things like a backup copy of your local and remote databases as well as any content from your `wp-contents/plugins` or `wp-contents/uploads` folders. These copies are required when running a `gulp sync` which is perfect for working with a team over Github (as you will need to check in this content to stay consistent).

`gulp deploy`

### Syncing

When you're working with a team of people on a WordPress you'll want to check in code. Before doing this, you should run `gulp deploy` to ensure that all relevant *static assets* and your local database will be reflected in your Git repo. If you've pulled down someones work (ie. `git pull`) and they've made changes to the WordPress database, plugins or uploads, then it's a good time to run `gulp sync`.

`gulp sync`

`gulp sync` looks in the `./sync/` folder and will compare/update your local database and `wp-contents` folder.
