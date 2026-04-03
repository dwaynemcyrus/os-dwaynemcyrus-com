function formatTimestampPart(value) {
  return String(value).padStart(2, '0');
}

function formatTimestampCuid(date) {
  return [
    date.getFullYear(),
    formatTimestampPart(date.getMonth() + 1),
    formatTimestampPart(date.getDate()),
    formatTimestampPart(date.getHours()),
    formatTimestampPart(date.getMinutes()),
    formatTimestampPart(date.getSeconds()),
  ].join('');
}

function formatCollisionSuffix(collisionIndex) {
  return String(collisionIndex).padStart(2, '0');
}

export function createCuid(date = new Date(), collisionIndex = 0) {
  const timestampCuid = formatTimestampCuid(date);

  if (collisionIndex <= 0) {
    return timestampCuid;
  }

  return `${timestampCuid}-${formatCollisionSuffix(collisionIndex)}`;
}
