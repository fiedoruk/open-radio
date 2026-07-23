import {createHash} from "node:crypto";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function writeString(header, offset, length, value) {
  const bytes = Buffer.from(value);
  if (bytes.length > length) throw new Error(`tar field too long: ${value}`);
  bytes.copy(header, offset);
}

function writeOctal(header, offset, length, value) {
  const octal = value.toString(8).padStart(length - 1, "0");
  if (octal.length >= length) throw new Error(`tar number too large: ${value}`);
  writeString(header, offset, length, `${octal}\0`);
}

function splitTarPath(path) {
  if (Buffer.byteLength(path) <= 100) return {name: path, prefix: ""};
  for (let index = path.lastIndexOf("/"); index > 0; index = path.lastIndexOf("/", index - 1)) {
    const prefix = path.slice(0, index);
    const name = path.slice(index + 1);
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) return {name, prefix};
  }
  throw new Error(`tar path too long: ${path}`);
}

function tarHeader(path, size, mode) {
  const header = Buffer.alloc(512);
  const {name, prefix} = splitTarPath(path);
  writeString(header, 0, 100, name);
  writeOctal(header, 100, 8, mode);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header[156] = 0x30;
  writeString(header, 257, 6, "ustar\0");
  writeString(header, 263, 2, "00");
  writeString(header, 265, 32, "root");
  writeString(header, 297, 32, "root");
  writeString(header, 345, 155, prefix);
  const checksum = header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, "0");
  writeString(header, 148, 8, `${checksum}\0 `);
  return header;
}

export function buildDeterministicTar(entries, prefix) {
  const chunks = [];
  const sorted = [...entries].sort((left, right) => left.path.localeCompare(right.path, "en"));
  for (const entry of sorted) {
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const path = `${prefix}/${entry.path}`;
    chunks.push(tarHeader(path, data.length, entry.mode ?? 0o644), data);
    const padding = (512 - (data.length % 512)) % 512;
    if (padding) chunks.push(Buffer.alloc(padding));
  }
  chunks.push(Buffer.alloc(1024));
  return Buffer.concat(chunks);
}
