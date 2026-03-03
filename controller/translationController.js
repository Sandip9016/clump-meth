const translationService = require("../services/translationService");

async function translate(req, res) {
  try {
    const { pageContent, targetLanguage } = req.body;

    if (!pageContent || !targetLanguage) {
      return res
        .status(400)
        .json({ error: "Missing pageContent or targetLanguage" });
    }

    const translatedContent = await translationService.translatePageContent(
      pageContent,
      targetLanguage,
    );
    res.json({ translatedContent });
  } catch (err) {
    console.error("Translation Controller Error:", err.message);
    res.status(500).json({ error: "Translation failed" });
  }
}

module.exports = {
  translate,
};
