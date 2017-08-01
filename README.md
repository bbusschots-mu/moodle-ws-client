# @maynoothuniversity/moodle-ws-client

A Moodle Web Services Client for NodeJS.

## Example

```
// import the module
const MoodleWSClient = require('@maynoothuniversity/moodle-ws-client');

// instantiate a client
let myMoodle = new MoodleWSClient(
    'https://myServer.com/', // base URL of Moodle instance
    '1234567890ABCDEF1234567890ABCDEF' // Web Service token
);

// submit a query to the web service (return a promise of the data)
myMoodle.submit(
    'GET', // HTTP method
    'core_webservice_get_site_info' // web service function name
).then(function(data){
    console.log(data);
});
```