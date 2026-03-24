/**
 * Subreddit sentiment via Gemini Google Search Grounding.
 * No Apify/scraping — Gemini searches Reddit directly.
 */

export const SUBREDDITS = [
  'wallstreetbets',
  'CryptoCurrency',
  'geopolitics',
  'worldnews',
  'MacroEconomics',
  'taiwan',
  'france',
  'europe',
  'investing',
  'stocks',
]

/**
 * Returns a prompt fragment instructing Gemini to search each subreddit
 * and return one sentiment entry per community.
 */
export function buildSubredditPromptSection(): string {
  const list = SUBREDDITS.map((s) => `r/${s}`).join(', ')
  return `\n\nSEARCH REDDIT — Search for what people are posting and discussing TODAY in these subreddits: ${list}. For each subreddit find the dominant mood and what the main conversation topics are. Write each summary in plain English, 1-2 sentences max. Include all ${SUBREDDITS.length} subreddits in the subredditSentiment array.`
}
