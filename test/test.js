//
//=== Import Required Modules ==================================================
//

// import the module under test
const MoodleWSClient = require('../');

// import validateParams for access to the error prototype
const validateParams = require('@maynoothuniversity/validate-params');
const validate = validateParams.validateJS();

// import modules needed for reading the optional Moodle instance details
const path = require('path');
const fs = require('fs-extra');

//
//=== Utility Variables & Functions ============================================
//

/**
 * An object which may be populated with Moodle instance details for running
 * tests against a real Moodle instance.
 *
 * This object is populated from `test/moodleDetails.json`.
 *
 * @type {{url: string, token: string}}
 */
const MOODLE_DETAILS = {
    url: '',
    token: ''
};

/**
 * The path to search for the Moodle details JSON file at.
 * @type {string}
 */
const MOODLE_DETAILS_PATH = path.join(__dirname, 'moodleDetails.json');
try{
    if(fs.existsSync(MOODLE_DETAILS_PATH)){
        let moodleDetails = fs.readJsonSync(MOODLE_DETAILS_PATH);
        if(moodleDetails.url && moodleDetails.token){
            MOODLE_DETAILS.url = moodleDetails.url;
            MOODLE_DETAILS.token = moodleDetails.token;
            console.info(`will run live tests against Moodle instance at ${MOODLE_DETAILS.url} with token=${MOODLE_DETAILS.token}`);
        }else{
            console.info(`skipping live tests - invalid data in Moodle details file at '${MOODLE_DETAILS_PATH}'`);
        }
    }else{
        console.info(`skipping live tests - no Moodle details file at '${MOODLE_DETAILS_PATH}'`);
    }
}catch(err){
    console.warn(`failed to load moodle details from '${MOODLE_DETAILS_PATH}' with error: ${err.message}`);
}

/**
 * An object containing dummy data. The pieces of dummy data are indexed by
 * names, and each piece of dummy data is itself an object indexed by `desc` (a
 * description) and `val` (the dummy value).
 *
 * This object is re-built before each test
 * 
 * @type {Object.<string, {desc: string, val: *}>}
 */
let DUMMY_DATA = {};

/**
 * An object just like {@link DUMMY_DATA}, but limited to just the basic types
 * returned by typeof.
 * 
 * @see DUMMY_DATA
 */
let DUMMY_BASIC_TYPES = {};

// add a callback to reset the dummy data before each test
QUnit.testStart(function() {
    DUMMY_DATA = {
        undef: {
            desc: 'undefined',
            val: undefined
        },
        bool: {
            desc: 'a boolean',
            val: true
        },
        num: {
            desc: 'a number',
            val: 42,
        },
        str_empty: {
            desc: 'an empty string',
            val: ''
        },
        str: {
            desc: 'a generic string',
            val: 'boogers!'
        },
        arr_empty: {
            desc: 'an emptyy array',
            val: [],
        },
        arr: {
            desc: 'an array',
            val: [1, 2, 3],
        },
        obj_empty: {
            desc: 'an empty plain object',
            val: {},
        },
        obj: {
            desc: 'a plain object',
            val: {b: 'boogers'}
        },
        obj_proto: {
            desc: 'a prototyped object',
            val: new Error('dummy error object')
        },
        fn: {
            desc: 'a function object',
            val: function(a,b){ return a + b; }
        },
        url: {
            desc: 'an HTTPS URL',
            val: 'https://localhost/'
        },
        token: {
            desc: 'a Moodle Webservice token',
            val: '00000000000000000000000000000000'
        }
    };
    DUMMY_BASIC_TYPES = {
        undef: DUMMY_DATA.undef, 
        bool: DUMMY_DATA.bool,
        num: DUMMY_DATA.num,
        str: DUMMY_DATA.str,
        arr: DUMMY_DATA.arr,
        obj: DUMMY_DATA.obj,
        fn: DUMMY_DATA.fn
    };
});

/**
 * A function to return a dummy value given a type name, i.e. an index on
 * {@link DUMMY_DATA}.
 *
 * @params {string} typeName
 * @returns {*} the `val` of the appropriate entry in {@link DUMMY_DATA}.
 */
function dummyVal(typeName){
    return DUMMY_DATA[typeName].val;
}

/**
 * A function to return the description of a dummy value given a type name, i.e.
 * an index on {@link DUMMY_DATA}.
 *
 * @params {string} typeName
 * @returns {string} the `desc` of the appropriate entry in {@link DUMMY_DATA}.
 */
function dummyDesc(typeName){
    return DUMMY_DATA[typeName].desc;
}

/**
 * A function to return the names of all dummy basic types not explicitly
 * excluded.
 *
 * @param {...string} typeName - the names of the types to exclude from the
 * returned list.
 * @returns Array.<string> the names of all the dummy basic types except those
 * excluded by the passed arguments as an array of strings.
 */
function dummyBasicTypesExcept(){
    // build and exclusion lookup from the arguments
    var exclude_lookup = {};
    for(var i = 0; i < arguments.length; i++){
        exclude_lookup[arguments[i]] = true;
    }
    
    // build the list of type names not excluded
    var ans = [];
    Object.keys(DUMMY_BASIC_TYPES).sort().forEach(function(tn){
        if(!exclude_lookup[tn]){
            ans.push(tn); // save the type name if not excluded
        }
    });
    
    // return the calculated list
    return ans;
}

//
//=== Define Tests =============================================================
//

//
//--- Off-line tests (always run) ----------------------------------------------
//

QUnit.module('main exported class', {}, function(){

    QUnit.test('class exists', function(a){
        a.equal(typeof MoodleWSClient, 'function');
    });
        
    QUnit.module('constructor', {}, function(){
        QUnit.test('argument handling', function(a){
            a.expect(7);
            
            // make sure required arguments are required
            a.throws(
                function(){
                    new MoodleWSClient();
                },
                validateParams.ValidationError,
                'call without any arguments throws error'
            );
            a.throws(
                function(){
                    new MoodleWSClient(dummyVal('url'));
                },
                validateParams.ValidationError,
                'call with only one valid argument throws error'
            );
            
            // make sure valid arguments are accepted
            a.ok(
                (function(){
                    new MoodleWSClient(dummyVal('url'), dummyVal('token'));
                    return true;
                })(),
                'call with all required valid arguments does not throw an error'
            );
            
            // make sure arguments are properly saved into the constructed object
            var dummyOptions = {
                acceptUntrustedTLSCert: true,
                dataFormat: 'xml',
                timeout: 10000
            };
            var m1 = new MoodleWSClient(dummyVal('url'), dummyVal('token'), dummyOptions);
            a.equal(m1._moodleUrl, dummyVal('url'), 'Moodle base URL stored');
            a.equal(m1._token, dummyVal('token'), 'webservice token stored');
            a.deepEqual(m1._options, dummyOptions, 'options stored');
            
            // check URL coercion
            var m2 = new MoodleWSClient('https://localhost', dummyVal('token'));
            a.equal(m2._moodleUrl,'https://localhost/', 'trailing / coerced onto Moodle base URL');
        });
        
        QUnit.test('options defaults', function(a){
            a.expect(4);
            var m1 = new MoodleWSClient(dummyVal('url'), dummyVal('token'));
            a.ok(validate.isObject(m1._options), 'options created as object');
            a.strictEqual(m1._options.acceptUntrustedTLSCert, false, 'acceptUntrustedTLSCert defaults to false');
            a.strictEqual(m1._options.dataFormat, 'json', "dataFormat defaults to 'json'");
            a.strictEqual(m1._options.timeout, 5000, "timeout defaults to 5,000ms");
        });
    });
    
    // NOTE
    // ====
    // Can't easily test any of the instance methods because they require access
    // to a Moodle instance, so these tests are very very basic.
    QUnit.module('instance methods', {}, function(){
        QUnit.test('.moodleUrl() instance method exists', function(a){
            a.strictEqual(typeof MoodleWSClient.prototype.moodleUrl, 'function');
        });
        QUnit.test('.apiUrl() instance method exists', function(a){
            a.strictEqual(typeof MoodleWSClient.prototype.apiUrl, 'function');
        });
        
        QUnit.test('.submit() instance method exists', function(a){
            a.strictEqual(typeof MoodleWSClient.prototype.submit, 'function');
        });
        
        QUnit.test('.registerShortcut() instance method', function(a){
            a.expect(3);
            a.strictEqual(typeof MoodleWSClient.prototype.registerShortcut, 'function', 'method exists');
            var m1 = new MoodleWSClient(dummyVal('url'), dummyVal('token'));
            var m2 = m1.registerShortcut('addUser', 'core_user_create_users', 'POST');
            a.strictEqual(m1, m2, 'returns a reference to self');
            a.strictEqual(typeof m1.addUser, 'function', 'shortcut function created');
        });
        
        QUnit.test('.registerShortcuts() instance method', function(a){
            a.expect(4);
            a.strictEqual(typeof MoodleWSClient.prototype.registerShortcuts, 'function', 'method exists');
            var m1 = new MoodleWSClient(dummyVal('url'), dummyVal('token'));
            var scs = {
                addUser: ['core_user_create_users', 'POST'],
                deleteUser: ['core_user_delete_users', 'POST']
            };
            var m2 = m1.registerShortcuts(scs);
            a.strictEqual(m1, m2, 'returns a reference to self');
            a.strictEqual(typeof m1.addUser, 'function', '1st shortcut function created');
            a.strictEqual(typeof m1.deleteUser, 'function', '2nd shortcut function created');
        });
    });
    
    QUnit.test('.encodeWSArguments() static function', function(a){
        a.expect(4);
        a.deepEqual(MoodleWSClient.encodeWSArguments({ 'criteria[0][key]': 'deleted', 'criteria[0][value]': '0' }), { 'criteria[0][key]': 'deleted', 'criteria[0][value]': '0' }, 'already encoded object passes through un-changed');
        a.deepEqual(MoodleWSClient.encodeWSArguments({a: 'b'}), {a: 'b'}, 'un-nested object returns expected value');
        a.deepEqual(MoodleWSClient.encodeWSArguments({a: { b: 'c' }}), {'a[b]': 'c'}, 'nested object returns expected value');
        a.deepEqual(MoodleWSClient.encodeWSArguments({ criteria: [ { key: 'deleted', value: 0 } ] }), { 'criteria[0][key]': 'deleted', 'criteria[0][value]': '0' }, 'nested object containing array returns expected value');
    });
});

QUnit.module('custom error class', {}, function(){
    QUnit.test('class exists', function(a){
        a.equal(typeof MoodleWSClient.MoodleWSError, 'function');
    });
    
    QUnit.test('response data correctly stored', function(a){
        a.expect(1);
        let data = {
            exception: 'moodle_exception',
            errorcode: 'categoryidnumbertaken',
            message: 'ID number is already used for another category'
        };
        let err = new MoodleWSClient.MoodleWSError(data);
        a.strictEqual(err.responseData(), data);
    });
    
    QUnit.test('messages correctly generated', function(a){
        a.expect(5);
        a.strictEqual((new MoodleWSClient.MoodleWSError({})).message, 'unknown webservice error', 'default message on empty data');
        a.strictEqual((new MoodleWSClient.MoodleWSError({exception: 'moodle_exception'})).message, 'moodle_exception: unknown webservice error', "correct message with just 'moodle_exception'");
        a.strictEqual((new MoodleWSClient.MoodleWSError({errorcode: 'categoryidnumbertaken'})).message, 'unknown webservice error (Error Code: categoryidnumbertaken)', "correct message with just 'errorcode'");
        a.strictEqual((new MoodleWSClient.MoodleWSError({message: 'ID number is already used for another category'})).message, 'ID number is already used for another category', "correct message with just 'message'");
        a.strictEqual(
            (new MoodleWSClient.MoodleWSError({
                exception: 'moodle_exception',
                errorcode: 'categoryidnumbertaken',
                message: 'ID number is already used for another category'
            })).message,
            'moodle_exception: ID number is already used for another category (Error Code: categoryidnumbertaken)',
            'correct message with all keys passed');
    });
});

//
//--- Live tests (only run if moodleDetails.json is present & correct) ---------
//

if(MOODLE_DETAILS.url){
    QUnit.module('Live Tests', {}, function(){
        QUnit.test('webservice ping', function(a){
            a.expect(2);
            let m = new MoodleWSClient(MOODLE_DETAILS.url, MOODLE_DETAILS.token);
            let done = a.async(1);
            let p = m.submit('GET', 'core_webservice_get_site_info').then(
                function(data){
                    a.ok(data && data.siteurl, 'promise resolved to expected data');
                    done();
                },
                function(){ done(); }
            );
            a.ok(validate.isPromise(p), '.submit() returns a promise');
        });
        
        QUnit.test('exception catching', function(a){
            a.expect(3);
            // use an intentionally incorrect token to trigger an exception
            let m = new MoodleWSClient(MOODLE_DETAILS.url, '00000000000000000000000000000000');
            let done = a.async(1);
            let p = m.submit('GET', 'core_webservice_get_site_info').then(
                function(){ done(); },
                function(err){
                    a.ok(true, 'an error was thrown');
                    a.ok(err instanceof MoodleWSClient.MoodleWSError, 'the error is a MoodleWSError');
                    done();
                }
            );
            a.ok(validate.isPromise(p), '.submit() returns a promise');
        });
    });
}