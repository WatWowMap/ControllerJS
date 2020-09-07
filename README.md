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
5.) Run `npm run start` (Database tables will be created if they don't exist)  
6.) Point `backend_url` config property in [DeviceConfigManager](https://github.com/versx/DeviceConfigManager) to `http://dataparser_ip:9002`  
7.) Import your existing `RDM` instances to your ControllerJS/DataParser `instances` table (replace testdb with database name and replace rdmdb with RDM's database name):  
```
INSERT INTO testdb.instance (name, type, data)
SELECT name, type, data FROM rdmdb.instance;
```
8.) Assign devices manually via DB or start RDM instance to controll via RDM UI for now.

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
        "database": "rdmdb",
        // Database character set to use
        "charset": "utf8mb4"
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
- IV instances occasionally get the same coordinates twice in a row  
- No polygon checks for IV instances, IV instances are currently `Global IV instances` per say  
- Issue with /api/ returning data for assignments/instances/devices outside of scope (currently non-issue, defaultData)  
- No status' for instances at the moment  

## Discord  
https://discordapp.com/invite/zZ9h9Xa  
