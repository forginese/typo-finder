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
	case_insensitive: true,
	definition_fetch_delay: 650,
	definition_hiccup_delay: 2000,
	definition_retryafter_fallback: 2000,
	definition_fetch_retries: 3,
	definition_source: "wiktionary", // options: default = "wiktionary" and "datamuse"
	datamuse_ipa: true
}
if (fs.existsSync(config_path)) config = {...config, ...JSON.parse(fs.readFileSync(config_path, "utf8"))};
config.definition_source = config.definition_source === "datamuse" ? config.definition_source : "wiktionary";

const base_path = path.join(process.cwd(), `/${config.folders.base}/`);
if (!fs.existsSync(base_path)) {fs.mkdirSync(base_path);}

const messages_path = path.join(base_path, config.filenames.extracted_msgs_txt);
const typos_path = path.join(base_path, config.filenames.typos_txt);

if (!fs.existsSync(messages_path)) {console.log(`could not find ${messages_path}! did'ya you run 1-extract.js first?`); process.exit(1);}
if (!fs.existsSync(typos_path)) {console.log(`could not find ${typos_path}! a blank file will be created in place for it.\n`); fs.writeFileSync(typos_path, "");}
console.log(`# running npx cspell "${messages_path}" --words-only --unique --no-exit-code > "${typos_path}"\n`);

try {
	console.log(execSync(`npx cspell "${messages_path}" --words-only --unique --no-exit-code > "${typos_path}"`).toString());
} catch (error) {console.error(error);}
console.log(`# you should be able to move on to running 3-review.js\n`);