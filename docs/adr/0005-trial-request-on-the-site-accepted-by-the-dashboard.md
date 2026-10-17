---
status: accepted
---
# Take trial requests on the site; count the conversion once the dashboard accepts them

ADR 0003 put the trial request form and the primary conversion on the dashboard. On 14 October 2026 Saeed chose to keep the site's get-started page, already in the current brand and wired for consented tracking, as the trial request form, and have it send each request to the dashboard instead of rebuilding the dashboard's older form. The dashboard keeps the security check, rate limits, one-trial-per-business check and record of every request. The primary conversion fires on the site only after the dashboard confirms it accepted the request, so it still counts real trial requests rather than button taps, which was the point of ADR 0003.

## Consequences

- The dashboard needs an endpoint that accepts trial requests from the site and says whether each one was accepted.
- Consent stays on one domain (brackstonedigital.co.uk); the ad click ID and UTM tags travel with the request so the dashboard can store them.
- The dashboard's own trial request page is retired once the site path is live.
