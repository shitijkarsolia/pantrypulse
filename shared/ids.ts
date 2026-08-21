export function newId(prefix: string, now = Date.now()): string {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return prefix + '_' + now.toString(36) + '_' + random[0].toString(36) + random[1].toString(36);
}
