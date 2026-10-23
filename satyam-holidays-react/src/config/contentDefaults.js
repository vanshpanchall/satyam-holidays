// Editable website content (Admin → Settings → Homepage / Legal).
// Mirrored in satyam-holidays-backend/services/contentDefaults.js — keep both in sync.

const UNSPLASH = "https://images.unsplash.com/photo-";

const CONTENT_DEFAULTS = {
  "company.emergencyEmail": "satyamholidays19@gmail.com",
  "company.mapEmbed":
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3545.9275301777448!2d72.56326727516657!3d23.090565779126248!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e834ebdc109cd%3A0xac3baa0a6a626357!2sSatyam%20Holidays!5e1!3m2!1sen!2sus!4v1784476925120!5m2!1sen!2sus",
  "social.youtube": "",

  "announcement.enabled": true,
  "announcement.text":
    "Chardham Yatra departures for the new season are open — seats are limited per batch.",
  "announcement.linkLabel": "See dates",
  "announcement.link": "/packages?q=chardham",

  "hero.eyebrow": "Ahmedabad's family travel desk",
  "hero.images": [
    { url: `${UNSPLASH}1595815771614-ade9d652a65d`, caption: "Dal Lake, Srinagar" },
    { url: `${UNSPLASH}1612438214708-f428a707dd4e`, caption: "Kedarnath, Uttarakhand" },
    { url: `${UNSPLASH}1602216056096-3b40cc0c9944`, caption: "Backwaters, Kerala" },
    { url: `${UNSPLASH}1544644181-1484b3fdfc62`, caption: "Ulun Danu, Bali" },
  ],

  "home.collections": [
    {
      title: "Pilgrimage",
      subtitle: "Chardham, Kedarnath, Kashi",
      image: `${UNSPLASH}1612438214708-f428a707dd4e`,
      query: "chardham",
    },
    {
      title: "Kashmir & the hills",
      subtitle: "Srinagar, Gulmarg, Manali, Shimla",
      image: `${UNSPLASH}1598091383021-15ddea10925d`,
      query: "kashmir",
    },
    {
      title: "Beaches & islands",
      subtitle: "Goa, Andaman, Maldives",
      image: `${UNSPLASH}1586500036706-41963de24d8b`,
      query: "beach",
    },
    {
      title: "Honeymoon",
      subtitle: "Bali, Maldives, Kerala",
      image: `${UNSPLASH}1514282401047-d79a71a590e8`,
      query: "honeymoon",
    },
    {
      title: "Heritage India",
      subtitle: "Rajasthan, Agra, Varanasi",
      image: `${UNSPLASH}1477587458883-47145ed94245`,
      query: "rajasthan",
    },
    {
      title: "Short-haul abroad",
      subtitle: "Dubai, Singapore, Thailand",
      image: `${UNSPLASH}1525625293386-3f8f99389edd`,
      category: "international",
    },
  ],

  "home.highlights": [
    {
      title: "One planner, start to finish",
      text: "The person who quotes your trip is the person you call from the hotel lobby. No call-centre hand-offs.",
    },
    {
      title: "Built around older travellers",
      text: "Pony and palki bookings on yatras, ground-floor rooms, pure-veg meal plans and slower days when you need them.",
    },
    {
      title: "Prices that hold",
      text: "Your quote lists what's included and what isn't. What we confirm in writing is what you pay.",
    },
    {
      title: "On call while you travel",
      text: "A WhatsApp line that's answered through the trip, including early-morning darshan days and late flights.",
    },
  ],

  "home.testimonials": [],

  // Google Business reviews. The Places API key lives in backend env (GOOGLE_PLACES_API_KEY).
  "google.showReviews": true,
  "google.placeId": "",

  "home.faqs": [
    {
      q: "What kind of trips do you plan?",
      a: "Domestic and international packages — Chardham Yatra, Kashmir, Goa, Rajasthan, Kerala, Andaman, Dubai, Singapore, Thailand, Vietnam, Nepal and Europe. We plan pilgrimages, honeymoons, family holidays, adventure trips and group tours.",
    },
    {
      q: "Can you customise a package?",
      a: "Yes — most of our trips are customised. Share your dates, budget and who's travelling, and we'll adjust hotels, pace, meals and sightseeing around you.",
    },
    {
      q: "How do I book?",
      a: "Send an enquiry on this site, call us, or message us on WhatsApp. A planner will share an itinerary and quote, and once you confirm we'll take a booking advance and send vouchers before you travel.",
    },
    {
      q: "What do packages usually start at?",
      a: "Domestic packages start at around ₹8,999 per person and international packages at around ₹19,999 per person. Prices depend on destination, duration, hotel category and season.",
    },
    {
      q: "Do you help with visas and travel insurance?",
      a: "Yes. We guide you through visa documentation for international trips and can add travel insurance to any booking.",
    },
  ],

  "about.heading": "A small team that *answers the phone.*",
  "about.body":
    "Satyam Holidays started in Ranip, Ahmedabad, planning yatras for families who wanted someone dependable on the other end of the line. That's still how we work: a small team, trips we've checked ourselves, and planners who stay with you from the first quote to the drive home.",
  "about.image": `${UNSPLASH}1571536802807-30451e3955d8`,
  "about.imageCaption": "The ghats at dusk, Varanasi",

  "legal.privacy":
    "## What we collect\nWhen you send an enquiry or write a review we collect your name, email address, phone number and the trip details you share. We also keep basic technical logs (IP address, browser) to protect the site from abuse.\n\n## How we use it\nWe use your details only to plan and quote your trip, contact you about it, and send booking documents. We do not sell your information.\n\n## Who we share it with\nTo make a booking we share the necessary details with hotels, transport operators, airlines and visa or insurance providers involved in your trip.\n\n## Your choices\nYou can ask us to update or delete your information at any time by emailing us. We keep booking records only as long as needed for accounting and legal requirements.\n\n## Contact\nQuestions about this policy can be sent to our email address listed on the Contact section.",
  "legal.terms":
    "## Quotes and bookings\nItineraries and prices shared before confirmation are estimates and may change with availability, season and supplier rates. A booking is confirmed only after we receive the advance payment and send a written confirmation.\n\n## Payments\nThe payment schedule for your trip is shared with your confirmation. Full payment is due before vouchers and tickets are issued.\n\n## Travel documents\nTravellers are responsible for carrying valid ID, passports, visas and any permits required for the destination.\n\n## Changes on the ground\nWeather, road closures, government orders and other events outside our control can change an itinerary. We will always try to offer the closest alternative.\n\n## Liability\nWe act as an agent for hotels, transport and other service providers and are not liable for their acts or omissions, though we will help you resolve any issue.",
  "legal.refund":
    "## Cancelling a booking\nCancellation requests must be sent to us in writing by email or WhatsApp.\n\n## Cancellation charges\nCharges depend on how close to departure you cancel and on the cancellation rules of the hotels, airlines and operators in your package. The applicable charges are listed in your booking confirmation.\n\n## Refunds\nAny refundable amount is processed to the original payment method after suppliers release their refunds, typically within 7–21 working days.\n\n## Non-refundable items\nFlight tickets, visa fees, insurance premiums and peak-date bookings are often non-refundable. These are marked in your confirmation.",
};

export default CONTENT_DEFAULTS;
