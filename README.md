# Setup for development
1. Install [Node.js](https://nodejs.org/en/download)
2. Download [XAMPP](https://www.apachefriends.org/index.html) and select MySQL and Apache to be installed
3. Start MySQL and Apache in XAMPP
4. Click on MySQL Admin button in XAMPP to open phpMyAdmin
5. Click on SQL menu in phpMyAdmin, paste the contents of jf-db.sql and click Go
6. Create .env file
## .env file setup
IS_DEV=true  
PORT=6222  
DB_URL=localhost  
DB_USER=root  
API_URL=http://localhost:6222  
JWT_SECRET=some_secret  
JWT_EXPIRES_IN=1h  
STEAM_API_KEY=your Steam API key  
MIKRO_DEBUG=false  
CORS_ALLOW_ORIGIN=*
### Steam API key
Get your Steam API key from [here](https://steamcommunity.com/dev/apikey), domain name can be anything
### Mikro debug
Enable this option to log the mysql commands executed by Mikro ORM

7. Run "npm run dev" command in the root folder to start the server
## Testing
Run "npm run test:api" command in the root folder to execute tests
## API documentation
Wrote API tests to serve as a basic documentation while also testing the endpoints, but planning to write an OpenAPI spec to use in Swagger