# Meetergo page integration

Add meetergo iframes or booking buttons with modals
Prefill customer information

## Getting Started

Set meetergo settings and load script in the head of your page

```html
<script>
  window.meetergoSettings = {
    company: "test-test-1",
    floatingButton: {
      position: "bottom-right",
      attributes: {
        "data-event": "15-min-meeting",
      },
    },
    prefill: {
      firstname: "John",
      lastname: "smith",
      email: "tester@testing.com",
      phone: "0121196862",
    },
  };
</script>
<script
  async
  src="https://cdn.jsdelivr.net/gh/meetergo/meetergo-integration/dist/esbuild/browser.js"
></script>
```

You can add booking iframe like so. Not specifying an event slug will show the main booking page.
Note that quick booking only works if you specify an event

```html
<div
  class="meetergo-iframe"
  data-event="15-min-meeting"
  data-type="quick-booking"
></div>
```

To make element open a booking modal simply give it give it `meetergo-modal-button` class.
You can also specify `data-event` and `data-type` just like for iframes.

## Prefilling customer information

You can prefill customer information with `window.meetergo.setPrefill` function.
Pass the following as param. Or you can set it directly on `window.meetergoSettings.prefill`.

```typescript
{
    firstname?: string | undefined;
    lastname?: string | undefined;
    email?: string | undefined;
    note?: string | undefined;
    phone?: string | undefined;
    country?: string | undefined;
    addressLine1?: string | undefined;
    addressLine2?: string | undefined;
    city?: string | undefined;
    postalCode?: string | undefined;
    vatNumber?: string | undefined;
  }
```

Note: Information has to be prefilled before opening the modal or loading the iframes.
You can reload the iframes with `window.meetergo.parseIframes`

## I don't like this. How do I do integrate meetergo manually?

Simply make an iframe with the following link structure

Main Booking page
`https://my.meetergo.com/{{your-slug}}`

Specific event
`https://my.meetergo.com/{{your-slug}}/{{event-slug}}`

Quick Booking
Specific event
`https://my.meetergo.com/quick/{{your-slug}}/{{event-slug}}`

You can set these as query params on any link to prefill customer information

```typescript
    firstname?: string | undefined;
    lastname?: string | undefined;
    email?: string | undefined;
    note?: string | undefined;
    phone?: string | undefined;
    country?: string | undefined;
    addressLine1?: string | undefined;
    addressLine2?: string | undefined;
    city?: string | undefined;
    postalCode?: string | undefined;
    vatNumber?: string | undefined;
```
