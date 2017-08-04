/**
 * @file Provides the NodeJS module
 * [moodle-ws-client]{@link module:@maynoothuniversity/moodle-ws-client}. The
 * module is exported as the JavaScript prototype/class
 * [MoodleWSClient]{@link module:@maynoothuniversity/moodle-ws-client~MoodleWSClient}.
 * @author Bart Busschots <Bart.Busschots@mu.ie>
 * @version 0.0.2
 * @see {@link https://github.com/bbusschots-mu/moodle-ws-client}
 */

// import requirements
const validateParams = require('@maynoothuniversity/validate-params');
const validate = validateParams.validateJS();
const requestP = require('request-promise-native');
const moment = require('moment');

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
 * @requires request
 * @requires request-promise-native
 * @requires moment
 */

//
//--- JSDoc Externals ----------------------------------------------------------
//

/**
 * A plain object for use in validateParam.js constraints lists. I.e. a plain
 * object indexed by validator names and per-parameter options.
 * @external ValidateParamsConstraints
 */

/**
 * The `@maynoothuniversity/validate-params` module.
 * @external validateParams
 * @see {@link https://github.com/bbusschots-mu/validateParams.js}
 */

/**
 * The `moment` module.
 * @external moment
 * @see {@link http://momentjs.com}
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
 * A valid JavaScript function name.
 * @typedef {string} JsFunctionName
 */

/**
 * A secure absolute URL, i.e. a full URL that starts with `https://`.
 * @typedef {string} SecureUrl
 */

/**
 * A duration (length of time) represented as one of the following:
 * 
 * * a whole number of milliseconds greater than zero.
 * * a duration object as produced by the
 *   [moment.duration()]{@link exteral:moment.duration} function representing a
 *   duration greater than 1 ms.
 * * a plain object or string that can be passed to the
 *   [moment.duration()]{@link exteral:moment.duration} function and produces
 *   a duration object representing at least 1 ms of time.
 * 
 * @typedef {(string|PlainObject|Object)} Duration
 * @see {@link http://momentjs.com/docs/#/durations/}
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
 * A valid Moodle Web Service Data Format. Specifically, a valid value for the
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
 * A valid Moodle Web Service Function Name. A string of lower-case letters and
 * underscores.
 * @typedef {string} WsFunctionName
 */

//
//=== Define Globals ===========================================================
//

/**
 * The path within a Moodle instance to the REST API.
 * @private
 * @type {string}
 */
const MOODLE_API_PATH = 'webservice/rest/server.php';

//
//=== Validation Setup =========================================================
//

/**
 * A collection of re-usable validateParams.js constraints.
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
     * @see WsFunctionName
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
    },
    
    /**
     * A valid timeout in Milliseconds with coercions from moment durations or
     * values that can be used to construct a moment duration.
     * @member
     * @type {external:ValidateParamsConstraints}
     * @see external:moment.duration
     */
    timeoutMS: {
        numericality: {
            onlyInteger: true,
            greaterThan: 0
        },
        vpopt_defaultWhenEmpty: 5000,
        vpopt_coerce: function(v, o, c){
            if(moment.isDuration(v)){
                return v.asMilliseconds();
            }
            if(validate.isObject(v) || validate.isString(v)){
                var ms = moment.duration(v).asMilliseconds();
                if(ms > 0) return ms;
            }
            return c.toNumber(v, o, c);
        }
    },

    /**
     * A valid JavaScript function name with a basic string coercion.
     * @member
     * @type {JsFunctionName}
     */
    jsFunctionName:{
        hasTypeof: 'string',
        format: /[a-zA-Z_$][a-zA-Z_$0-9]*/,
        vpopt_coerce: validateParams.coercions.toString
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
     * @param {SecureUrl} moodleBaseUrl - the base URL of the Moodle site.
     * @param {MoodleToken} token - the token to authenticate with.
     * @param {Object} [options]
     * @param {boolean} [options.acceptUntrustedTLSCert=false] - whether or not
     * to accept TLS certificates that don't pass validation. Unless your Moodle
     * server uses a self-signed certificate, don't set this to `true`!
     * @param {WSDataFormat} [options.dataFormat='json'] - the format
     * the Moodle Web Service should use when returning data. By default, the
     * data is returned in JSON format.
     * @param {Duration} [options.timeout=5000] - the default timeout to use
     * when making requests to the web service.
     * @throws {external:validateParams.ValidationError}
     */
    constructor(){
        // validate parameters
        var args = validateParams.assert(arguments, [
            { // the Base URL
                paramOptions: {
                    name: 'moodleBaseUrl',
                    coerce: function(v){ // ensure a trailing slash
                        return typeof v === 'string' && !v.match(/\/$/) ? v + '/' : v;
                    }
                },
                presence: true,
                url: {
                    schemes: ['https'],
                    allowLocal: true
                },
                format: /.*\// // insist on a trailing slash
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
                        if(!validate.isEmpty(v.timeout)){
                            v.timeout = vpCons.timeoutMS.vpopt_coerce(v.timeout, o, c);
                        }else{
                            v.timeout = vpCons.timeoutMS.vpopt_defaultWhenEmpty;
                        }
                        
                        // return the tweaked object
                        return v;
                    }
                },
                dictionary: {
                    mapConstraints: {
                        acceptUntrustedTLSCert: { presence: true, hasTypeof: 'boolean' },
                        dataFormat: validateParams.extendObject({ presence: true }, validateParams.paramToAttrConstraints(vpCons.wsDataFormat)),
                        timeout: validateParams.extendObject({ presence: true }, validateParams.paramToAttrConstraints(vpCons.timeoutMS))
                    }
                }
            }
        ]);
        
        // store data
        this._moodleUrl = args.moodleBaseUrl;
        this._token = args.token;
        this._options = args.options;
        
        // generate the standard ping shortcut function
        this.registerShortcut('ping', 'core_webservice_get_site_info', 'GET');
    }
    
    /**
     * A function to test connectivity to the web service. Implemented as a
     * shortcut to the `core_webservice_get_site_info` web service function with
     * the HTTP method `GET`.
     *
     * @name module:@maynoothuniversity/moodle-ws-client~MoodleWSClient#ping
     * @function
     * @returns {Object}
     * @see module:@maynoothuniversity/moodle-ws-client~MoodleWSClient#registerShortcut
     */
    
    /**
     * A read-only accessor to get the URL for the Moodle instance this Client
     * is accessing.
     *
     * @returns {SecureUrl}
     */
    moodleUrl(){
        return this._moodleUrl;
    }
    
    /**
     * A read-only accessor to get the REST API URL for the Moodle instance this
     * client is accessing.
     *
     * @returns {SecureUrl}
     */
    apiUrl(){
        return this._moodleUrl + MOODLE_API_PATH;
    }
    
    /**
     * Function to execute a query against the Moodle API
     *
     * @param {HttpMethod} method
     * @param {WsFunctionName} wsFunctionName
     * @param {PlainObject} wsParameters - a plain object containing the
     * parameters to send to the web service. This object can be used to
     * override the default data format via the `moodlewsrestformat` key.
     * @param {PlainObject} [options={}] - a plain object which can be used to
     * override default options like `timeout`.
     * @returns {Promise}
     * @throws {external:validateParams.ValidationError}
     */
    submit(){
        let args = validateParams.assert(arguments, [
            validateParams.extendObject({ vpopt_name: 'method', presence: true }, vpCons.httpMethod),
            validateParams.extendObject({ vpopt_name: 'wsFunctionName', presence: true }, vpCons.wsFunctionName),
            {
                paramOptions: {
                    name: 'wsParameters',
                    defaultWhenUndefined: {}
                },
                dictionary: true
            },
            {
                paramOptions: {
                    name: 'options',
                    defaultWhenUndefined: {}
                },
                dictionary: true
            }
        ]);
        
        // build up the request options object
        let reqOpts = {
            uri: this.apiUrl(),
            method: args.method,
            qs: {
                wstoken: this._token,
                wsfunction: args.wsFunctionName,
                moodlewsrestformat: this._options.dataFormat
            },
            strictSSL: !this._options.acceptUntrustedTLSCert,
            timeout: this._options.timeout
        };
        console.log(reqOpts);
        var customTimeout = vpCons.timeoutMS.vpopt_coerce(args.options.timeout, {}, validateParams.coercions);
        if(!validate.single(customTimeout, validateParams.paramToAttrConstraints(vpCons.timeoutMS))){
            reqOpts.timeout = customTimeout;
        }
        for(let param in args.wsParameters){
            reqOpts.qs[param] = args.wsParameters[param];
        }
        
        // make the request and return the resulting promise
        console.log(reqOpts);
        return requestP(reqOpts);
    }

    /**
     * A function to register a single shortcut. This will create a function with
     * the given name on the instance which will act as a wrapper for the
     * [.submit()]{@link MoodleWSClient#submit} function with the HTTP method
     * and Moodle web service function name hard-coded into the call.
     *
     * @param {JsFunctionName} shortcut - the name for the shortcut function.
     * @param {WsFunctionName} wsFunctionName - the name of the Moodle web
     * service function this shortcut will invoke.
     * @param {HttpMethod} method - the HTTP method this shortcut function will
     * invoke the Moodle web service with.
     * @returns {MoodleWSClient} a reference to self to facilitate function
     * chaining.
     * @example
     * // create a .addUser() function which calls .submit() with the HTTP
     * // method POST and the web service function name core_user_create_users
     * myClient.registerShortcut('addUser', 'core_user_create_users', 'POST');
     */
    registerShortcut(){
        let args = validateParams.assert(arguments, [
            validateParams.extendObject({ vpopt_name:'shortcut', presence:true }, vpCons.jsFunctionName),
            validateParams.extendObject({ vpopt_name: 'wsFunctionName', presence: true }, vpCons.wsFunctionName),
            validateParams.extendObject({ vpopt_name: 'method', presence: true }, vpCons.httpMethod)
        ]);

        // create the shortcut function
        let self = this;
        let func = function(){
            return self.submit.bind(self, args.method, args.wsFunctionName);
        };
        
        // store the shortcut function with the requested name
        this[args.shortcut] = func();
        
        // return reference to self
        return this;
    }
    
    /**
     * A function to register multiple shortcuts at once.
     *
     * @param {PlainObject} shortcuts - a plain object mapping shortcut names
     * to two-entry arrays of strings, the first being the Moodle web service
     * function name, the second the HTTP method, e.g.:
     * 
     * ```
     * {
     *   addUser: ['core_user_create_users ', 'POST'],
     *   deleteUser: ['core_user_delete_users ', 'DELETE']
     * }
     * ```
     * 
     * @returns {MoodleWSClient} a reference to self to facilitate function
     * chaining.
     * @see module:@maynoothuniversity/moodle-ws-client~MoodleWSClient#registerShortcut
     */
    registerShortcuts(){
        let args = validateParams.assert(arguments, [{
            paramOptions: {
                name: 'shortcuts'
            },
            defined: true,
            dictionary: {
                keyConstraints: { format: vpCons.jsFunctionName.format },
                valueConstraints: {
                    list: {
                        valueConstraints: {
                            presence: true,
                            hasTypeof: 'string'
                        },
                        lengthIs: 2
                    }
                }
            }
        }]);
        
        for(let shortcut in args.shortcuts){
            this.registerShortcut(shortcut, args.shortcuts[shortcut][0], args.shortcuts[shortcut][1]);
        }
        
        return this;
    }
}

//
//=== Export the MoodleWSClient class as the module ============================
//
module.exports = MoodleWSClient;