# meetergo Integration Library

**Professional booking integration for websites with TypeScript support, modular architecture, and enhanced user experience.**

[![Version](https://img.shields.io/badge/version-v3.0-blue.svg)](https://github.com/meetergo/meetergo-integration)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg)](https://www.typescriptlang.org/)
[![AWS CDN](https://img.shields.io/badge/AWS-CDN%20Ready-orange.svg)](https://aws.amazon.com/cloudfront/)

Easily integrate meetergo scheduling into your website with iframes, booking buttons, sidebars, video embeds, and form integrations. Now featuring **auto-resize iframes** (no scrollbars!), **improved video controls**, and **professional error handling**.

## ✨ What's New in v3.0

- 🎯 **Auto-Resize Iframes**: No more scrollbars! Iframes automatically adjust height for professional appearance
- 🎬 **Enhanced Video Controls**: Working progress bar, mute button, and smooth interactions
- 🔧 **TypeScript Support**: Full type safety with comprehensive interfaces
- 🏗️ **Modular Architecture**: Cleaner, more maintainable codebase
- 🚨 **Better Error Handling**: User-visible notifications instead of console-only logging
- 🧠 **Memory Management**: Proper cleanup to prevent memory leaks
- ⚡ **Performance Optimized**: DOM caching and efficient rendering
- 🌐 **AWS CDN Ready**: Production-ready deployment on CloudFront

## 🚀 Quick Start

Set meetergo settings and load the script:

```html
<script>
  window.meetergoSettings = {
    company: "your-company",
    enableAutoResize: true, // ✨ New: Enable auto-resize for iframes
    floatingButton: {
      position: "bottom-right",
      link: "https://cal.meetergo.com/your-booking-link",
      text: "Book Appointment",
      animation: "pulse",
      backgroundColor: "#0A64BC",
      textColor: "#FFFFFF",
    },
    prefill: {
      firstname: "John",
      lastname: "Smith",
      email: "john@example.com",
      phone: "+1234567890",
    },
    // ✨ New: Enhanced callbacks
    onSuccess: function (data) {
      console.log("Booking successful!", data);
      // Handle both legacy string and new object formats
      if (typeof data === "string") {
        // Legacy: data is appointment ID
        console.log("Appointment ID:", data);
      } else {
        // New: data is BookingSuccessfulData object
        console.log("Booking details:", data);
      }
    },
    onEvent: function (event) {
      console.log("meetergo event:", event);
    },
  };
</script>

<!-- Production CDN (Latest) -->
<script src="https://liv-showcase.s3.eu-central-1.amazonaws.com/browser-v3.js"></script>
```

## 📋 Integration Methods

### 🖼️ Auto-Resize Iframe Embedding

Add a booking iframe that **automatically adjusts height** (no scrollbars needed!):

```html
<!-- ✨ Auto-resizing iframe (enabled by default) -->
<div
  class="meetergo-iframe"
  link="https://cal.meetergo.com/your-booking-link"
></div>

<!-- Disable auto-resize if needed -->
<div
  class="meetergo-iframe"
  link="https://cal.meetergo.com/your-booking-link"
  data-resize="false"
></div>
```

**Features:**

- ✅ **No scrollbars**: Automatic height adjustment (enabled by default)
- ✅ **Smooth transitions**: Professional animations
- ✅ **Cross-origin support**: Works with all meetergo domains
- ✅ **Fallback handling**: Graceful degradation if auto-resize fails
- ✅ **Optional disable**: Set `data-resize="false"` to disable auto-resize

### 🎭 Modal Booking Buttons

Any element can open a booking modal:

```html
<button
  class="meetergo-modal-button"
  link="https://cal.meetergo.com/your-booking-link"
>
  Book Now
</button>

<!-- With automatic styling -->
<button
  class="meetergo-styled-button meetergo-modal-button"
  link="https://cal.meetergo.com/your-booking-link"
>
  Book Appointment
</button>
```

### 🎈 Floating Button

Customizable floating action button:

```javascript
floatingButton: {
  position: "bottom-right", // 9 positions available
  link: "https://cal.meetergo.com/your-booking-link",
  text: "Book Meeting",
  animation: "pulse", // pulse, bounce, slide-in, none
  backgroundColor: "#0A64BC",
  textColor: "#FFFFFF"
}
```

### 📱 Collapsible Sidebar

Professional sidebar with toggle button:

```javascript
sidebar: {
  position: "right", // left or right
  width: "400px",
  link: "https://cal.meetergo.com/your-booking-link",
  buttonText: "Open Scheduler",
  buttonIcon: "calendar", // Lucide icons
  buttonPosition: "middle-right",
  backgroundColor: "#0A64BC",
  textColor: "#FFFFFF"
}
```

**Available icons:** `calendar`, `clock`, `user`, `mail`, `phone`, `message-square`

### 🎬 Enhanced Video Embed

Interactive video widget with **improved controls**:

```javascript
videoEmbed: {
  videoSrc: "https://video.meetergo.com/your-video.m3u8", // HLS or MP4
  posterImage: "https://video.meetergo.com/your-poster.jpg",
  bookingLink: "https://cal.meetergo.com/your-booking-link",

  // ✨ Enhanced options
  position: "bottom-left",
  buttonColor: "#196EF5",
  bookingCta: "Book Appointment 👉",
  videoCta: "Click to watch!",
  size: { width: "140px", height: "210px" },
  isRound: false
}
```

**✨ New Video Features:**

- 🎯 **Working Progress Bar**: Only shows when video is expanded and playing
- 🔇 **Functional Mute Button**: Click to toggle audio with visual feedback
- 🎬 **Smooth Controls**: Responsive play/pause and progress tracking
- 📱 **Click to Expand**: Mini preview expands to full player
- 🔄 **Auto-restart**: Video loops seamlessly
- 📐 **HLS Support**: Supports adaptive streaming

### 📝 Form Integration

Trigger booking modals from form submissions:

```javascript
formListeners: [
  {
    formId: "contact-form",
    link: "https://cal.meetergo.com/your-booking-link",
  },
];
```

## 🔧 JavaScript API

### Enhanced Methods

```javascript
// ✨ New: Check if integration is ready
if (window.meetergo.isReady()) {
  console.log("meetergo is ready!");
}

// ✨ New: Get system status
const status = window.meetergo.getStatus();
console.log("Status:", status);

// Set prefill data with TypeScript support
window.meetergo.setPrefill({
  firstname: "John",
  lastname: "Smith",
  email: "john@example.com",
  phone: "+1234567890",
  company: "Acme Corp",
});

// Launch scheduler programmatically
window.meetergo.launchScheduler("https://cal.meetergo.com/your-link", {
  firstname: "Jane",
  email: "jane@example.com",
});

// ✨ New: Clean up all components and event listeners
window.meetergo.destroy();
```

### Modal Management

```javascript
// Open/close modal
window.meetergo.openModal();
window.meetergo.closeModal();

// Open with specific content
window.meetergo.openModalWithContent({
  link: "https://cal.meetergo.com/your-link",
  existingParams: { firstname: "John" },
});
```

### DOM Management

```javascript
// Refresh components after DOM changes
window.meetergo.parseIframes();
window.meetergo.parseButtons();

// Bind/unbind elements
window.meetergo.bindElementToScheduler(element, link, options);
window.meetergo.unbindElementFromScheduler(element);
```

## 🎯 Callbacks & Events

### Enhanced Success Callback

```javascript
window.meetergoSettings = {
  // ✨ Supports both legacy and new formats
  onSuccess: function (dataOrId) {
    if (typeof dataOrId === "string") {
      // Legacy format: appointment ID string
      console.log("Appointment ID:", dataOrId);
      window.location.href = `/thank-you?id=${dataOrId}`;
    } else {
      // New format: BookingSuccessfulData object
      console.log("Booking data:", dataOrId);
      if (dataOrId.appointmentId) {
        window.location.href = `/thank-you?id=${dataOrId.appointmentId}`;
      }
    }
  },

  // ✨ New: General event handler
  onEvent: function (event) {
    switch (event.type) {
      case "booking_completed":
        console.log("Booking completed!");
        break;
      case "modal_opened":
        console.log("Modal opened");
        break;
      case "video_expand":
        console.log("Video expanded");
        break;
    }
  },
};
```

### TypeScript Types

```typescript
type BookingSuccessfulData = {
  appointmentId?: string;
  secret?: string;
  attendeeEmail?: string;
  bookingType?: "doubleOptIn" | "requireHostConfirmation";
  provisionalBookingId?: string;
};

interface meetergoSettings {
  company: string;
  enableAutoResize?: boolean;
  floatingButton?: FloatingButtonConfig;
  sidebar?: SidebarConfig;
  videoEmbed?: VideoEmbedConfig;
  prefill?: meetergoPrefill;
  formListeners?: FormListener[];
  onSuccess?: (dataOrId: BookingSuccessfulData | string) => void;
  onEvent?: (event: meetergoEvent) => void;
}
```

## 🏗️ Architecture & Performance

### Modular Design

- **Modal Manager**: Handles popup windows and overlays
- **Sidebar Manager**: Manages collapsible sidebar functionality
- **Video Embed Manager**: Controls video playback and interactions
- **DOM Cache**: Optimizes element queries for better performance
- **Error Handler**: Provides user-friendly error notifications

### Memory Management

- ✅ **Automatic Cleanup**: Event listeners and timeouts are properly cleaned up
- ✅ **Memory Leak Prevention**: Proper component lifecycle management
- ✅ **Performance Monitoring**: Built-in performance tracking

### Browser Support

- ✅ **Modern Browsers**: Chrome, Firefox, Safari, Edge
- ✅ **Mobile Friendly**: Responsive design for all devices
- ✅ **HLS Support**: Adaptive video streaming
- ✅ **Fallback Handling**: Graceful degradation for older browsers

## 🌐 CDN & Deployment

### Production CDN

```html
<!-- Latest stable version -->
<script src="https://d3j7x8v9y2q4z8.cloudfront.net/browser-v3.js"></script>

<!-- Previous version (fallback) -->
<script src="https://liv-showcase.s3.eu-central-1.amazonaws.com/browser-v2.js"></script>
```

### Self-Hosting

```bash
npm install
npm run build
npm run esbuild-browser:ultra  # Ultra-minified production build
```

Use `dist/esbuild/browser-ultra.js` for production deployment.

## 🔍 Testing & Development

### Local Development

```bash
# Install dependencies
npm install

# Start development build
npm run esbuild-browser:dev

# Watch for changes
npm run esbuild-browser:watch

# Run tests
npm test

# Lint code
npm run lint
```

### Test Pages

- `index.html` - Local development testing
- `index-aws-test.html` - Production CDN testing

## 🚨 Migration Guide

### Upgrading from v2 to v3

**No breaking changes!** v3 is fully backward compatible.

**New features to adopt:**

```javascript
// Enable auto-resize for better UX
window.meetergoSettings.enableAutoResize = true;

// Enhanced video embed controls
videoEmbed: {
  // ... existing config
  // Progress bar now works automatically
  // Mute button is now functional
}

// New callback format (optional)
onSuccess: function(data) {
  // Handle both old and new formats automatically
  console.log('Booking result:', data);
}
```

### Embed Code Updates

**Old iframe embeds** work unchanged, but for better UX:

```html
<!-- Before (still works) -->
<iframe
  src="https://cal.meetergo.com/your-link"
  style="width:100%;height:600px;"
></iframe>

<!-- After (recommended) -->
<div class="meetergo-iframe" link="https://cal.meetergo.com/your-link"></div>
```

## 📞 Support

- **Documentation**: [docs.meetergo.com](https://docs.meetergo.com)
- **GitHub Issues**: [Report bugs or request features](https://github.com/meetergo/meetergo-integration/issues)
- **Email**: integration@meetergo.com

---

**Made with ❤️ by the meetergo Team**
