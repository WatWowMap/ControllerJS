![Node.js CI](https://github.com/versx/ControllerJS/workflows/Node.js%20CI/badge.svg)
# ControllerJS  

Device controller alternative to [RealDeviceMap](https://github.com/RealDeviceMap/RealDeviceMap) `/controler` endpoint  

## Prerequisites  
- [MySQL 8](https://dev.mysql.com/downloads/mysql/) or [MariaDB 10](https://mariadb.org/download/) database server  
- [Redis Server](https://redis.io/download) 

## Installation  
1.) Clone repository `git clone https://github.com/versx/ControllerJS`  
2.) Install dependencies `npm install`  
3.) Copy config `cp src/config.example.json src/config.json`  
4.) Fill out config `vi src/config.json` (listening port, instances, db info, etc)  
5.) Run `npm run create-locales` to create locale translation files  
6.) Run `npm run start` (Database tables will be created if they don't exist)  
7.) Point `backend_url` config property in [DeviceConfigManager](https://github.com/versx/DeviceConfigManager) to `http://dataparser_ip:9002`  
8.) Import your existing `RDM` instances to your ControllerJS/DataParser `instance` table (replace `bjsdb` with database name for Controller/DataParser) and replace `rdmdb` with your existing RDM's database name):  
```
INSERT INTO bjsdb.instance (name, type, data)
SELECT name, type, data FROM rdmdb.instance;
```
9.) Visit `http://controllerip:9002` to add accounts, assign devices, or manage instances and auto-assignments  

## Configuration
```js
{
    // Listening host interface
    "host": "0.0.0.0",
    // Listening port
    "port": 9002,
    "db": {
        // Database host IP address/host
        "host": "127.0.0.1",
        // Database server listening port
        "port": 3306,
        // Database username for authentication
        "username": "user123",
        // Database password for authentication
        "password": "pass123",
        // Database name to write data to
        "database": "bjsdb",
        // Database character set to use
        "charset": "utf8mb4"
    },
    // Logging options
    "logs": {
        /** Log level to set, available options are:
         * debug: 4
         * log: 3
         * info: 2
         * warn: 1
         * error: 0
         * line: 1
         * turn off all logging: -1
         */
        "level": 4,
        // Enable file logging to /logs folder
        "file": false
    },
    // Redis server settings (used for pub/sub communication
    // between ControllerJS and DataParser)
    "redis": {
        // Redis host IP address/host
        "host": "127.0.0.1",
        // Redis server listening port
        "port": 6379,
        // Redis server optional password for authentication
        "password": ""
    },
}
```

## Updating  
1.) `git pull`  
3.) `npm install`  

## Current Issues  
- Auto-Assignments might not work correctly

## Discord  
https://discordapp.com/invite/zZ9h9Xa  
