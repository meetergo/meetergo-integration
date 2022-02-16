# meetergo page integration

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
      link: "my.meetergo.com/book/my-booking-link",
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

You can add booking iframe like so. just specify a booking link

```html
<div class="meetergo-iframe" link="my.meetergo.com/my-booking-link"></div>
```

To make element open a booking modal simply give it give it `meetergo-modal-button` class.
You can also specify `link` just like for iframes.

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

Simply make an iframe with with a booking link as src. Make sure to remove borders etc. to make it look nice.

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
