const narrow = new Set(" .,;:!|ijlI1'`");
const wide = new Set("MW@%ĄĆĘŁŃÓŚŹŻąćęłńóśźż");

export function estimateTextWidth(value, fontSize) {
  return [...value].reduce((width, character) => width + fontSize * (narrow.has(character) ? 0.3 : wide.has(character) ? 0.82 : 0.56), 0);
}

export function wrapLineCount(value, fontSize, maxWidth) {
  const words = value.split(/\s+/);
  let lines = 1;
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && estimateTextWidth(candidate, fontSize) > maxWidth) {
      lines += 1;
      line = word;
    } else {
      line = candidate;
    }
  }
  return lines;
}

export function resolveTextSources(source, {dictionaries, catalog, setupOptions}) {
  const [kind, key] = source.split(":");
  if (kind === "copy") return Object.values(dictionaries).map(dictionary => dictionary[key]);
  if (kind === "station" && key === "name") return catalog.stations.map(station => station.name);
  if (kind === "city" && key === "value") return setupOptions.cities;
  if (kind === "speaker" && key === "value") return setupOptions.speakers;
  if (kind === "literal") return [key];
  return [];
}

export function auditTextSlots(definition, sources) {
  const failures = [];
  let checks = 0;
  for (const slot of definition.slots) {
    const values = [...new Set(slot.sources.flatMap(source => resolveTextSources(source, sources)).filter(Boolean))];
    for (const value of values) {
      checks += 1;
      if (slot.mode === "wrapped") {
        const lines = wrapLineCount(value, slot.fontSize, slot.maxWidth);
        if (lines > slot.maxLines) failures.push({slot: slot.id, value, lines, limit: slot.maxLines});
      } else {
        const width = estimateTextWidth(value, slot.fontSize);
        const scale = Math.min(1, slot.maxWidth / width);
        if (scale < slot.minimumScale) failures.push({slot: slot.id, value, scale: Number(scale.toFixed(3)), limit: slot.minimumScale});
      }
    }
  }
  return {valid: failures.length === 0, checks, failures};
}
