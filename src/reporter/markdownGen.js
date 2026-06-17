// src/reporter/markdownGen.js
const fs = require('fs');
const logger = require('../utils/logger');

function buildMarkdownReport() {
  try {
    const data = JSON.parse(fs.readFileSync('./data/compliance_report.json', 'utf-8'));
    let md = `# 🔍 WAIVERPRO APPLICATION COMPLIANCE AUDIT AUDIT REPORT\n\n`;
    md += `> **Disclaimer:** This assessment has been generated automatically via an autonomous agent pipeline executing automated verification processes utilizing dynamic LLM parsing logic. This acts as an engineering compliance indicator, not an end-to-end replacement for manual QA parameters.\n\n`;
    
    md += `## 📊 Executive Metadata Summary\n`;
    md += `- **Total Parameters Evaluated:** ${data.length}\n`;
    md += `- **Discrepancies Flagged:** ${data.filter(x => x.discrepancy_flag).length}\n`;
    md += `- **Application Status:** ${data.filter(x => x.discrepancy_flag).length > 0 ? '⚠️ VIOLATIONS DETECTED' : '✅ COMPLIANT'}\n\n`;
    
    md += `## 🚨 Discovered Non-Compliance Breakdowns\n\n`;

    const violations = data.filter(item => item.discrepancy_flag);

    if (violations.length === 0) {
      md += `### ✅ No layout or functional mismatches detected against documentation guidelines.`;
    } else {
      violations.forEach((violation, i) => {
        md += `### Violation #${i + 1}: Mismatch on Route \`${violation.page_url}\`\n`;
        md += `- **Component Type:** \`${violation.component_type}\`\n`;
        md += `- **Target DOM Selector:** \`${violation.component_selector}\`\n`;
        md += `- **Guideline Origin:** *${violation.guideline_reference}*\n`;
        md += `- **Expected String Payload:** \`"${violation.expected_text_content}"\`\n`;
        md += `- **Actual Application Output:** \`"${violation.actual_text_content}"\`\n\n`;
        md += `#### 🧠 Analysis and Reason:\n> ${violation.discrepancy_reason}\n\n`;
        md += `#### 📸 Evidence Capture:\n![Visual Capture](../${violation.screenshot_path})\n\n`;
        md += `---\n\n`;
      });
    }

    fs.writeFileSync('./COMPLIANCE_REPORT.md', md);
    logger.info('Human-readable presentation markdown file written directly to workspace Root as COMPLIANCE_REPORT.md');
  } catch (error) {
    logger.error(`Failed to construct production markdown presentation: ${error.message}`);
  }
}

module.exports = buildMarkdownReport;