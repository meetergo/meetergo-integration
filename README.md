# meetergo Page Integration

Easily integrate meetergo scheduling into your website with iframes, booking buttons with modals, and form integrations.

## Getting Started

Set meetergo settings and load the script in the head of your page:

```html
<script>
  window.meetergoSettings = {
    company: "test-test-1",
    floatingButton: {
      position: "bottom-right",
      link: "my.meetergo.com/book/my-booking-link",
      text: "Book Appointment",
      icon: "CalendarPlus", // Optional
      animation: "pulse", // Optional
      backgroundColor: "#0A64BC", // Optional
      textColor: "#FFFFFF", // Optional
    },
    prefill: {
      firstname: "John",
      lastname: "Smith",
      email: "tester@testing.com",
      phone: "0121196862",
    },
    formListeners: [
      {
        formId: "contact-form", // ID of the form to listen to
        link: "my.meetergo.com/book/my-booking-link", // Booking link to open when form submitted
      },
    ],
  };
</script>
<script
  async
  src="https://liv-showcase.s3.eu-central-1.amazonaws.com/browser-v2.js"
></script>
```

## Integration Methods

### Iframe Embedding

Add a booking iframe to your page by specifying a booking link:

```html
<div class="meetergo-iframe" link="my.meetergo.com/my-booking-link"></div>
```

### Modal Booking Buttons

To make any element open a booking modal, give it the `meetergo-modal-button` class and specify a link:

```html
<button class="meetergo-modal-button" link="my.meetergo.com/my-booking-link">
  Book Now
</button>
```

### Styled Buttons

Add the `meetergo-styled-button` class to automatically style your booking buttons:

```html
<button
  class="meetergo-styled-button meetergo-modal-button"
  link="my.meetergo.com/my-booking-link"
>
  Book Appointment
</button>
```

### Floating Button

Customize the floating button with the following options:

````javascript
floatingButton: {
  position: "bottom-right", // Options: top-left, top-center, top-right, middle-left, middle-center, middle-right, bottom-left, bottom-center, bottom-right
  link: "my.meetergo.com/book/my-booking-link",
  text: "Book Appointment", // Button text
  icon: "CalendarPlus", // See available icons below
  animation: "pulse", // Options: none, pulse, bounce, slide-in
  backgroundColor: "#0A64BC", // Custom background color
  textColor: "#FFFFFF" // Custom text color
}

### Callbacks

#### `onSuccess`

The `onSuccess` callback is triggered after a booking is successfully completed. It receives a data object with details about the booking, which you can use to perform actions like redirecting the user or sending analytics events.

```javascript
window.meetergoSettings = {
  onSuccess(data) {
    console.log("Meeting booked!", data);
    // Example: Redirect to a thank you page if an appointmentId is present
    if (data.appointmentId) {
      window.location.href = `/thank-you?id=${data.appointmentId}`;
    }
  }
};
````

The `data` object has the following structure:

```typescript
type BookingSuccessfulData = {
  appointmentId?: string;
  secret?: string;
  attendeeEmail?: string;
  bookingType?: "doubleOptIn" | "requireHostConfirmation";
  provisionalBookingId?: string;
};
```

````

### Collapsible Sidebar

Add a collapsible sidebar with an iframe that slides in from the edge of the screen. The sidebar includes a stylish toggle button that sticks to the edge of the screen and a close button within the sidebar.

```javascript
sidebar: {
  position: "right", // Options: left, right
  width: "400px", // Width of the sidebar
  link: "my.meetergo.com/book/my-booking-link", // Booking link to display in the sidebar
  buttonText: "Open Scheduler", // Text for the toggle button (optional, can be omitted for icon-only)
  buttonIcon: "calendar", // Icon for the toggle button (optional, can be omitted for text-only)
  buttonPosition: "middle-right", // Position of the toggle button (top, middle, bottom + left/right)
  backgroundColor: "#0A64BC", // Custom button background color
  textColor: "#FFFFFF" // Custom button text color
}
````

### Video Embed

Add an interactive video widget that expands to show booking options. Configure using these options:

```javascript
videoEmbed: {
  videoSrc: "https://example.com/promo-video.mp4", // Required - Video URL (MP4 or HLS)
  bookingLink: "my.meetergo.com/book/my-booking-link", // Required - Booking link
  posterImage: "https://example.com/poster.jpg", // Optional - Preview image
  position: "bottom-right", // Options: top/bottom/middle + left/right/center
  buttonColor: "#0A64BC", // Border and CTA button color
  bookingCta: "Schedule Consultation", // CTA text
  size: { width: "200px", height: "158px" }, // Initial size
  isRound: true, // Circular vs rectangular shape
  bookingCtaColor: "#FFFFFF" // CTA text color
}
```

**Features:**

- Click to expand from compact view to full video player
- Built-in video controls (pause/play, mute, progress bar)
- Booking CTA button that opens scheduling modal
- Hover effects and smooth animations
- Automatic fallback to poster image if video fails to load
- Position customization (9 possible positions)
- Minimized indicator when closed

#### Sidebar Button Configuration

- **Text, Icon, or Both**: You can use just text (`buttonText`), just an icon (`buttonIcon`), or both together.
- **Edge Placement**: The button automatically attaches to the edge of the screen on the specified side.
- **Visibility**: The button automatically hides when the sidebar is open and reappears when closed.

Available animations:

- `none` - No animation
- `pulse` - Subtle pulsing effect
- `bounce` - Bouncing effect
- `slide-in` - Slides in from the edge based on button position

Available icon options:

- `CalendarPlus`
- `CalendarPlus2`
- `Calendar`
- `Clock`
- `User`
- `Video`
- `Mail`
- `Phone`
- `MessageSquare`
- `Coffee`
- `Users`
- `Briefcase`
- `Heart`
- `Star`
- `BookOpen`
- `PenTool`

### Form Integration

You can integrate with forms so that when a form is submitted, a booking modal opens with form data pre-filled:

```javascript
formListeners: [
  {
    formId: "contact-form", // ID of the form to listen to
    link: "my.meetergo.com/book/my-booking-link", // Booking link to open
  },
];
```

## JavaScript API

### Prefilling Customer Information

You can prefill customer information with the `window.meetergo.setPrefill()` function or set it directly on `window.meetergoSettings.prefill`:

```javascript
window.meetergo.setPrefill({
  firstname: "John",
  lastname: "Smith",
  email: "john@example.com",
  phone: "123456789",
  note: "Some additional information",
  country: "US",
  addressLine1: "123 Main St",
  addressLine2: "Apt 4B",
  city: "New York",
  postalCode: "10001",
  vatNumber: "VAT12345",
});
```

### Binding DOM Elements

Programmatically bind any DOM element to the scheduler:

```javascript
const element = document.getElementById("my-booking-button");
window.meetergo.bindElementToScheduler(
  element,
  "my.meetergo.com/my-booking-link",
  {
    params: { firstname: "John", email: "john@example.com" },
    removeExistingListeners: true,
  }
);
```

### Unbinding DOM Elements

Remove meetergo scheduler binding from an element:

```javascript
const element = document.getElementById("my-booking-button");
window.meetergo.unbindElementFromScheduler(element);
```

### Launching the Scheduler Programmatically

Launch the scheduler modal from your JavaScript code:

```javascript
// Use default link from settings
window.meetergo.launchScheduler();

// Or specify a custom link and parameters
window.meetergo.launchScheduler("my.meetergo.com/my-booking-link", {
  firstname: "John",
  email: "john@example.com",
});
```

### Modal Management

Control the modal directly:

```javascript
// Open the modal
window.meetergo.openModal();

// Close the modal
window.meetergo.closeModal();

// Open modal with specific content
window.meetergo.openModalWithContent({
  link: "my.meetergo.com/my-booking-link",
  existingParams: { firstname: "John" },
});
```

### Other Utilities

```javascript
// Refresh iframes after changing prefill data
window.meetergo.parseIframes();

// Refresh buttons after DOM changes
window.meetergo.parseButtons();

// For embedded iframes: send height to parent page
window.meetergo.sendScrollHeightToParent();
```

## Manual Integration

If you prefer to manually integrate meetergo:

1. Create an iframe with the booking link as the src:

```html
<iframe
  src="my.meetergo.com/my-booking-link?firstname=John&email=john@example.com"
  style="width: 100%; height: 700px; border: none;"
></iframe>
```

2. You can add the following query parameters to prefill customer information:

- firstname
- lastname
- email
- note
- phone
- country
- addressLine1
- addressLine2
- city
- postalCode
- vatNumber
