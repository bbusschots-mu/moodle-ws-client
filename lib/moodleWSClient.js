/**
 * @file Provides the NodeJS module
 * [@maynoothuniversity/moodle-ws-client]{@link module:@maynoothuniversity/moodle-ws-client}.
 * The module's export is the class {@link MoodleWSClient}.
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
//--- JSDoc Externals ----------------------------------------------------------
//

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
 * `isPlainObject()` function from [validateParams]{@link external:validateParams}.
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
 * A plain object for use in [validateParam.js]{@link external:validateParams}
 * constraints lists. I.e. a plain object indexed by validator names and
 * per-parameter options.
 * @typedef {Object} ValidateParamsConstraints
 */

/**
 * An validation error with the prototype `ValidationError` as provided by the
 * [validateParams module]{@link external:validateParams}.
 * @typedef {Error} ValidationError
 */

/**
 * A duration (length of time) represented as one of the following:
 * 
 * * a whole number of milliseconds greater than zero.
 * * a duration object as produced by the
 *   `.duration()` function from the [moment module]{@link exteral:moment}
 *   representing a duration greater than 1 ms.
 * * a plain object or string that can be passed to the
 *   `.duration()` function from the [moment module]{@link exteral:moment}
 *   and produces a duration object representing at least 1 ms of time.
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
     * @type {ValidateParamsConstraints}
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
     * @type {ValidateParamsConstraints}
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
     * @type {ValidateParamsConstraints}
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
     * @type {ValidateParamsConstraints}
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
 * A class representing a connection to a Moodle REST API. This class is
 * exported as the
 * [@maynoothuniversity/moodle-ws-client module]{@link module:@maynoothuniversity/moodle-ws-client}.
 *
 * @see {@link https://docs.moodle.org/33/en/Web_services}
 */
class MoodleWSClient{
    /**
     * Note that this constructor will throw a {@link ValidationError} if
     * invalid parameters are passed.
     * 
     * @param {SecureUrl} moodleBaseUrl - the base URL of the Moodle site.
     * @param {MoodleToken} token - the token to authenticate with.
     * @param {Object} [options]
     * @param {boolean} [options.acceptUntrustedTLSCert=false] - whether or not
     * to accept TLS certificates that don't pass validation. Unless your Moodle
     * server uses a self-signed certificate, don't set this to `true`!
     * @param {Duration} [options.timeout=5000] - the default timeout to use
     * when making requests to the web service.
     * @throws {ValidationError} A validation error is thrown when invalid
     * parameters are passed.
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
     * Test connectivity to the REST API. This function is implemented as a
     * registered shortcut to the `core_webservice_get_site_info` web service
     * function with the HTTP method `GET` and no arguments.
     *
     * @name MoodleWSClient#ping
     * @function
     * @returns {Object}
     * @see MoodleWSClient#registerShortcut
     */
    
    /**
     * Get the Moodle instance's base URL.
     *
     * @returns {SecureUrl}
     */
    moodleUrl(){
        return this._moodleUrl;
    }
    
    /**
     * Get the URL for the Moodle instance's REST API.
     *
     * @returns {SecureUrl}
     */
    apiUrl(){
        return this._moodleUrl + MOODLE_API_PATH;
    }
    
    /**
     * Submit a request to the Moodle REST API.
     *
     * @async
     * @param {HttpMethod} method
     * @param {WsFunctionName} wsFunctionName
     * @param {PlainObject} wsParameters - a plain object containing the
     * parameters to send to the web service. This object can be used to
     * override the default data format via the `moodlewsrestformat` key.
     * @param {PlainObject} [options={}] - a plain object which can be used to
     * override default options like `timeout`. The parameters can be specified
     * as a regular JavaScript data structure, because they will automatically
     * get encoded into the format required by the Moodle web service.
     * @returns {PlainObject} Returns a promise of aplain object generated by
     * parsing the body of the web service response as a JSON string.
     * @throws {ValidationError} A validation error is thrown if invalid
     * parameters are passed.
     * @throws {MoodleWSError} A web service error is thrown if the reply
     * received from the web service is a JSON string representing an object
     * with the key `exception`.
     * @example <caption>A call with no web service parameters</caption>
     * let siteInfoPromise = myMoodleWS.submit('GET', 'core_webservice_get_site_info');
     * @example <caption>A call with web service parameters</caption>
     * let usersPromise = myMoodleWS.submit(
     *     'GET',
     *     'core_user_get_users',
     *     {
     *         criteria: [ { key: 'email', value: '%%' } ]
     *     }
     * );
     * // webservice parameters will get automatically translated to:
     * // {
     * //     'criteria[0][key]': 'deleted',
     * //     'criteria[0][value]': '0'
     * // }
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
                moodlewsrestformat: 'json'
            },
            strictSSL: !this._options.acceptUntrustedTLSCert,
            timeout: this._options.timeout
        };
        var customTimeout = vpCons.timeoutMS.vpopt_coerce(args.options.timeout, {}, validateParams.coercions);
        if(!validate.single(customTimeout, validateParams.paramToAttrConstraints(vpCons.timeoutMS))){
            reqOpts.timeout = customTimeout;
        }
        let encodedParams = MoodleWSClient.encodeWSArguments(args.wsParameters);
        for(let param in encodedParams){
            reqOpts.qs[param] = encodedParams[param];
        }
        
        // make the request and return the resulting promise
        return requestP(reqOpts).then(function(jsonStr){
            let responseData = JSON.parse(jsonStr);
            
            // if the response is an exception, throw an error
            if(responseData && responseData.exception){
                throw new MoodleWSError(responseData);
            }
            
            // return the response data
            return responseData;
        });
    }

    /**
     * Register a shortcut. This function creates functions with a given name
     * that act as wrappers for the
     * [.submit() function]{@link module:@maynoothuniversity/moodle-ws-client~MoodleWSClient#submit}
     * with the given HTTP method web service function name.
     *
     * @param {JsFunctionName} shortcut - the name for the shortcut function.
     * @param {WsFunctionName} wsFunctionName - the name of the Moodle web
     * service function this shortcut will invoke.
     * @param {HttpMethod} method - the HTTP method this shortcut function will
     * invoke the Moodle web service with.
     * @returns {MoodleWSClient} Returns a reference to self to facilitate
     * function chaining.
     * @example
     * // create a .addUser() function which calls .submit() with the HTTP
     * // method POST and the web service function name core_user_create_users
     * myMoodle.registerShortcut('addUser', 'core_user_create_users', 'POST');
     *
     * // use the .addUser function to create a user
     * let userDetails = {
     *     username: 'jbloggs',
     *     createpassword: true,
     *     firstname: 'Jane',
     *     lastname: 'Bloggs',
     *     email: 'jane.bloggs@uni.edu'
     * };
     * myMoodle.addUser({users: [userDetails]});
     * // equivalent to:
     * // myMoodle.submit('POST', 'core_user_create_users', {users: [userDetails]});
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
     * Register multiple shortcuts at once.
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
     * @returns {MoodleWSClient} Returns a reference to self to facilitate
     * function chaining.
     * @see MoodleWSClient#registerShortcut
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

/**
 * A function for converting JavaScript datastructures into parameters for
 * submission to the Moodle web services API. I.e. it would convert:
 * ```
 * {
 *   criteria: [{
 *     key: 'deleted',
 *     value: 0
 *   }]
 * }
 * ```
 * to:
 * ```
 * {
 *   'criteria[0][key]': 'deleted',
 *   'criteria[0][value]': '0'
 * }
 * ```
 *
 * @params {PlainObject} toConvert - the JavaScript datastructure to convert.
 * @returns {PlainObject}
 * @throws {ValidationError} A validation error is thrown if the first parameter
 * is not an object.
 * @throws {TypeError} - a type error is thrown if the datastrucure to be
 * converted contains anything other than a number, a string, a boolean, an
 * array, or a plain object.
 */
MoodleWSClient.encodeWSArguments = function(){
    let args = validateParams.assert(arguments, [{
        vpopt_name: 'toConvert',
        defined: true,
        dictionary: true
    }]);
    
    // define a recursive helper function
    let recursor = function(resObj, curPrefix, toProcess){
        if(validateParams.isPrimitive(toProcess)){
            resObj[curPrefix] = String(toProcess);
            return;
        }
        if(validate.isArray(toProcess)){
            for(let i = 0; i < toProcess.length; i++){
                recursor(resObj, curPrefix + '[' + i + ']', toProcess[i]); // BEWARE - recursion!
            }
            return;
        }
        if(validateParams.isPlainObject(toProcess)){
            for(let k in toProcess){
                let newPrefix = curPrefix + '[' + k + ']';
                if(curPrefix === '') newPrefix = '' + k;
                recursor(resObj, newPrefix, toProcess[k]); // BEWARE - recursion!
            }
            return;
        }
        // if we got here without returning, the data is invalid, so return an arror
        throw new TypeError('failed to convert datastructure to Moodle Web Service Parameter - unsupported data type encrountered');
    };
    
    // start the recursor at the base of the datastructure
    let ans = {};
    recursor(ans, '', args.toConvert);
    
    // return the result
    return ans;
};

//
//=== Define The Custom Error Class ============================================
//

/**
 * A custom error class for Moodle Web Service Exceptions. This class is
 * exported as
 * [@maynoothuniversity/moodle-ws-client.MoodleWSError]{@link module:@maynoothuniversity/moodle-ws-client.MoodleWSError}.
 *
 * @extends Error
 * @see [Based on this StackOverflow Answer]{@link https://stackoverflow.com/a/32749533/174985}
 */
class MoodleWSError extends Error{
    /**
     * @param {object} responseData - the response data returned by the Moodle
     * web service. Expected to be an object indexed by `exception`, `errorcode`
     * & `message`
     */
    constructor(){
        // coerce the argument into required form
        let args = validateParams.validate(arguments, [{
                paramOptions: {
                    name: 'responseData',
                    coerce: function(v){
                        if(validate.isObject(v)){
                            return v;
                        }
                        return {};
                    }
                }
            }]).validateAttributes();
        
        // generate the message based on the response
        let msg = '';
        if(args.responseData.exception){
            msg += args.responseData.exception + ': ';
        }
        msg += args.responseData.message ? args.responseData.message : 'unknown webservice error';
        if(args.responseData.errorcode){
            msg += ` (Error Code: ${args.responseData.errorcode})`;
        }
        
        // call the Error constructor
        super(msg);
        
        // sanitise the stack trace (NodeJS-only feature)
        Error.captureStackTrace(this, this.constructor);
        
        // set the error's name property
        /**
         * The error's name.
         * @readonly
         * @type {string}
         */
        this.name = this.constructor.name;
        
        // store the response data
        
        /**
         * The response data received from the webservice.
         * @private
         * @type {PlainObject}
         */
        this._responseData = args.responseData;
    }
    
    /**
     * Get the response data.
     *
     * @returns {object}
     */
    responseData(){
        return this._responseData;
    }
}

//
//=== Configure the Module Exports =============================================
//

/**
 * A NodeJS module for interacting with a [Moodle]{@link http://www.moodle.org}
 * instance through its REST-based web service API.
 *
 * This module exports the
 * [MoodleWSClient]{@link MoodleWSClient}
 * class.
 * 
 * @module @maynoothuniversity/moodle-ws-client
 * @author Bart Busschots <Bart.Busschots@mu.ie>
 * @version 1.0.0
 * @see {@link https://github.com/bbusschots-mu/moodle-ws-client}
 * @requires @maynoothuniversity/validate-params
 * @requires request
 * @requires request-promise-native
 * @requires moment
 */
module.exports = MoodleWSClient;

/**
 * A reference to the [MoodleWSError class]{@link MoodleWSError}.
 *
 * @name module:@maynoothuniversity/moodle-ws-client.MoodleWSError
 */
module.exports.MoodleWSError = MoodleWSError;