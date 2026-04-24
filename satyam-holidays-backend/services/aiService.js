const logger = require("../utils/logger");

class AiService {
  async generateItinerary({
    destination,
    duration,
    travelers = "2",
    interests = "Leisure, sightseeing",
  }) {
    const apiKey = process.env.GEMINI_API_KEY;
    const days = parseInt(duration) || 5;

    if (!apiKey) {
      logger.info("[aiService] GEMINI_API_KEY missing, using mock itinerary engine");
      return this.generateMockItinerary(destination, days, travelers, interests);
    }

    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const ai = new GoogleGenerativeAI(apiKey);

      // Use gemini-2.5-flash with a fallback to gemini-1.5-flash
      let model;
      try {
        model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
      } catch (err) {
        logger.warn(
          `[aiService] Model gemini-2.5-flash not available, falling back to gemini-1.5-flash: ${err.message}`
        );
        model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      }

      const prompt = `You are an expert travel planner for Satyam Holidays.
Create a highly personalized, detailed, and beautiful day-by-day travel itinerary for:
- Destination: ${destination}
- Duration: ${days} Days
- Travelers count: ${travelers}
- Client Interests: ${interests}

Your output must be a valid JSON object matching the following structural shape. Do NOT wrap the output in markdown block (no \`\`\`json) - output ONLY the raw JSON string:
{
  "destination": "${destination}",
  "duration": "${days} Days",
  "title": "A Memorable Journey to ${destination}",
  "summary": "Short 2-3 sentence overview of what makes this customized trip special.",
  "itinerary": [
    {
      "day": 1,
      "title": "Day 1 Title",
      "description": "Short summary overview of the theme or objective of this specific day.",
      "morning": "Detailed activities, locations visited, sightseeing, and experiences planned for the morning block.",
      "afternoon": "Detailed lunch recommendations, afternoon activities, travels, or guided tours.",
      "evening": "Evening relaxation plans, special dinners, local shows, night walks, or free leisure time.",
      "activity": "Highlight activity of the day",
      "meals": ["Breakfast", "Dinner"]
    }
  ],
  "travelTips": [
    "Useful travel tip 1 specific to this destination",
    "Useful travel tip 2",
    "Useful travel tip 3"
  ],
  "estimatedCostInfo": "Budget-friendly estimate in INR based on travelers and destination details."
}

Ensure all JSON keys and strings are fully escaped and valid. Make sure to generate exactly ${days} day elements in the itinerary array.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Robust JSON extraction from the LLM text response
      let cleanJson = text;
      const markdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
      if (markdownMatch && markdownMatch[1]) {
        cleanJson = markdownMatch[1].trim();
      } else {
        const genericMatch = text.match(/```\s*([\s\S]*?)\s*```/);
        if (genericMatch && genericMatch[1]) {
          cleanJson = genericMatch[1].trim();
        } else {
          const startIdx = text.indexOf("{");
          const endIdx = text.lastIndexOf("}");
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            cleanJson = text.substring(startIdx, endIdx + 1).trim();
          }
        }
      }

      const parsed = JSON.parse(cleanJson);
      logger.info(`[aiService] Itinerary successfully generated via Gemini for ${destination}`);
      return parsed;
    } catch (error) {
      logger.error(`[aiService] Gemini call failed, falling back to mock: ${error.message}`);
      return this.generateMockItinerary(destination, days, travelers, interests);
    }
  }

  generateMockItinerary(destination, days, travelers, interests) {
    logger.debug(`[aiService] Generating mock itinerary for ${destination} (${days} days)`);

    const lowercaseDest = destination.toLowerCase();

    // Default fallback values
    let title = `${days}-Day Explorer Trip to ${destination}`;
    let summary = `Enjoy a carefully crafted journey through the highlight spots of ${destination}, tailored for ${travelers} traveler(s) interested in ${interests}.`;
    let travelTips = [
      "Carry local currency cash for small vendors.",
      "Dress comfortably according to the seasonal weather.",
      "Keep digital copies of all your travel booking vouchers.",
    ];
    let estimatedCostInfo = `Estimated starting from ₹${(days * 4500 * parseInt(travelers || 2)).toLocaleString("en-IN")} for ${travelers} travelers (Excludes flights).`;

    const itinerary = [];

    // Destination-specific mock data
    if (lowercaseDest.includes("kashmir")) {
      title = `${days}-Day Heavenly Kashmir Tour`;
      summary = `Experience the stunning beauty of Paradise on Earth. Cruise on Dal Lake, stroll through historical Mughal Gardens, and witness the snowy peaks of Gulmarg and Sonamarg.`;
      travelTips = [
        "Take a Shikara ride during sunset for the best photos.",
        "Buy authentic saffron and walnuts from government-authorized shops in Pampore.",
        "Prepaid sim cards from outside Jammu & Kashmir will not work; secure a postpaid connection.",
      ];
      estimatedCostInfo = `Estimated Package: ₹${(22000 * parseInt(travelers || 2)).toLocaleString("en-IN")} onwards (Includes houseboat, transfers, and hotels).`;
    } else if (lowercaseDest.includes("dubai")) {
      title = `${days}-Day Glitz & Glamour Dubai Getaway`;
      summary = `Explore the ultra-modern city of Dubai. Enjoy spectacular views from Burj Khalifa, shop at Dubai Mall, experience a thrilling Desert Safari, and walk through the historic Gold Souk.`;
      travelTips = [
        "Use the Dubai Metro to beat the traffic and travel cost-effectively.",
        "Book Burj Khalifa observation deck tickets online in advance to secure sunset slots.",
        "Dress modestly when visiting public places and holy sites.",
      ];
      estimatedCostInfo = `Estimated Package: ₹${(45000 * parseInt(travelers || 2)).toLocaleString("en-IN")} onwards (Includes Desert Safari, Dhow cruise, city tour, and 4-star stay).`;
    } else if (lowercaseDest.includes("chardham")) {
      title = `${days}-Day Divine Chardham Yatra`;
      summary = `A spiritual pilgrimage covering Yamunotri, Gangotri, Kedarnath, and Badrinath. Seek blessings amidst the majestic Himalayan ranges.`;
      travelTips = [
        "Complete your biometric registration online prior to travel.",
        "Carry warm woollen clothing, raincoats, and comfortable hiking boots.",
        "Keep portable oxygen canisters if you are prone to altitude sickness.",
      ];
      estimatedCostInfo = `Estimated Package: ₹${(32000 * parseInt(travelers || 2)).toLocaleString("en-IN")} onwards (Includes bi-di daily transport, local guide assistance, and standard accommodation).`;
    }

    const dailyActivities = [
      {
        title: "Arrival & Welcome",
        desc: "Arrive at the destination airport or transit hub, meet our representative, and transfer to your pre-booked premium hotel to settle in and enjoy a relaxing welcome dinner.",
        morning:
          "Arrive at the destination airport/station. Meet with our dedicated local representative who will assist you with your luggage and guide you to your private transfer vehicle.",
        afternoon:
          "Scenic transfer and check-in to your hand-picked premium hotel. Enjoy a warm welcome drink and spend time settling into your room or exploring the property.",
        evening:
          "Meet your guide for a brief trip orientation. Conclude the day with a delicious welcome dinner hosted at the hotel's specialty restaurant.",
        activity: "Leisurely hotel check-in and welcome dinner",
        meals: ["Dinner"],
      },
      {
        title: "City Highlights & Local Sightseeing",
        desc: "Embark on a guided heritage sightseeing tour covering major historical sites, iconic structures, and local handicraft markets.",
        morning:
          "Begin your guided heritage sightseeing. Explore the iconic monuments, marvel at local architectural wonders, and walk through scenic paths filled with history.",
        afternoon:
          "Enjoy a traditional lunch at a top culinary spot. Afterward, stroll through the vibrant local bazaars and watch local artisans at work.",
        evening:
          "Head to a panoramic viewpoint or promenade to watch a majestic sunset. Spend the late evening relaxing at a cozy cafe or returning to the resort.",
        activity: "Guided heritage sightseeing walking tour",
        meals: ["Breakfast", "Lunch"],
      },
      {
        title: "Scenic Excursion & Nature Trail",
        desc: "Take an excursion to a nearby scenic valley, beach, or nature park to enjoy outdoor exploration and regional delicacies.",
        morning:
          "Embark on an exciting nature excursion to a nearby scenic valley, beach, or national park. Hike through serene trails and breathe in the fresh morning air.",
        afternoon:
          "Relish a picnic-style lunch or dine at a rustic local eatery. Continue exploring the natural landscape, waterfalls, or enjoying optional water sports.",
        evening:
          "Return to the resort. Unwind with premium recreational facilities, take a dip in the pool, and enjoy a curated dinner featuring regional delicacies.",
        activity: "Nature hike and photography session",
        meals: ["Breakfast", "Dinner"],
      },
      {
        title: "Adventure & Cultural Experience",
        desc: "Dedicate the day to unique local adventures, traditional art forms, local cuisine workshops, and cultural performances.",
        morning:
          "Participate in an immersive cultural workshop. Try your hand at local crafts, attend a cooking demo, or watch a traditional music and dance demonstration.",
        afternoon:
          "Indulge in a local street-food tour or local market exploration guided by a culinary expert, sampling unique flavors and shopping for rare spices.",
        evening:
          "Enjoy a festive cultural theme night at the hotel or a famous local cultural center, complete with folk performances and a multi-course dinner.",
        activity: "Cultural workshop and local craft experience",
        meals: ["Breakfast", "Lunch"],
      },
      {
        title: "Shopping & Departure Prep",
        desc: "Spend a free morning shopping for souvenirs, checking out, and taking a private transfer back to the transit hub.",
        morning:
          "Enjoy a leisurely morning. Sleep in, take advantage of the hotel's luxury amenities, or run a few last-minute shopping errands in the local street markets.",
        afternoon:
          "Check out from your hotel. Enjoy a comfortable private transfer to the airport or train station, ensuring you arrive well in time for your return transit.",
        evening:
          "Depart for your home destination carrying unforgettable memories of your personalized holiday experience with Satyam Holidays.",
        activity: "Local bazaar shopping and departure transfer",
        meals: ["Breakfast"],
      },
    ];

    for (let d = 1; d <= days; d++) {
      const template = dailyActivities[(d - 1) % dailyActivities.length];
      itinerary.push({
        day: d,
        title: `Day ${d}: ${template.title}`,
        description: template.desc.replace(/destination/g, destination),
        morning: template.morning.replace(/destination/g, destination),
        afternoon: template.afternoon.replace(/destination/g, destination),
        evening: template.evening.replace(/destination/g, destination),
        activity: template.activity,
        meals: template.meals,
      });
    }

    return {
      destination,
      duration: `${days} Days`,
      title,
      summary,
      itinerary,
      travelTips,
      estimatedCostInfo,
    };
  }
}

module.exports = new AiService();
