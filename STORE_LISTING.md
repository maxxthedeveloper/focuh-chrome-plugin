# Chrome Web Store Listing Copy

## Store Assets Needed

Required:

- Extension icon: `128x128` PNG included in the extension package. Done: `public/icons/icon-128.png`.
- Small promotional image: `440x280` PNG or JPEG.
- Screenshot: at least 1 image, either `1280x800` or `640x400`.

Recommended:

- Screenshots: 3 to 5 total, ideally `1280x800`.
- Marquee promotional image: `1400x560`, optional.

## Listing Copy

Name:
Focuh Challenge

Short description:
Block distracting websites during a self-imposed focus challenge.

Detailed description:
Focuh Challenge helps you protect your attention by blocking the websites you choose for a challenge period you set.

Create a challenge, add distracting domains, and let the extension interrupt the reflex to check them. When you try to visit a blocked site during an active challenge, Focuh redirects you to a quiet local blocked page and records the attempt for the day.

The extension is intentionally simple:

- Choose a challenge duration.
- Add or remove blocked domains.
- See how many times you tried to visit blocked sites today.
- Keep all settings and activity stored locally on your device.

Focuh Challenge does not use accounts, analytics, ads, remote code, or external servers.

Category:
Productivity

Language:
English

## Privacy Tab Copy

Single purpose:
Focuh Challenge blocks user-selected distracting websites during a user-defined focus challenge and shows local attempt counts when blocked sites are visited.

Permission justification: storage
Used to save the user's blocked-domain list, challenge dates, and daily blocked-attempt counts in Chrome's local extension storage.

Permission justification: webNavigation
Used to detect top-level navigations so the extension can compare the current page hostname with the user's blocked-domain list during an active challenge.

Host permission justification: <all_urls>
Required because users can add any website domain to their blocked list. The extension only checks the top-level hostname locally, redirects matching blocked domains to the extension's local blocked page, and does not read page content or transmit browsing data.

Remote code:
No. Focuh Challenge does not load or execute remote code.

Data use disclosure:
Focuh Challenge stores the blocked-domain list, challenge dates, and blocked-attempt counts locally on the user's device using Chrome storage. It checks navigated hostnames locally to determine whether a page should be blocked. No data is sold, shared, transferred, or sent to external servers.

Privacy policy URL:
Use the hosted URL for `PRIVACY_POLICY.md` once published on your website or repository.

## Test Instructions

1. Install the extension.
2. Open the extension options page.
3. Create a 1-day challenge.
4. Add a domain such as `example.com`.
5. Navigate to `https://example.com`.
6. Confirm the tab redirects to the local blocked page and the attempt count increments.
