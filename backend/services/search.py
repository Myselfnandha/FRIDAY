import logging
from ddgs import DDGS

logger = logging.getLogger(__name__)


class SearchService:
    async def search(self, query: str, max_results: int = 5) -> str:
        try:
            results = DDGS().text(query, max_results=max_results)

            if not results:
                return f"No results found for '{query}'."

            formatted = []
            for i, r in enumerate(results, 1):
                formatted.append(f"{i}. **{r['title']}**\n   {r['body']}\n   Source: {r['href']}")

            output = "\n\n".join(formatted)
            logger.info(f"Search '{query}': {len(results)} results")
            return output
        except Exception as e:
            logger.error(f"Search error: {e}")
            return f"Search failed: {str(e)}"


search_service = SearchService()
