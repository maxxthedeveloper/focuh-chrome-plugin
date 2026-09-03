# Chrome Web Store Listing Copy

## Store Assets Needed

Required:

- Extension icon: `128x128` PNG included in the extension package. Done: `public/icons/icon-128.png`.
- Small promotional image: `440x280` PNG or JPEG. Done: `store-assets/Chrome Web Store/bymax/Chrome Web Store/promo-small-440x280.png`.
- Screenshot: at least 1 image, either `1280x800` or `640x400`. Done: `store-assets/Chrome Web Store/bymax/Chrome Web Store/screenshot-01-blocked-page-1280x800.png`.

Recommended:

- Screenshots: 3 to 5 total, ideally `1280x800`. Done:
  - `store-assets/Chrome Web Store/bymax/Chrome Web Store/screenshot-01-blocked-page-1280x800.png`
  - `store-assets/Chrome Web Store/bymax/Chrome Web Store/screenshot-02-challenge-flow-1280x800.png`
  - `store-assets/Chrome Web Store/bymax/Chrome Web Store/screenshot-03-local-first-1280x800.png`
- Marquee promotional image: `1400x560`, optional. Done: `store-assets/Chrome Web Store/bymax/Chrome Web Store/promo-marquee-1400x560.png`.

## Listing Copy

Name:
Focuh: ADHD Website Blocker for Chrome

Short description:
Free unlimited website blocker for Chrome. No account, no 3-site cap. ADHD-friendly focus challenges, stored locally.

Detailed description:
Focuh helps you protect your attention by blocking the websites you choose for a challenge period you set.

Create a challenge, add distracting domains, and let the extension interrupt the reflex to check them. When you try to visit a blocked site during an active challenge, Focuh redirects you to a quiet local blocked page and records the attempt for the day.

The extension is intentionally simple:

- Choose a challenge duration.
- Add or remove blocked domains.
- Optionally block only during your work hours (pick the days and times); outside them, browsing is free.
- Optionally allow yourself a daily limit (for example 15 minutes per day) on blocked sites before they lock for the rest of the day.
- See how many times you tried to visit blocked sites today.
- Keep all settings and activity stored locally on your device.

Focuh does not use accounts, analytics, ads, remote code, or external servers.

Category:
Productivity

Language:
English

## Privacy Tab Copy

Single purpose:
Focuh blocks user-selected distracting websites during a user-defined focus challenge, according to the user's optional work-hours schedule and daily time limit, and shows local attempt counts when blocked sites are visited.

Permission justification: storage
Used to save the user's blocked-domain list, challenge dates, daily blocked-attempt counts, optional work-hours schedule, optional daily time limit, and locally accumulated time-used counters in Chrome's local extension storage.

Permission justification: webNavigation
Used to detect top-level navigations so the extension can compare the current page hostname with the user's blocked-domain list during an active challenge.

Permission justification: alarms
Used for a periodic local timer that accumulates time spent on blocked sites while the optional daily time limit feature is active, because Manifest V3 service workers cannot keep an in-memory timer running. The alarm only runs while a blocked site is the active tab.

Permission justification: idle
Used to stop counting time toward the optional daily limit when the user is away from the device or the screen is locked, so the limit is only consumed during active use. Idle state is checked locally and never stored or transmitted.

Host permission justification: <all_urls>
Required because users can add any website domain to their blocked list. The extension only checks the top-level hostname locally, redirects matching blocked domains to the extension's local blocked page, and does not read page content or transmit browsing data.

Remote code:
No. Focuh does not load or execute remote code.

Data use disclosure:
Focuh stores the blocked-domain list, challenge dates, blocked-attempt counts, the optional work-hours schedule and daily time limit, and daily time-used counters locally on the user's device using Chrome storage. It checks navigated hostnames locally to determine whether a page should be blocked. No data is sold, shared, transferred, or sent to external servers.

Privacy policy URL:
https://focuh.com/chrome-extension/privacy

Support contact:
support@focuh.com

## Test Instructions

1. Install the extension.
2. Open the extension options page.
3. Create a 1-day challenge.
4. Add a domain such as `example.com`.
5. Navigate to `https://example.com`.
6. Confirm the tab redirects to the local blocked page and the attempt count increments.
7. Work hours: enable "Work hours" on the options page and pick a window that excludes the current time. Navigate to `https://example.com` and confirm the site loads normally. Change the window to include the current time and confirm the site is blocked again.
8. Daily limit: disable "Work hours", enable "Daily limit" and set it to 1 minute. Navigate to `https://example.com` — the site loads. Keep the tab focused for about a minute; the tab redirects to the blocked page once the limit is used, and further visits are blocked for the rest of the day.
