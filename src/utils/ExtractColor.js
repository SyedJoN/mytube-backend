import sharp from "sharp";

export async function getMostFrequentColor(imagePath) {
  const { data, info } = await sharp(imagePath)
    .resize(64, 64, { fit: "inside" }) 
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const colorCount = new Map();

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const brightness = r + g + b;
    if (brightness < 60 || brightness > 740) continue;

    const key = `${r},${g},${b}`;
    colorCount.set(key, (colorCount.get(key) || 0) + 1);
  }

  if (colorCount.size === 0) return [128, 128, 128]; 

  const [r, g, b] = [...colorCount.entries()]
    .sort((a, b) => b[1] - a[1])[0][0]
    .split(",")
    .map(Number);

  return [r, g, b];
}
