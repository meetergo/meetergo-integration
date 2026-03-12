# meetergo Integration Library

**Embed meetergo scheduling into any website — modals, sidebars, inline iframes, floating buttons, and video widgets.**

[![Version](https://img.shields.io/badge/version-v4.0-blue.svg)](https://github.com/meetergo/meetergo-integration)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg)](https://www.typescriptlang.org/)
[![AWS CDN](https://img.shields.io/badge/AWS-CDN%20Ready-orange.svg)](https://aws.amazon.com/cloudfront/)

## Quick Start

Paste the loader snippet into `<head>` — that's it:

```html
<script>
  (function(w,d,s,u){
    w.meetergo = w.meetergo || function(){ (w.meetergo.q = w.meetergo.q || []).push(arguments); };
    w.meetergo.version = '4';
    var e = d.createElement(s); e.async = 1; e.src = u;
    d.head.appendChild(e);
  })(window, document, 'script', 'https://liv-showcase.s3.eu-central-1.amazonaws.com/browser-v4.js');

  meetergo('init', {
    onBookingSuccessful: function(data) {
      console.log('Booking confirmed!', data);
    }
  });
</script>
```

## What's New in v4

- **Queue-based API** — `meetergo('init', {...})` replaces `window.meetergoSettings`. Calls made before the script loads are automatically queued and replayed.
- **Namespace isolation** — run multiple independent embeds on one page, each with its own modal, sidebar, and event bus.
- **Zero-JS data attribute API** — bind any element with `data-meetergo-link` without writing JavaScript.
- **Prerendering** — warm up iframes before the user clicks for instant-open modals.
- **Full event bus** — subscribe to any SDK event with `meetergo('on', {...})`.
- **v3 backwards compatible** — existing `class="meetergo-modal-button"` buttons and `window.meetergoSettings` continue to work.

---

## Integration Methods

### Inline Embed

Add `class="meetergo-iframe"` and `data-src` to any element:

```html
<div
  class="meetergo-iframe"
  data-src="https://cal.meetergo.com/your-booking-link"
  style="min-height: 600px;">
</div>
```

Optional attributes:
- `data-align="left|center|right"` — horizontal alignment
- `data-prefill-email`, `data-prefill-name`, etc. — pre-fill fields

### Modal (Popup)

**Data attribute (no JS):**
```html
<button data-meetergo-link="https://cal.meetergo.com/your-booking-link">
  Book Now
</button>
```

**JavaScript API:**
```js
meetergo('modal', { link: 'https://cal.meetergo.com/your-booking-link' });
```

**v3 backwards compatible (still works):**
```html
<button class="meetergo-modal-button" link="https://cal.meetergo.com/your-booking-link">
  Book Now
</button>
```

### Floating Button

```js
meetergo('init', {
  floatingButton: {
    link: 'https://cal.meetergo.com/your-booking-link',
    text: 'Book Appointment',
    position: 'bottom-right', // top-left, top-center, top-right, middle-left, middle-right, bottom-left, bottom-center, bottom-right
    backgroundColor: '#0A64BC',
    textColor: '#FFFFFF',
    animation: 'pulse', // pulse, bounce, slide-in, none
  }
});
```

### Sidebar

```js
meetergo('init', {
  sidebar: {
    link: 'https://cal.meetergo.com/your-booking-link',
    position: 'right', // left or right
    width: '400px',
    buttonText: 'Book Appointment',
    buttonIcon: 'CalendarPlus2',
    buttonPosition: 'top-right',
    backgroundColor: '#0A64BC',
    textColor: '#FFFFFF',
  }
});
```

### Video Widget

```js
meetergo('init', {
  videoEmbed: {
    videoSrc: 'https://video.meetergo.com/your-video.m3u8',
    posterImage: 'https://video.meetergo.com/your-poster.jpg',
    bookingLink: 'https://cal.meetergo.com/your-booking-link',
    bookingCta: 'Book Now 👉',
    videoCta: 'Watch me!',
    buttonColor: '#196EF5',
    position: 'bottom-right',
    size: { width: '130px', height: '200px' },
  }
});
```

### Prefill

Pass user data to pre-fill booking forms:

```js
meetergo('init', {
  prefill: {
    email: 'jane@example.com',
    firstname: 'Jane',
    lastname: 'Smith',
    phone: '+49123456789',
  }
});
```

Or via data attributes on modal triggers:

```html
<button
  data-meetergo-link="https://cal.meetergo.com/your-booking-link"
  data-meetergo-prefill-email="jane@example.com"
  data-meetergo-prefill-name="Jane Smith">
  Book Now
</button>
```

### Form Listeners

Auto-open modal when a form is submitted:

```js
meetergo('init', {
  formListeners: [
    {
      formId: 'contact-form',
      link: 'https://cal.meetergo.com/your-booking-link',
    }
  ]
});
```

---

## Events

Subscribe to SDK events:

```js
meetergo('on', {
  action: 'bookingSuccessful',
  callback: function(envelope) {
    console.log('Booked!', envelope.data);
  }
});
```

Available events:

| Event | Fired when |
|---|---|
| `linkReady` | SDK has bound all elements |
| `bookingSuccessful` | A booking was completed |
| `bookingCancelled` | A booking was cancelled |
| `bookingRescheduled` | A booking was rescheduled |
| `modalOpened` | Modal opened |
| `modalClosed` | Modal closed |
| `sidebarOpened` | Sidebar opened |
| `sidebarClosed` | Sidebar closed |
| `videoPlay` | Video started playing |
| `videoPause` | Video paused |
| `videoExpanded` | Video widget expanded |
| `bookerViewed` | Booking page was viewed inside iframe |

Convenience callbacks in `init` config:

```js
meetergo('init', {
  onBookingSuccessful: function(data) { ... },
  onEvent: function(envelope) { ... },  // all events
});
```

---

## Namespace Isolation

Run multiple independent embed instances on one page:

```js
meetergo('init', { ns: 'sales', floatingButton: { link: '...', backgroundColor: '#dc2626' } });
meetergo('init', { ns: 'support', floatingButton: { link: '...', backgroundColor: '#059669' } });
```

Target a specific namespace from a button:

```html
<button data-meetergo-link="https://cal.meetergo.com/sales" data-meetergo-ns="sales">
  Talk to Sales
</button>
```

---

## Prerendering

Warm up a booking page before the user clicks — modal opens instantly:

```js
meetergo('prerender', { link: 'https://cal.meetergo.com/your-booking-link' });
```

Prerendering also happens automatically for floating button links.

---

## JavaScript API Reference

```js
// Init / configure
meetergo('init', config)

// Modal
meetergo('modal', { link })
meetergo('closeModal')

// Inline embed (programmatic)
meetergo('inline', { link, elementOrSelector: '#my-container' })

// Prerender
meetergo('prerender', { link })

// Events
meetergo('on',   { action, callback })
meetergo('off',  { action, callback })
meetergo('once', { action, callback })

// Prefill
meetergo('setPrefill', { email, firstname, lastname, phone })

// Theme (live update)
meetergo('ui', { cssVars: { '--mg-brand': '#7c3aed' } })

// Destroy
meetergo('destroy')

// Direct namespace access
meetergo.ns['default'].openModal(link)
meetergo.ns['sales'].toggleSidebar()
```

---

## Theming

Override CSS variables via `ui.cssVars`:

```js
meetergo('init', {
  ui: {
    cssVars: {
      '--mg-brand':       '#7c3aed',
      '--mg-brand-hover': '#6d28d9',
    }
  }
});
```

---

## Migration from v3

v4 is backwards compatible — no immediate changes required. To adopt the new API:

**Before (v3):**
```html
<script>
  window.meetergoSettings = {
    floatingButton: { link: '...', position: 'bottom-right' },
    onSuccess: function(data) { ... },
  };
</script>
<script src="https://liv-showcase.s3.eu-central-1.amazonaws.com/browser-v3.js"></script>
```

**After (v4):**
```html
<script>
  (function(w,d,s,u){
    w.meetergo = w.meetergo || function(){ (w.meetergo.q = w.meetergo.q || []).push(arguments); };
    w.meetergo.version = '4';
    var e = d.createElement(s); e.async = 1; e.src = u;
    d.head.appendChild(e);
  })(window, document, 'script', 'https://liv-showcase.s3.eu-central-1.amazonaws.com/browser-v4.js');

  meetergo('init', {
    floatingButton: { link: '...', position: 'bottom-right' },
    onBookingSuccessful: function(data) { ... },
  });
</script>
```

**Inline embed attribute change:**
```html
<!-- v3 (still works) -->
<div class="meetergo-iframe" link="https://cal.meetergo.com/your-link"></div>

<!-- v4 (recommended) -->
<div class="meetergo-iframe" data-src="https://cal.meetergo.com/your-link"></div>
```

---

## Development

```bash
npm install

# Dev build (with inline sourcemaps)
npm run esbuild-v4-browser:dev

# Production build
npm run esbuild-v4-browser

# Open test page
open test-v4.html
```

The test page (`test-v4.html`) covers all embed types: inline, modal, sidebar, floating button, video widget, namespace isolation, and event logging.

---

## CDN

```html
<!-- v4 (current) -->
<script src="https://liv-showcase.s3.eu-central-1.amazonaws.com/browser-v4.js"></script>

<!-- v3 (legacy) -->
<script src="https://liv-showcase.s3.eu-central-1.amazonaws.com/browser-v3.js"></script>
```

---

## Support

- **Issues**: [github.com/meetergo/meetergo-integration/issues](https://github.com/meetergo/meetergo-integration/issues)
- **Email**: integration@meetergo.com

---

**Made with ❤️ by the meetergo Team**
