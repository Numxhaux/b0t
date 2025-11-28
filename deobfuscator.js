import fs from 'fs/promises';

// Moonsec V3 Deobfuscator
class MoonsecV3Deobfuscator {
  constructor(code) {
    this.code = code;
    this.deobfuscated = '';
    this.stringTable = [];
    this.variableMap = new Map();
  }

  async deobfuscate() {
    console.log("Starting deobfuscation process...");
    
    try {
      // Step 1: Remove comments and normalize whitespace
      this.cleanCode();
      
      // Step 2: Extract string table if present
      this.extractStringTable();
      
      // Step 3: Identify and rename obfuscated variables
      this.identifyVariables();
      
      // Step 4: Replace string table references
      this.replaceStringReferences();
      
      // Step 5: Simplify control flow
      this.simplifyControlFlow();
      
      // Step 6: Format the final code
      this.formatCode();
      
      console.log("\nDeobfuscation completed successfully!");
      console.log("\nDeobfuscated code preview (first 500 chars):");
      console.log(this.deobfuscated.substring(0, 500) + "...");
      
      return this.deobfuscated;
    } catch (error) {
      console.error("Error during deobfuscation:", error.message);
      return null;
    }
  }

  cleanCode() {
    console.log("Limpando o código..");
    
    // Remove single line comments
    let cleaned = this.code.replace(/--[^\n]*/g, '');
    
    // Remove multi-line comments
    cleaned = cleaned.replace(/--\[\[[\s\S]*?\]\]/g, '');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    this.code = cleaned;
    console.log("Código Limpado!");
  }

  extractStringTable() {
    console.log("Extraindo string table...");
    
    // Look for common Moonsec string table patterns
    const stringTableRegex = /local\s+([a-zA-Z0-9_]+)\s*=\s*\{(["'][\s\S]*?["'](?:\s*,\s*["'][\s\S]*?["'])*)\}/;
    const match = this.code.match(stringTableRegex);
    
    if (match) {
      const tableName = match[1];
      const tableContent = match[2];
      
      // Extract strings from the table
      const stringMatches = tableContent.match(/["'][\s\S]*?["']/g) || [];
      this.stringTable = stringMatches.map(str => {
        // Remove quotes and unescape
        return str.substring(1, str.length - 1)
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'");
      });
      
      console.log(`Encontrado string table "${tableName}" with ${this.stringTable.length} entries`);
    } else {
      console.log("Nenhuma string table encontrada, ou usando um diferente pattern");
    }
  }

  identifyVariables() {
    console.log("Identificando variaveis obfuscados...");
    
    // Common patterns for obfuscated variable names
    const obfuscatedVarPattern = /([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)$$.*?$$/g;
    let match;
    let counter = 1;
    
    while ((match = obfuscatedVarPattern.exec(this.code)) !== null) {
      const varName = match[1];
      
      // Skip if already mapped
      if (!this.variableMap.has(varName) && this.isLikelyObfuscated(varName)) {
        const readableName = `var_${counter++}`;
        this.variableMap.set(varName, readableName);
      }
    }
    
    console.log(`Identificado ${this.variableMap.size} variaveis obfuscated`);
  }

  isLikelyObfuscated(name) {
    // Check if variable name looks obfuscated (e.g., random characters, unusual patterns)
    if (name.length > 10 && /^[a-zA-Z0-9_]+$/.test(name)) {
      // Check for repeating patterns or high entropy
      const uniqueChars = new Set(name.split('')).size;
      const ratio = uniqueChars / name.length;
      
      // Low ratio of unique chars or very long name suggests obfuscation
      return ratio < 0.5 || name.length > 20;
    }
    return false;
  }

  replaceStringReferences() {
    console.log("Replicando string table referencias...");
    
    if (this.stringTable.length === 0) {
      console.log("Nenhuma string table pra replicar referencias no");
      this.deobfuscated = this.code;
      return;
    }
    
    // Replace string table references like tableName[index] with actual strings
    let processed = this.code;
    const stringRefPattern = /([a-zA-Z0-9_]+)\[(\d+)\]/g;
    
    processed = processed.replace(stringRefPattern, (match, tableName, index) => {
      const idx = parseInt(index, 10);
      if (idx >= 0 && idx < this.stringTable.length) {
        return `"${this.stringTable[idx].replace(/"/g, '\\"')}"`;
      }
      return match;
    });
    
    this.deobfuscated = processed;
  }

  simplifyControlFlow() {
    console.log("Simplicando controle flow...");
    
    // Replace obfuscated variable names with readable ones
    let simplified = this.deobfuscated;
    
    this.variableMap.forEach((readableName, obfuscatedName) => {
      // Use word boundary to avoid partial replacements
      const regex = new RegExp(`\\b${obfuscatedName}\\b`, 'g');
      simplified = simplified.replace(regex, readableName);
    });
    
    // Try to simplify common obfuscation patterns
    // Example: Simplify redundant if statements
    simplified = simplified.replace(/if\s*$$\s*true\s*$$\s*then([\s\S]*?)end/g, '$1');
    
    this.deobfuscated = simplified;
  }

  formatCode() {
    console.log("Formando deobfuscated code...");
    
    // Basic indentation for blocks
    let formatted = this.deobfuscated;
    let indentLevel = 0;
    const lines = formatted.split(/\b(if|then|else|elseif|for|while|function|do|repeat|until|end)\b/).filter(Boolean);
    
    formatted = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'end' || line === 'else' || line === 'elseif' || line === 'until') {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      formatted += '  '.repeat(indentLevel) + line + '\n';
      
      if (line === 'then' || line === 'do' || line === 'function' || line === 'repeat' || 
          line === 'else' || line === 'elseif') {
        indentLevel++;
      }
    }
    
    this.deobfuscated = formatted;
  }
}

// Example usage
async function main() {
  try {
    // You would normally read this from a file
    const obfuscatedCode = `
    -- This is a sample of Moonsec V3 obfuscated code (simplified for demonstration)
    local a={"hello world","print","function","return"}
    local b=function(c,d)local e=a[c]return e end
    local f=function()local g=b(1)local h=b(2)local i=b(3)local j=b(4)
    local k=function()g(b(1))end
    k()end
    f()
    `;
    
    const deobfuscator = new MoonsecV3Deobfuscator(obfuscatedCode);
    const result = await deobfuscator.deobfuscate();
    
    console.log("\nFull deobfuscated code:");
    console.log(result);
    
    // Uncomment to save to file
    // await fs.writeFile('deobfuscated.lua', result);
    // console.log("Saved deobfuscated code to 'deobfuscated.lua'");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
