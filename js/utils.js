'use strict';

function getProperty(object, key, dfValue) {
    dfValue = dfValue || null;
    return object.hasOwnProperty(key) ? object[key] : dfValue;
}

function mergeTwoObject(firstObject, secondObject) {
    var object = {};
    for (var key in firstObject) {
        if (firstObject.hasOwnProperty(key)) {
            object[key] = firstObject[key];
        }
    }
    for (key in secondObject) {
        if (secondObject.hasOwnProperty(key)) {
            object[key] = secondObject[key];
        }
    }
    return object;
}