import { buildSpyHistory } from '../_shared.js';

export default function handler(req, res) {
  res.status(200).json(buildSpyHistory());
}
