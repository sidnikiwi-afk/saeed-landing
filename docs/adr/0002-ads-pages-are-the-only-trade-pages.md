# Ads pages are the only trade pages

Paid search traffic never lands on the homepage. Each search intent gets one ads page (starting with garages, then estate agents, then a general AI receptionist page) that sells only the AI receptionist and leads with the free trial. We decided not to build separate industry pages next to them, so `/garages/` is an ads page, not a general page about everything Brackstone does for garages. Keeping two pages per trade would split effort and search ranking, and the homepage already covers the three pillars for organic visitors.

## Consequences

- The homepage Industries section links to a trade's ads page where one exists, and has no link otherwise.
- If industry pages are wanted later, they need new URLs or a migration of the ads page URLs, which would break live ad links.
