// import the module under test
const MoodleWSClient = require('../');

QUnit.test('class exists', function(a){
    a.equal(typeof MoodleWSClient, 'function');
    
    QUnit.module('constructor', {}, function(){
        QUnit.test('constructor can build an object', function(a){
            a.ok(new MoodleWSClient());
        });
    });
});