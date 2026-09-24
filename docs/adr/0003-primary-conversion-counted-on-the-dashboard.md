# Count the primary conversion on the dashboard, not the marketing site

The free trial form lives on `dashboard.brackstonedigital.co.uk`, in a separate repo. Counting trial button clicks on the marketing site would be easy, but it counts interest, not sign-ups, and Google Ads would optimise for the wrong thing. We decided that the primary conversion fires on the dashboard's trial request success page, and the marketing site only reports secondary conversions (trial button taps and demo line taps). This means the marketing site passes the ad click ID (`gclid`) and UTM tags through to the trial request page, and the dashboard stores them with the request.

## Consequences

- Conversion tracking is split across two repos. The dashboard change is on a public route, so it needs Codex review.
- Both sites must read the same cookie consent, so the consent choice is stored where both subdomains can see it.
