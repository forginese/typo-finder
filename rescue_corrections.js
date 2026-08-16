import fs from "fs";
import path from "path";

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

// # NOTE:
// this was used during the time where corrections.txt (formerly dictlinks.txt) had only two columns (typo || url) instead of three (typo || url || correction)

const base_path = path.join(process.cwd(), `/${config.folders.base}/`);
const corrections_path = path.join(base_path, config.filenames.corrections_txt);

const raw = fs.readFileSync(corrections_path, "utf8").split("\n").filter(l => l.trim() !== "");

const upgraded = raw.map(line => {
    const parts = line.split(" || ");
    if (parts.length == 2) {
        const typo = parts[0].trim(); const url = parts[1].trim(); let correction = "HI_pls_FIX_this_MANUALLY";
        
        // auto-extract from wiktionary (i use wiktionary as links for the corrected words so this makes life easier for me)
        if (url.includes("wiktionary.org/wiki/")) {correction = decodeURIComponent(url.split("/wiki/").pop().replace(/_/g, " "));}
        return `${typo} || ${url} || ${correction}`;
    }
    return line; // leave it alone if it"s already fixed
});

fs.writeFileSync(corrections_path, upgraded.join("\n"));
console.log("successfully rescued corrections.txt!");