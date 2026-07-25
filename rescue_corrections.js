import fs from "fs";
import path from "path";

const output_folder = "output";
const output_path = path.join(process.cwd(), `/${output_folder}/`);
const corrections_path = path.join(output_path, "corrections.txt");

const raw = fs.readFileSync(corrections_path, "utf8").split("\n").filter(l => l.trim() !== "");

const upgraded = raw.map(line => {
    const parts = line.split(" || ");
    if (parts.length == 2) {
        const typo = parts[0].trim(); const url = parts[1].trim(); let correction = "HI_pls_FIX_this_MANUALLY";
        
        // auto-extract from wiktionary (i use wikitionary as links for the corrected words so this makes life easier for me)
        if (url.includes("wiktionary.org/wiki/")) {correction = decodeURIComponent(url.split("/wiki/").pop().replace(/_/g, " "));}
        return `${typo} || ${url} || ${correction}`;
    }
    return line; // leave it alone if it"s already fixed
});

fs.writeFileSync(corrections_path, upgraded.join("\n"));
console.log("successfully rescued corrections.txt!");