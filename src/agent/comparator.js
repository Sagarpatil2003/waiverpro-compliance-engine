// src/agent/comparator.js
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const logger = require('../utils/logger');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function runComplianceAudit() {
  try {
    logger.info('Loading structural matrices for cross-examination verification...');
    const ruleData = JSON.parse(fs.readFileSync('./data/rules.json', 'utf-8'));
    const uiData = JSON.parse(fs.readFileSync('./data/raw_ui.json', 'utf-8'));

    const rules = ruleData.rules || ruleData;
    const finalReports = [];

    logger.info(`Beginning AI comparison loop against ${rules.length} baseline guidelines.`);

    for (const rule of rules) {
      // Find elements matching the current target route and category type
      const matchedLiveElements = uiData.filter(ui => 
        ui.page_url === rule.page_url && ui.component_type === rule.component_type
      );

      // System prompt mapping expectations against current live array context
      const verificationPayload = {
        guideline: rule,
        live_elements_found: matchedLiveElements
      };

      const agentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an automated software compliance testing system. Compare the expected corporate guideline requirement against the actual components extracted live via Playwright browser operations. Determine if the application violates or correctly matches standard expectations.\n\nContext Payload:\n${JSON.stringify(verificationPayload, null, 2)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              discrepancy_flag: { type: 'BOOLEAN' },
              discrepancy_reason: { type: 'STRING', description: 'Clear technical breakdown of the UI or copy mismatch text. If match is true, return empty string.' },
            },
            required: ['discrepancy_flag', 'discrepancy_reason']
          }
        }
      });

      const auditDecision = JSON.parse(agentResponse.text);

      // Merge into canonical structure requirements defined by challenge documentation
      finalReports.push({
        page_url: rule.page_url,
        component_type: rule.component_type,
        component_selector: matchedLiveElements[0]?.component_selector || 'NOT_FOUND',
        actual_text_content: matchedLiveElements[0]?.actual_text_content || 'ELEMENT_ABSENT',
        expected_text_content: rule.expected_text_content,
        guideline_reference: rule.guideline_reference,
        discrepancy_flag: auditDecision.discrepancy_flag,
        discrepancy_reason: auditDecision.discrepancy_reason,
        screenshot_path: matchedLiveElements[0]?.screenshot_path || 'None',
        retrieved_at: matchedLiveElements[0]?.retrieved_at || new Date().toISOString()
      });
    }

    fs.writeFileSync('./data/compliance_report.json', JSON.stringify(finalReports, null, 2));
    logger.info('Compliance audit complete. Results saved to ./data/compliance_report.json');

  } catch (error) {
    logger.error(`Fatal failure inside the Comparison Agent Loop: ${error.message}`);
  }
}

module.exports = runComplianceAudit;