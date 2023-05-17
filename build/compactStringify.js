const NONE = 0;
const ARRAY = 1;
const OBJECT = 2;

function compactLength(data, visited = new Map(), path = '$') {
  const type = typeof data;

  if (data === undefined || data === null) {
    return 4; // "null"
  } else if (type === 'string' || type === 'number' || type === 'boolean') {
    return JSON.stringify(data).length;
  } else if (Array.isArray(data)) {
    if (visited.has(data)) {
      throw new Error(`Circular reference: ${path} -> ${visited.get(data)}`);
    }
    visited.set(data, path);

    if (data.length === 0) return 2; // "[]"
    let length = 4; // "[ " + "]"
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      length += compactLength(v, visited, `${path}[${i}]`);
      length += 2; // ", "
    }

    length -= 2; // trailing ", "

    return length;
  } else {
    if (visited.has(data)) {
      throw new Error(`Circular reference: ${path} -> ${visited.get(data)}`);
    }
    visited.set(data, path);

    const entries = Object.entries(data);
    if (entries.length === 0) return 2; // "{}"
    let length = 4; // "{ " + " }"

    for (const [k, v] of entries) {
      length += compactLength(k, visited);
      length += 2; // ": "
      length += compactLength(v, visited, `${path}.${k}`);
      length += 2; // ", "
    }

    length -= 2; // trailing ", "

    return length;
  }
}

function _stringify(data, indent, indentChars, maxLineLength, replacer) {
  if (data === undefined) return;

  const type = typeof data;
  const nextIndent = indent + indentChars;

  if (data === undefined || data === null) {
    return 'null';
  } else if (type === 'string' || type === 'number' || type === 'boolean') {
    return JSON.stringify(data);
  } else if (Array.isArray(data)) {
    if (data.length === 0) return '[]';

    const isCompact = indent.length + compactLength(data) < maxLineLength;

    let s = isCompact ? '[ ' : `[`;
    let lineLen = 99999;
    for (let i = 0; i < data.length; i++) {
      let value = data[i];
      if (replacer) value = replacer(String(i), value);
      if (value === undefined) continue;

      if (isCompact) {
        if (i > 0) s += ', ';
        s += _stringify(
          value,
          nextIndent,
          indentChars,
          maxLineLength,
          replacer
        );
      } else {
        if (i > 0) {
          s += lineLen < maxLineLength ? ', ' : ',';
        }
        if (lineLen > maxLineLength) {
          s += `\n${nextIndent}`;
          lineLen = nextIndent.length;
        }

        const sval = _stringify(
          value,
          nextIndent,
          indentChars,
          maxLineLength,
          replacer
        );
        s += sval;
        lineLen += sval.length;
      }
    }

    s += isCompact ? ' ]' : `\n${' '.repeat(indent)}]`;

    return s;
  } else {
    const entries = Object.entries(data);
    if (entries.length === 0) return '{}}';

    const isCompact = indent.length + compactLength(data) < maxLineLength;

    let s = isCompact ? '{ ' : `{`;
    let isFirst = true;
    for (let i = 0; i < entries.length; i++) {
      let [key, value] = entries[i];
      if (replacer) value = replacer(key, value);
      if (value === undefined) continue;

      const skey = _stringify(
        key,
        nextIndent,
        indentChars,
        maxLineLength,
        replacer
      );
      const sval = _stringify(
        value,
        nextIndent,
        indentChars,
        maxLineLength,
        replacer
      );

      if (isCompact) {
        if (i > 0) s += ', ';
        s += `${skey}: ${sval}`;
      } else {
        if (i > 0) {
          s += ',';
        }
        s += `\n${nextIndent}`;

        s += `${skey}: ${sval}`;
      }

      isFirst = false;
    }

    s += isCompact ? ' }' : `\n${indent}}`;

    return s;
  }
}

export default function (data, options = {}) {
  const { indentChars = '  ', maxLineLength = 80, replacer } = options;

  if (replacer) data = replacer('', data);

  return _stringify(data, '', indentChars, maxLineLength, replacer);
}
