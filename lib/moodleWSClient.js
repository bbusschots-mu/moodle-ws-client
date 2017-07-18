/**
 * @file A [NodeJS module]{@link module:@maynoothuniversity/moodle-ws-client}
 * for interacting with Moodle through its REST-based web service API.
 * @author Bart Busschots <Bart.Busschots@mu.ie>
 * @version 0.0.1
 * @see {@link https://github.com/bbusschots-mu/moodle-ws-client}
 */

/**
 * A NodeJS module for interacting with Moodle through its REST-based web
 * service API.
 *
 * This module exports the
 * [MoodleWSClient]{@link module:@maynoothuniversity/moodle-ws-client~MoodleWSClient}
 * class.
 * 
 * @module @maynoothuniversity/moodle-ws-client
 * @requires @maynoothuniversity/validate-params
 */

// import requirements
const validateParams = require('@maynoothuniversity/validate-params');
const validate = validateParams.validateJS();

/**
 * A secure absolute URL, i.e. a full URL that stars with `https://`.
 * @typedef {string} SecureURL
 */

/**
 * A valid Moodle webservices token, i.e. a 32 character lower-case hexidecimal
 * string.
 * @typedef {string} MoodleToken
 */

/**
 * A class representing a connection to a Moodle REST API.
 *
 * @see {@link https://docs.moodle.org/33/en/Web_services}
 */
class MoodleWSClient{
    /**
     * Constructor Comment
     * 
     * @param {SecureURL} moodleBaseURL - the base URL of the Moodle site.
     * @param {MoodleToken} token - the token to authenticate with.
     */
    constructor(){
        // validate parameters
        var args = validateParams.assert(arguments, [
            {
                presence: true,
                url: {
                    schemes: ['https'],
                    allowLocal: true
                },
                paramOptions: {
                    name: 'baseURL',
                    coerce: function(v){
                        return typeof v === 'string' && !v.match(/\/$/) ? v + '/' : v;
                    }
                }
            },
            {
                presence: true,
                format: {
                    pattern: "[a-z0-9]{32}",
                    message: "must be a 32 character lower-case hex string"
                },
                vpopt_name: 'token'
            }
        ]);
        
        // store data
        this._baseURL = args.baseURL;
        this._token = args.token;
    }
}

module.exports = MoodleWSClient;