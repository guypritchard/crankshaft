"use strict";
exports.__esModule = true;
exports.JSONFile = void 0;
var fs = require("fs");
var JSONFile = /** @class */ (function () {
    function JSONFile() {
    }
    JSONFile.read = function (path) {
        try {
            var versionJSON = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' });
            if (versionJSON != null) {
                return JSON.parse(versionJSON);
            }
        }
        catch (e) {
            console.error(e);
        }
        throw new Error("Couldn't find or load " + path);
    };
    JSONFile.write = function (path, data) {
        fs.writeFileSync(path, JSON.stringify(data));
    };
    return JSONFile;
}());
exports.JSONFile = JSONFile;
