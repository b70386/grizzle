export default async function handler(req, res) {
  const { endpoint } = req.query;
  const apiKey = process.env.TMDB_API_KEY;
  const response = await fetch(`https://api.themoviedb.org/3${endpoint}?api_key=${apiKey}`);
  const data = await response.json();
  res.status(200).json(data);
}