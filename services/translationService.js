const translate = require("@iamtraction/google-translate");

/**
 * Recursively translate all string values in a JSON object
 */
async function translateObject(obj, targetLang) {
  if (typeof obj === "string") {
    try {
      const res = await translate(obj, { to: targetLang });
      return res.text;
    } catch (err) {
      console.error("Translation error for string:", obj, err.message);
      return obj; // fallback to original text if translation fails
    }
  } else if (Array.isArray(obj)) {
    return Promise.all(obj.map((item) => translateObject(item, targetLang)));
  } else if (typeof obj === "object" && obj !== null) {
    const result = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = await translateObject(obj[key], targetLang);
      }
    }
    return result;
  } else {
    return obj; // numbers, booleans, null stay as-is
  }
}

async function translatePageContent(pageContent, targetLanguage) {
  return translateObject(pageContent, targetLanguage);
}

module.exports = {
  translatePageContent,
};
