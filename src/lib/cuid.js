let cuidCounter = 0;

function getRandomChunk() {
  const randomValues = new Uint8Array(6);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues, (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
}

export function createCuid(prefix = 'item') {
  cuidCounter = (cuidCounter + 1) % 1679616;

  return `${prefix}_${Date.now().toString(36)}_${cuidCounter
    .toString(36)
    .padStart(4, '0')}_${getRandomChunk()}`;
}
