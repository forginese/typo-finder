console.log("### 2-cspell.js");

import fs from "fs";
import path from "path";
import {execSync} from "child_process";

const config_path = path.join(process.cwd(), "config.json");
let config = {
	folders: {src: "src", base: "base", output: "output"},
	filenames: {
		final_json: "final.json", source_txt: "source.txt",
		corrections_txt: "corrections.txt", typos_txt: "typos.txt",
		extracted_msgs_txt: "messages.txt"
	},
	case_insensitive: true
}

if (fs.existsSync(config_path)) {config = {...config, ...JSON.parse(fs.readFileSync(config_path, "utf8"))};}

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