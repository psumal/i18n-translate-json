const fs = require("fs");
const async = require("async");
const traverse = require("traverse");
const querystring = require('node:querystring');
const needle = require('needle');


var TRANSERR = {
  NOT_TRANSLATED: 1,
  IS_URL: 2
};




// RUN
var run = function (apiKey, dir, sourceLanguage, languages, includeHtml, missingOnly, cleanUp, spaces, finish) {
  //var ggl = google(apiKey);
  /**
   * @param callback (error: any | null, translation: string | null) => void;
   */
  const googleTranslate = function(text, sourceLanguage, targetLanguage, callback) {
      const url = 'https://translation.googleapis.com/language/translate/v2?' +
        querystring.stringify({key: apiKey, q: [text, 'zusätzliche Übersetzung'], source: sourceLanguage, target: targetLanguage});
        needle.get(url, (error, response) => {
          if (error) {
            callback(error, null);
          } else if (response.statusCode >= 400) {
            callback(new Error('Google translate failed with http-status-code ' + response.statusCode), null);
          } else {
            //Response-body: {"data":{"translations":[{"translatedText":"my-translated-text!"}]}}
            const translations = response.body?.data?.translations;
            if (Array.isArray(translations) && translations.length > 0) {
              callback(null, translations[0].translatedText);
            } else {
              callback(null, '');
            }
          }
        });
  }

  /**
   * Loads existing translations from files
   * @param languages
   * @param callback Fired after last language was loaded and mapped. Type: (error:{file:string, error: ? },translations: {[language: string]: traverse }) => void;
   * @param translations Optional. Type: {[language: string]: traverse }
   * @private
   */
  var loadTargetTranslations = function (languages, missingOnly, callback, fileExtension, translations, index) {
    fileExtension = fileExtension || '.json';
    translations = translations || {};
    index = index || 0;

    if (!missingOnly || index >= languages.length) {
      callback(null, translations);
      return;
    }
    const lang = languages[index];
    const file = dir + lang + fileExtension;
    fs.readFile(file, (error, data) => {
      if (error) {
        //file not found
      } else {
        const strData = data.toString();
        let transData;
        try {
          transData = JSON.parse(strData);
          translations[lang] = traverse(transData);
        } catch (error) {
          callback({
            "file": file,
            "error": error
          }, null);
          return;
        }
      }
      loadTargetTranslations(languages, true, callback, fileExtension, translations, ++index);
    });
  }


  // TRANSLATE
  var translate = function (text, language, currentTranslation, missingOnly, callback) {
    if (missingOnly && currentTranslation) {
      return callback(null, currentTranslation);
    }


    // passthrough if contains HTML
    if (!includeHtml && /<[a-z][\s\S]*>/i.test(text) == true) {
      return callback(TRANSERR.NOT_TRANSLATED, text);
    }

    // it is just a url
    if (text.indexOf("http://") == 0 && text.indexOf(" ") < 0) {
      return callback(TRANSERR.IS_URL, text);
    }

    if (apiKey) {

      // fire the google translation
      googleTranslate(text, sourceLanguage, language, function (err, translation) {

        if (err) {
          return callback(TRANSERR.NOT_TRANSLATED, text);
        }

        // return the translated text
        return callback(null, translation);
      });
    } else {

      // bypass translation
      return callback(null, text);
    }
  };

  var cleanUpTargets = function (source, targets, languages, callback) {
    if (!cleanUp) {
      return callback();
    }

    languages.forEach(function (lang) {
      targets[lang].forEach(function() {
        if (!source.has(this.path)) {
          this.delete();
        }
      });
    });
    callback();
  }

  // PROCESS FILE
  var processFile = function (file, callback) {

    // open file
    fs.readFile(dir + file, function (err, data) {

      // bubble up error
      if (err) {
        return callback({
          "file": file,
          "error": err
        }, null);
      }

      data = data.toString();

      var parsed;
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        return callback({
          "file": file,
          "error": e
        }, null);
      }

      var traversed = traverse(parsed);

      loadTargetTranslations(languages, missingOnly, function (err, targets) {
        if (err) {
          return callback(err);
        }

        for (var l in languages) {
          const lang = languages[l];
          //Do not change the behaviour in case `missingOnly` is not set
          if (!missingOnly || !targets[lang]) {
            targets[lang] = traverse({});
          }
        }

        // find all paths of the object keys recursively
        var paths = traversed.paths();

        // translate each path
        async.map(paths, function (path, done) {

              var text = traversed.get(path);

              // only continue for strings
              if (typeof (text) !== "string") {
                return done(null);
              }

              // translate every language for this path
              async.map(languages, function (language, translated) {

                // translate the text
                translate(text, language, targets[language].get(path), missingOnly, function (err, translation) {
                  const targetLang = targets[language];
                  if (!err) {
                    targetLang.set(path, translation);
                  } else {
                    targetLang.set(path, '');
                  }


                  var e = null;
                  if (err === TRANSERR.NOT_TRANSLATED) {
                    e = {
                      "file": file,
                      "path": path,
                      "text": text,
                      "source": sourceLanguage,
                      "target": language
                    };
                  }

                  return translated(null, e);
                });

                // all languages have been translated for this path,
                // so call the done callback of the map through all paths
              }, done);
            }, (err, results) => cleanUpTargets(traversed, targets, languages,
                // all are translated
                function () {

                  // write translated targets to files
                  for (var t in targets) {
                    var transStr = JSON.stringify(targets[t].value, null, spaces || "\t");

                    var p = dir + t + ".json";
                    fs.writeFileSync(p, transStr);

                    // add language to source file
                    parsed[t] = true;
                  }

                  // filter out null results, to just return the not translated ones
                  notTranslated = results.filter(function (item) {

                    // check if array only contains nulls
                    for (var i in item) {
                      if (item[i] != null) {
                        return true;
                      }
                    }

                    return false;
                  });

                  // spice up error message
                  if (err) {
                    err = {
                      "file": file,
                      "error": err
                    };
                  }

                  return callback(err, notTranslated);
                })
        );


      });
    });
  };

  // process the source file
  processFile(sourceLanguage + '.json', finish);

};

// EXPORTS
module.exports = {
  "run": run
}
