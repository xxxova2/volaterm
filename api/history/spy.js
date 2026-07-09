import { buildSpyHistoryAsync } from '../_shared.js';

export default async function handler(req, res) {
  const apiKey = process.env.FMP_API_KEY || null;
  const payload = await buildSpyHistoryAsync(apiKey);
  res.status(200).json(payload);
}
