console.log("### 2-cspell.js");

import fs from "fs";
import path from "path";
import {execSync} from "child_process";

const config_path = path.join(process.cwd(), "config.json");
let config = {
	folders: {src: "src", base: "base", output: "output"},
	filenames: {
		final_json: "final.json", source_txt: "source.txt",
		definitions_json: "definitions.json", custom_definitions_json: "custom_definitions.json",
		corrections_txt: "corrections.txt", typos_txt: "typos.txt",
		extracted_msgs_txt: "messages.txt"
	},
	typos_case_handling: "insensitive", // options: default = "insensitive", ["insensitive", "sensitive", "lowercase", "uppercase"]
	definition_fetch_delay: 650,
	definition_hiccup_delay: 2000,
	definition_retryafter_fallback: 2000,
	definition_fetch_retries: 3,
	definition_source: "wiktionary", // options: default = "wiktionary", ["wiktionary", "datamuse"]
	definition_has_phonetic: true,
	wiktionary_disable_html_filter: true,
	wiktionary_disable_html_sanitization: false, // if wiktionary_disable_html_filter is true, this is hardcodedly disabled
	wiktionary_keep_anchors: false,
	datamuse_ipa: true,

	"1_dry_run": false,
	"2_dry_run": false,
	"3_dry_run": false,
	"4_dry_run": false,
	"5_dry_run": false
}
if (fs.existsSync(config_path)) config = {...config, ...JSON.parse(fs.readFileSync(config_path, "utf8"))};
const valid_case_handling = ["sensitive", "insensitive", "lowercase", "uppercase"];
config.typos_case_handling = valid_case_handling.includes(config.typos_case_handling) ? config.typos_case_handling : "insensitive";
config.definition_source = config.definition_source === "datamuse" ? config.definition_source : "wiktionary";
config.dry_run = config["2_dry_run"] === true;

const base_path = path.join(process.cwd(), `/${config.folders.base}/`);
if (!fs.existsSync(base_path)) {fs.mkdirSync(base_path);}

const messages_path = path.join(base_path, config.filenames.extracted_msgs_txt);
const typos_path = path.join(base_path, config.filenames.typos_txt);

if (!fs.existsSync(messages_path)) {console.log(`could not find ${messages_path}! did'ya you run 1-extract.js first?`); process.exit(1);}
if (!fs.existsSync(typos_path)) {console.log(`could not find ${typos_path}! a blank file will be created in place for it.\n`); fs.writeFileSync(typos_path, "");}
const cspell_command = `npx cspell "${messages_path}" --words-only --unique --no-exit-code > "${typos_path}"`;
console.log(`# running ${cspell_command}\n`);
if (config.dry_run) {console.log(`# you should be able to move on to running 3-review.js\n`); process.exit(0);}

try {
	console.log(execSync(cspell_command).toString());
} catch (error) {console.error(error);}
console.log(`# you should be able to move on to running 3-review.js\n`);