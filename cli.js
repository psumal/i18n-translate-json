#!/usr/bin/env node

'use strict';

var translate = require("./translate");
var path = require("path");
var getJSON = require("get-json");

var argv = require("yargs")
    .usage("Usage: $0 <apiKey> <startDir> <sourceLang> <targetLang1,targetLang2,..>")
    .boolean("includeHtml")
    .describe("includeHtml", "Include HTML entries in the translation")
    .boolean("missingOnly")
    .describe("missingOnly", "If set, do not overwrite existing translation")
    .boolean("cleanUp")
    .describe("cleanUp", "If set, removes unused translations at target files.")
    .number("spaces")
    .describe("spaces", "Number of spaces in output-json. If option is omitted, tabs are used.")
    .string("ignoreRegExp")
    .describe("ignoreRegExp", "A regular expression to ignore. Set `\\{\\{\\s*(.*?)\\s*\\}\\}` for angular interpolation variables (`{{ my-variable-name }}`). Default: Translate all.")
    .help("h")
    .alias("h", "help")
    .example("$0 YOUR_API_KEY examples/ en nl,de", "Translate the file examples/en.json to examples/nl.json and examples/de.json")
    .argv;

if (argv._.length < 4) {
  console.error("Usage: i18-translate-json <apiKey> <startDir> <sourceLang> <targetLang1,targetLang2,..>");
  return 1;
}

// get the start directory from parameters
var apiKey = argv._[0];
var startDir = argv._[1];
var sourceLang = argv._[2];
var targetLang = argv._[3];

// append / at the end of directory
if (startDir[startDir.length - 1] != "/") {
	startDir += "/";
}

// run translation
var run = function() {
  path.resolve(__dirname, startDir);

  translate.run(apiKey, startDir, sourceLang, targetLang, argv.includeHtml, argv.missingOnly, argv.cleanUp, argv.spaces, argv.ignoreRegExp,  function(err, result) {
  
  	if (err) {
  		console.log("ERROR:");
  		console.log(err);
  		process.exit(0);
  	}
  
  	process.exit(0);
  });
}

// if target languages are not provided, get all languages supported by Google Translate
if (!targetLang) {
  targetLang = [];
  getJSON('https://translation.googleapis.com/language/translate/v2/languages?key=' + apiKey, function(error, response) {
    if (error) {
  		console.log("ERROR:");
  		console.log(error);
  	  process.exit(0);
    }
    else {
      var langs = response.data.languages;
      for (var i = 0; i < langs.length; i++) {
        var lang = langs[i].language;
        if (lang.length === 2) {
          targetLang.push(lang);
        }
      }
      run();
    }
  });
}
else {
  targetLang = targetLang.split(',');
  // trim whitespaces for targetlangs
  for (var i = 0; i < targetLang.length; i++) {
  	targetLang[i] = targetLang[i].trim();
  }
  run();
}
