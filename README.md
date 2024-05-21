# i18n-translate-json

Automatically translates node-i18n JSON files into different languages via Google Translate API.

## Installation

**Global**:
```
npm install -g @somsoft/i18n-translate-json
```
**Project (Development only)**:
```
npm install --save-dev @somsoft/i18n-translate-json
```

## Usage

You need a [Google Translate API Key](https://cloud.google.com/translate/).

```
i18n-translate-json apiKey dir sourceLang (targetLang1,targetLang2,..) [--options]
```

e.g.

```
i18n-translate-json iuOHAEbo9H788d34h93h4diouehIUHI locale/ en es,fr --missingOnly --cleanUp --spaces 2
```

This would translate all strings in `locale/en.json` (relative to current folder in the shell) from English to Spanish and French, based on the Google Translate API language codes.

The target languages list is optional. When not present, it will be translated to all languages supported by Google Translate.

### Options


| Option          | Description                                                           |
|-----------------|-----------------------------------------------------------------------|
| includeHtml     | Include HTML entries in the translation                               |
| missingOnly     | If set, do not overwrite existing translation                         | 
| cleanUp         | If set, removes unused translations at target files.                  | 
| spaces [number] | Number of spaces in output-json. If option is omitted, tabs are used. | 
| help            | Show help                                                             |


## Publish npm
Run `npm run publish:<major|minor|patch>` to publish a new major, minor or patch version to npm.



## Credits

Based on [i18n-translate](https://github.com/thomasbrueggemann/i18n-translate) by Thomas Brüggemann.
Based on [i18n-translate-json](https://github.com/meedan/i18n-translate-json) by  [Meedan](http://meedan.com).

