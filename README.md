# forginese-typo-finder
`1-`**`extract`**`.js` messsages,<br/>
`2-`**`cspell `**`.js` to find typos,<br/>
`3-`**`review `**`.js` typos to add corrections,<br/>
`4-`**`build  `**`.js` the json,<br/>
and fetch `5-`**`definitions`**`.js`

...and import ~~`definitions.json`~~ `final.json` to [forginese/**tts-kokoro-js**](https://github.com/forginese/tts-kokoro-js)<br/>
...and import everything to [forginese/**website**](https://github.com/forginese/website)

<br/>
<p align="center">
	this was made for the
	<br/>
	<a href="https://github.com/forginese"><img width="454" height="124" alt="with_wordmark" src="https://github.com/user-attachments/assets/1cecd7a6-0ea6-4cdc-8d46-19fe18795446" /></a></p>
<br/>

## what it do?
| script | description |
| :----- | :---------- |
| **`1-extract.js`**          | this script extracts messages from json files from the `src` folder and message contents are dumped into `message.txt`. |
| **`2-cspell.js`**           | this script uses cspell to find typos from `message.txt` and issues (typos) are dumped into `typos.txt`, `excluded-words.txt` and `special-words.txt` are dictionaries linked to cspell, and can control the output of the script. |
| **`3-review.js`**           | this script starts the typo reviewer, where the user goes through each typo to:<br/><br/><ul><li>add a `dictionary_url` and add a correction</li><li>add no `dictionary_url` but add a correction</li><li>add the typo to `excluded-words.txt`</li><li>skip for a later session</li></ul>progress from the typo reviewer will be saved to `corrections.txt`. |
| **`4-build.js`**            | this script builds `final.json` and `source.txt` using data from the previously created files and will output both files to the `output` folder. |
| **`5-definitions.js`**      | this script builds `definitions.json` using data `final.json` and `custom_definitions.json`. it pulls corrections from `final.json` and fetches definitions and phonetics from `definitions_source`, automatically applying custom definition overrides from `custom_definitions.json` for any matching words. |
| `rescue_corrections.js`     | this script was used during the time where `corrections.txt` (formerly `dictlinks.txt`) had only two columns `(typo \|\| url)` instead of three `(typo \|\| url \|\| correction)`.<br>this script would have converted the `corrections.txt` from 2 columns to 3 columns, automatically assuming the correction from the 2nd column / `dictionary_url`. |
> [!CAUTION]
> i do not reccomend using `rescue_corrections.js` unless somehow your `corrections.txt` file came out as 2 `(typo || url)` columns instead of 3 columns `(typo || url || correction)`.
>
> **`3-review.js`** automatically builds the `corrections.txt` file as 3 columns so `rescue_corrections.js` is functionally obsolete now...;-;

## get started
#### prerequisites
- [node.js](nodejs.org) installed
- your [Discrub](https://github.com/pratherbytecraft/discrub) JSON exports
- basic knowledge of [node.js](nodejs.org) and [npm](npmjs.com)... *pls i do a bad job of explaining these steps*
#### install
1. clone the repository
2. `npm install` or `npm i` to install dependencies
3. make the `src` folder (make sure it matches `config.folders.src`)
4. bring your [Discrub](https://github.com/pratherbytecraft/discrub) JSON exports to the `src` folder
#### usage
5. start running each step (scripts).
> [!NOTE]
> if these examples don't reflect what you want to do, check [`package.json`](package.json) -> `"scripts": {...` or go to [this section](#scripts) to know what script you should run
- for example, <mark>i want to run step 1 to 4</mark>, i would run ***ONE*** of these commands as they do the same thing
```bash
npm run 1-4
npm run 1 && npm run 2 && npm run 3 && npm run 4
npm run extract:messages && npm run build:cspell && npm run review:typo && npm run build:final
node 1-extract.js && node 2-cspell.js && node 3-review.js && node 4-build.js
```
- for example, <mark>i want to only run step 5</mark>, i would run ***ONE*** of these commands as they do the same thing
```bash
npm run 5
npm run fetch:definitions
node 5-definitions.js
```
- for example, <mark>i want to run all steps</mark>, i would run ***ONE*** of these commands as they do the same thing
```bash
npm run all
npm run 1 && npm run 2 && npm run 3 && npm run 4 && npm run 5
npm run extract:messages && npm run build:cspell && npm run review:typo && npm run build:final && npm run fetch:definitions
node 1-extract.js && node 2-cspell.js && node 3-review.js && node 4-build.js && node 5-definitions.js
```
### scripts
this is every script you can run ^_^<br/>
> [!NOTE]
> ignore `"test"` pls
```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1",

  "extract:messages": "node 1-extract.js",
  "build:cspell": "node 2-cspell.js",
  "review:typo": "node 3-review.js",
  "build:final": "node 4-build.js",
  "fetch:definitions": "node 5-definitions.js",

  "1": "node 1-extract.js",

  "1-2": "node 1-extract.js && node 2-cspell.js",
    "2":                      "node 2-cspell.js",
    "2-3":                    "node 2-cspell.js && node 3-review.js",
    "2-4":                    "node 2-cspell.js && node 3-review.js && node 4-build.js",

  "1-3": "node 1-extract.js && node 2-cspell.js && node 3-review.js",
  "2-3":                      "node 2-cspell.js && node 3-review.js",
    "3":                                          "node 3-review.js",
    "3-4":                                        "node 3-review.js && node 4-build.js",

  "1-4": "node 1-extract.js && node 2-cspell.js && node 3-review.js && node 4-build.js",
  "2-4":                      "node 2-cspell.js && node 3-review.js && node 4-build.js",
  "3-4":                                          "node 3-review.js && node 4-build.js",
    "4":                                                              "node 4-build.js",

  "5": "node 5-definitions.js",

  "all": "node 1-extract.js && node 2-cspell.js && node 3-review.js && node 4-build.js && node 5-definitions.js"
}
```

# files
## folder layout
#### dictionaries `(hardcoded)`
  - excluded-words.txt `(hardcoded)`
    - *(created by `3-review.js` or manually by **YOU**.)*
  - special-words.txt `(hardcoded)`
    - *(created manually by **YOU**.)*
#### src `(config.folders.src)`
  - This is where your Discrub JSON exports go!
#### base `(config.folders.base)`
  - messages.txt `(config.filenames.extracted_msgs_txt)`
    - *(created by `1-extract.js`)*
  - typos.txt `(config.filenames.typos_txt)`
    - *(created by `2-cspell.js`)*
  - corrections.txt `(config.filenames.corrections_txt)`
    - *(created by `3-review.js`)*
  - custom_definitions.json `(config.filenames.custom_definitions_json)`
    - *(created manually by **YOU**.)*
#### output `(config.folders.output)`
  - final.json `(config.filenames.final_json)`
    - *(created by `4-build.js`)*
  - source.txt `(config.filenames.source_txt)`
    - *(created by `4-build.js`)*
  - definitions.json `(config.filenames.definitions_json)`
    - *(created by `5-definitions.js`)*

## config.json
### layout & defaults
```json
{
	"folders": {
		"src": "src",
		"base": "base",
		"output": "output"
	},
	"filenames": {
		"final_json": "final.json", "source_txt": "source.txt",
		"definitions_json": "definitions.json", "custom_definitions_json": "custom_definitions.json",
		"corrections_txt": "corrections.txt", "typos_txt": "typos.txt",
		"extracted_msgs_txt": "messages.txt"
	},
	"case_handling": "insensitive",
	"definition_fetch_delay": 650,
	"definition_hiccup_delay": 2000,
	"definition_retryafter_fallback": 2000,
	"definition_fetch_retries": 3,
	"definition_source": "wiktionary",
	"definition_has_phonetic": true,
	"datamuse_ipa": true,

	"1_dry_run": false,
	"2_dry_run": false,
	"3_dry_run": false,
	"4_dry_run": false,
	"5_dry_run": false
}
```
### what each option do?
| option | description |
| :----- | :---------- |
| **`typos_case_handling`**            | controls how typo cases are handled in `4-build.js`<br/><br/>**options\:**<br/><ul><li>`"sensitive"` - no typos are merged based on the cases *(untested)*</li><li>`"insensitive"` (default) - typos are merged with the same letters but the cases of the first typo encountered will be preserved</li><li>`"lowercase"` - typos are merged by making everything lowercase (this was how the previous case_insensitive used to work) *(untested)*</li><li>`"uppercase"` - typos are merged by making everything UPPERCASE *(untested)*</li></ul> |
| **`definition_fetch_delay`**         | controls the **delay** between fetching definitions. |
| **`definition_hiccup_delay`**        | controls the **delay** after getting a 5xx status code from the response. |
| **`definition_retryafter_fallback`** | controls the **fallback** delay if the "Retry-After" header is missing. |
| **`definition_fetch_retries`**       | controls how many times it will retry a fetch if it gets an error. |
| **`definition_source`**              | controls where to get definitions (does not change phonetic source)<br/><br/>**options\:**<br/><ul><li>`"wiktionary"` (default)</li><li>`"datamuse"`</li></ul> |
| **`definition_has_phonetic`**        | controls if the phonetic field should exist within `definitions.json`<br/><br/><blockquote>this option was created following the decision to make [forginese/**tts-kokoro-js**](https://github.com/forginese/tts-kokoro-js) pass in words instead of phonetics. i'm still indecisive whether or not i should exclude phonetics from `definitions.json`</blockquote> |
| **`datamuse_ipa`**                   | controls if datamuse phonetic fetches should fetch ipa or arpabet |
| **`1_dry_run`**<br/>**`2_dry_run`**<br/>**`3_dry_run`**<br/>**`4_dry_run`**<br/>**`5_dry_run`** | mostly *untested* but this option prevents the scripts to write files and fetching definitions are completely skipped and is "simulated". each number corresponds to a script, so `1_dry_run` would only make `1-extract.js` dry run.<br/><br/><blockquote>`rescure_corrections.js` also implements the dry run option. it only needs any one of the 5 dry run options to be true</blockquote> |

> [!WARNING]
> setting `definition_source` to `"datamuse"` may cause problems by not using the intended definition you may want.
> 
> in my case, when `definition_source` had `"datamuse"` as the default, some words started outputting stuff about british media which wasn't the definition i was looking for. *no offsense to british people...* **（｡>﹏<。）**

## final.json layout
```json
{
	"messages": {
		"msg_{id}": {
            "msg_id": "msg_{id}",
            "timestamp": "{timestamp}",
            "content": "{content}"
        }
	},
	"corrections": [
		{
            "word": "{correction}",
            "slug": "generate_slug({correction})",
            "dictionary_url": "{dictionary_url}",
            "typos": [
                "typo"
            ]
        }
	],
	"typos": [
		{
            "word": "{typo}",
            "slug": "generate_slug({typo})",
            "correction": {
                "word": "{correction}",
                "slug": "generate_slug({correction})",
                "dictionary_url": "{dictionary_url}",
                "typos": [
                    "typo"
                ]
            },
            "details": {
                "is_special": false,
                "occurrences": [
                    {
                        "msg_id": "msg_{id}",
                        "timestamp": "{timestamp}"
                    }
                ]
            }
        }
	]
}
```
> [!NOTE]
> `corrections: [{...}]` and `typos: [{...}]` are arrays rather than an object like `messages: {"...": {...}}` is because those two arrays were designed to be looped through by the [eleventy website](https://github.com/forginese/website).

## definitions.json layout
```json
{
    "{correction}": {
        "word": "{correction}",
        "phonetic": "/{phonetic}/",
        "meanings": [
            {
                "parts_of_speech": "{parts_of_speech}",
                "definitions": [
                    "{definition}"
                ]
            }
        ]
    }
}
```
> [!NOTE]
> this layout does not change even if you change the `definition_source`! ^_^ do not worry...
