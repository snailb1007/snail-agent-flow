const fs = require('fs');

/**
 * Parses a simple YAML string into a JavaScript object.
 * Supports basic key-value pairs, nested objects, arrays of scalars,
 * arrays of objects, comments, and multiline strings using '|'.
 * 
 * @param {string} yamlString
 * @returns {any}
 */
function parseYaml(yamlString) {
  if (typeof yamlString !== 'string') {
    throw new TypeError('YAML input must be a string');
  }
  const lines = yamlString.split(/\r?\n/);
  return parseBlock(lines, 0, 0).value;
}

function parseBlock(lines, startIdx, expectedIndent) {
  const resultObj = {};
  const resultArr = [];
  let isArray = false;
  let i = startIdx;

  while (i < lines.length) {
    const rawLine = lines[i];

    // Skip empty lines or comments
    if (rawLine.trim() === '' || rawLine.trim().startsWith('#')) {
      i++;
      continue;
    }

    // Measure indentation
    const indentMatch = rawLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    // If indentation is less than expected, return to parent block
    if (indent < expectedIndent) {
      break;
    }

    const content = rawLine.slice(expectedIndent);

    if (content.startsWith('-')) {
      isArray = true;
      const rest = content.slice(1).trim();

      // If it contains a colon, it's an object list item (e.g. `  - id: decision_discovery`)
      if (rest.includes(':') && !rest.startsWith('"') && !rest.startsWith("'")) {
        const itemLines = [];
        // First key-value of the object item, formatted with indent
        itemLines.push(' '.repeat(expectedIndent + 2) + rest);

        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          if (nextLine.trim() === '' || nextLine.trim().startsWith('#')) {
            itemLines.push(nextLine);
            j++;
            continue;
          }
          const nextIndentMatch = nextLine.match(/^(\s*)/);
          const nextIndent = nextIndentMatch ? nextIndentMatch[1].length : 0;
          if (nextIndent <= expectedIndent) {
            break; // Stop at next list item or sibling block
          }
          itemLines.push(nextLine);
          j++;
        }

        const parsedItem = parseBlock(itemLines, 0, expectedIndent + 2);
        resultArr.push(parsedItem.value);
        i = j;
      } else {
        // Scalar list item (e.g. `  - "## Decisions"`)
        resultArr.push(parseScalarValue(rest));
        i++;
      }
    } else {
      // Key-value pair
      const colonIdx = content.indexOf(':');
      if (colonIdx === -1) {
        throw new Error(`Invalid YAML format at line ${i + 1}: "${rawLine}"`);
      }
      const key = content.slice(0, colonIdx).trim();
      const valStr = content.slice(colonIdx + 1).trim();

      if (valStr === '') {
        // Nested block: grab subsequent lines with strictly greater indentation
        const subLines = [];
        let j = i + 1;
        let subIndent = -1;
        while (j < lines.length) {
          const nextLine = lines[j];
          if (nextLine.trim() === '' || nextLine.trim().startsWith('#')) {
            subLines.push(nextLine);
            j++;
            continue;
          }
          const nextIndentMatch = nextLine.match(/^(\s*)/);
          const nextIndent = nextIndentMatch ? nextIndentMatch[1].length : 0;
          if (nextIndent <= expectedIndent) {
            break; // Sibling or parent block
          }
          if (subIndent === -1) {
            subIndent = nextIndent;
          }
          subLines.push(nextLine);
          j++;
        }

        const parsedSub = parseBlock(subLines, 0, subIndent === -1 ? expectedIndent + 2 : subIndent);
        resultObj[key] = parsedSub.value;
        i = j;
      } else if (valStr.startsWith('|')) {
        // Multiline string
        const { val, nextIdx } = parseMultilineString(lines, i + 1, expectedIndent + 2);
        resultObj[key] = val;
        i = nextIdx;
      } else {
        resultObj[key] = parseScalarValue(valStr);
        i++;
      }
    }
  }

  return { value: isArray ? resultArr : resultObj, nextIdx: i };
}

function parseScalarValue(valStr) {
  valStr = valStr.trim();

  // Remove wrapping double or single quotes
  if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
    return valStr.slice(1, -1);
  }

  if (valStr === 'true') return true;
  if (valStr === 'false') return false;
  if (valStr === 'null') return null;

  if (valStr !== '' && !isNaN(valStr)) {
    return Number(valStr);
  }

  return valStr;
}

function parseMultilineString(lines, startIdx, baseIndent) {
  let val = '';
  let i = startIdx;
  while (i < lines.length) {
    const rawLine = lines[i];
    if (rawLine.trim() === '') {
      val += '\n';
      i++;
      continue;
    }
    const indentMatch = rawLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    if (indent < baseIndent) {
      break;
    }
    val += rawLine.slice(baseIndent) + '\n';
    i++;
  }
  if (val.endsWith('\n')) {
    val = val.slice(0, -1);
  }
  return { val, nextIdx: i };
}

module.exports = {
  parseYaml
};
