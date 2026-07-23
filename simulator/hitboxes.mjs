function expand(template, value, index) {
  if (typeof template === "string") {
    if (template === "{index}") return index;
    if (template === "{event}") return value.event;
    return template.replaceAll("{index}", String(index)).replaceAll("{value}", value.value ?? "").replaceAll("{name}", value.name ?? "").replaceAll("{label}", value.label ?? "");
  }
  if (Array.isArray(template)) return template.map(item => expand(item, value, index));
  if (template && typeof template === "object") return Object.fromEntries(Object.entries(template).map(([key, item]) => [key, expand(item, value, index)]));
  return template;
}

function include(item, snapshot) {
  return !item.when || Boolean(snapshot[item.when]);
}

export function resolveHitboxes(definition, snapshot, sources) {
  const boxes = [];
  for (const item of definition.screens[snapshot.screen] || []) {
    if (!include(item, snapshot)) continue;
    if (!item.repeat) {
      const [x, y, width, height] = item.rect;
      boxes.push({id: item.id, x, y, width, height, event: item.event, label: item.labelKey ? snapshot.copy[item.labelKey] : item.label || item.id});
      continue;
    }
    const values = sources[item.repeat] || [];
    values.forEach((value, index) => {
      const column = index % item.columns;
      const row = Math.floor(index / item.columns);
      const [offsetX, offsetY, width, height] = item.rect;
      const x = item.origin[0] + column * item.cell[0] + offsetX;
      const y = item.origin[1] + row * item.cell[1] + offsetY;
      boxes.push({
        id: expand(item.id, value, index), x, y, width, height,
        event: expand(item.event, value, index),
        label: item.labelKey ? snapshot.copy[item.labelKey] : expand(item.label || item.id, value, index)
      });
    });
  }
  return boxes;
}

export function hitTest(boxes, x, y) {
  return [...boxes].reverse().find(box => x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height) || null;
}
