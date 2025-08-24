import axios from 'axios';

export const geocodePostcode = async (postcode) => {
  if (!postcode) return null;

  const trimmed = postcode.trim();
  try {
    const encoded = encodeURIComponent(trimmed);
    const geoRes = await axios.get(`https://api.postcodes.io/postcodes/${encoded}`);

    if (geoRes.data.status === 200 && geoRes.data.result) {
      const { longitude, latitude } = geoRes.data.result;
      return { coordinates: [longitude, latitude], postcode: trimmed };
    } else {
      return null;
    }
  } catch (err) {
    console.error(`Postcode API error: ${err.message}`);
    return null;
  }
};
