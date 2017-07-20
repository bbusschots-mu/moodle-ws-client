/**
 * @file Provides the NodeJS module
 * [moodle-ws-client]{@link module:@maynoothuniversity/moodle-ws-client}. The
 * module is exported as the JavaScript prototype/class
 * [MoodleWSClient]{@link module:@maynoothuniversity/moodle-ws-client~MoodleWSClient}.
 * @author Bart Busschots <Bart.Busschots@mu.ie>
 * @version 0.0.1
 * @see {@link https://github.com/bbusschots-mu/moodle-ws-client}
 */

// import requirements
const validateParams = require('@maynoothuniversity/validate-params');
const validate = validateParams.validateJS();

//
//=== JSDoc ground-work ========================================================
//

//
//--- JSDoc Module Desription --------------------------------------------------
//

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

//
//--- JSDoc Externals ----------------------------------------------------------
//

/**
 * The `@maynoothuniversity/validate-params` module.
 * @external validateParams
 * @see {@link https://github.com/bbusschots-mu/validateParams.js}
 */

//
//--- JSDoc Typedefs -----------------------------------------------------------
//

/**
 * A JavaScript plain object as per the
 * [isPlainObject() function from validateParams]{@link external:validateParams.isPlainObject}.
 * @typedef {Object} PlainObject
 */

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
 * A valid HTTP Method, e.g. `'GET'`.
 * @typedef {string} HttpMethod
 */

/**
 * A valid Moodle Web Service Data Format. Specificall, a valid value for the
 * `moodlewsrestformat` parameter in Moodle Web requests.
 *
 * Currently (as of Moodle 3.3), the following values are supported:
 *
 * * `json` - JSON formatted text
 * * `xml` - XML formatted text
 *
 * @typedef {string} WSDataFormat
 */

/**
 * A valid Moodle Web Service Function Name.
 * @typedef {string} WSFunctionName
 */

//
//--- JSDoc Exterals -----------------------------------------------------------
//

/**
 * A plain object for use in validateParam.js constraints lists. I.e. a plain
 * object indexed by validator names and per-parameter options.
 * @external ValidateParamsConstraints
 */

//
//=== Validation Setup =========================================================
//

/**
 * A collection of re-uable validateParams.js constraints.
 *
 * @namespace
 * @private
 */
var vpCons = {
    /**
     * A valid HTTP method, defaulting to GET on empty and coercing itself to
     * all caps.
     * @member
     * @type {external:ValidateParamsConstraints}
     * @see HttpMethod
     */
    httpMethod: {
        hasTypeof: 'string',
        format: /GET|POST|PUT/,
        vpopt_defaultWhenEmpty: 'GET',
        vpopt_coerce: function(v, o , c){
            v = c.toString(v);
            if(validate.isString(v)){
                v = v.toUpperCase();
            }
            return v;
        }
    },
    
    /**
     * A valid data format for calls to the Moodle web service.
     * @member
     * @type {external:ValidateParamsConstraints}
     * @see WSDataFormat
     */
    wsDataFormat: {
        hasTypeof: 'string',
        format: /json|xml/,
        vpopt_defaultWhenEmpty: 'json',
        vpopt_coerce: function(v, o , c){
            v = c.toString(v);
            if(validate.isString(v)){
                v = v.toLowerCase();
            }
            return v;
        }
    },
    
    /**
     * A valid web service function name.
     * @member
     * @type {external:ValidateParamsConstraints}
     * @see WSFunctionName
     */
    wsFunctionName: {
        hasTypeof: 'string',
        format: /[a-z_]+/,
        vpopt_coerce: function(v, o , c){
            v = c.toString(v);
            if(validate.isString(v)){
                v = v.toLowerCase();
            }
            return v;
        }
    }
};


//
//=== Define The Main Class ====================================================
//

/**
 * A class representing a connection to a Moodle REST API.
 *
 * @see {@link https://docs.moodle.org/33/en/Web_services}
 */
class MoodleWSClient{
    /**
     * @param {SecureURL} moodleBaseURL - the base URL of the Moodle site.
     * @param {MoodleToken} token - the token to authenticate with.
     * @param {Object} [options]
     * @param {boolean} [options.acceptUntrustedTLSCert=false] - whether or not
     * to accept TLS certificates that don't pass validation. Unless your Moodle
     * @param {WSDataFormat} [options.dataFormat='json'] - the format
     * the Moodle Web Service should use when returning data. By default, the
     * data is returned in JSON format.
     * server uses a self-signed certificate, don't set this to `true`!
     * @throws {external:validateParams.ValidationError}
     */
    constructor(){
        // validate parameters
        var args = validateParams.assert(arguments, [
            { // the Base URL
                paramOptions: {
                    name: 'baseURL',
                    coerce: function(v){ // ensure a trailing slash
                        return typeof v === 'string' && !v.match(/\/$/) ? v + '/' : v;
                    }
                },
                presence: true,
                url: {
                    schemes: ['https'],
                    allowLocal: true
                },
                format: /.*\// // insit on a trailing slash
            },
            { // the token
                vpopt_name: 'token',
                presence: true,
                format: {
                    pattern: "[a-z0-9]{32}",
                    message: "must be a 32 character lower-case hex string"
                }
            },
            { // options
                paramOptions: {
                    name: 'options',
                    defaultWhenUndefined: {},
                    coerce: function(v, o, c){
                        if(!validate.isObject(v)) return v; // immediately pass through invalid values
                        
                        // default each of the options
                        v.acceptUntrustedTLSCert = validate.isDefined(v.acceptUntrustedTLSCert) ? c.toBoolean(v.acceptUntrustedTLSCert) : false;
                        if(!validate.isEmpty(v.dataFormat)){
                            v.dataFormat = vpCons.wsDataFormat.vpopt_coerce(v.dataFormat, o, c);
                        }else{
                            v.dataFormat = vpCons.wsDataFormat.vpopt_defaultWhenEmpty;
                        }
                        
                        // return the tweaked object
                        return v;
                    }
                },
                dictionary: {
                    mapConstraints: {
                        acceptUntrustedTLSCert: { presence: true, hasTypeof: 'boolean' },
                        dataFormat: validateParams.extendObject({ presence: true }, validateParams.paramToAttrConstraints(vpCons.wsDataFormat))
                    }
                }
            }
        ]);
        
        // store data
        this._baseURL = args.baseURL;
        this._token = args.token;
        this._options = args.options;
    }
    
    /**
     * Function to execute a query against the Moodle API
     *
     * @param {HttpMethod} method
     * @param {WSFunctionName} wsFunctionName
     * @param {PlainObject} wsParameters - a plain object containing the
     * parameters to send to the web service. This object can be used to
     * override the default data format via the `moodlewsrestformat` key.
     * @returns {Promise}
     * @throws {external:validateParams.ValidationError}
     */
    submit(){
        var args = validateParams.assert(arguments, [
            validateParams.extendObject({ vpopt_name: 'method', presence: true }, vpCons.httpMethod),
            validateParams.extendObject({ vpopt_name: 'wsFunctionName', presence: true }, vpCons.wsFunctionName),
            {
                vpopt_name: 'wsParameters',
                dictionary: true
            }
        ]);
    }
}

module.exports = MoodleWSClient;