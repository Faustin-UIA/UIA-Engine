async function testImport() {
  try {
    // Option 1
    const { MistralClient } = await import("@mistralai/mistralai");
    console.log("✅ Option 1 : MistralClient importé avec succès !");
    console.log("Type de MistralClient :", typeof MistralClient);
  } catch (e) {
    console.error("❌ Option 1 échouée :", e.message);
    try {
      // Option 2
      const mistralModule = await import("@mistralai/mistralai");
      const MistralClient = mistralModule.MistralClient;
      console.log("✅ Option 2 : MistralClient importé avec succès !");
      console.log("Type de MistralClient :", typeof MistralClient);
    } catch (e) {
      console.error("❌ Option 2 échouée :", e.message);
      try {
        // Option 3
        const mistralModule = await import("@mistralai/mistralai");
        const MistralClient = mistralModule.default;
        console.log("✅ Option 3 : MistralClient importé avec succès !");
        console.log("Type de MistralClient :", typeof MistralClient);
      } catch (e) {
        console.error("❌ Option 3 échouée :", e.message);
      }
    }
  }
}

testImport();
