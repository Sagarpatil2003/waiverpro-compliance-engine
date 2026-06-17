// src/parser/pdfParser.js
const fs = require('fs');
// Option A: Explicit fallback assignment logic
let pdf = require('pdf-parse');
if (typeof pdf !== 'function' && pdf.default) {
    pdf = pdf.default;
}

const { GoogleGenAI } = require('@google/genai');
const logger = require('../utils/logger');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function parseGuidelines(pdfPath) {
  try {
    logger.info(`Starting ingestion of PDF: ${pdfPath}`);
    
    if (!fs.existsSync(pdfPath)) {
        throw new Error(`Target PDF file missing at path location: ${pdfPath}`);
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Execute module function safely
    const parsedPdf = await pdf(dataBuffer);
    
    logger.info('PDF text extracted. Leveraging Gemini to build canonical rules...');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this application manual and extract all strict UI, layout, functional text guidelines, and required menu items into a clean structural array: \n\n ${parsedPdf.text}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            rules: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  page_url: { type: 'STRING', description: 'The expected route like /dashboard or /login' },
                  component_type: { type: 'STRING', description: 'button, input, nav_item, text_block' },
                  expected_text_content: { type: 'STRING' },
                  guideline_reference: { type: 'STRING', description: 'The exact Section or Paragraph identifier text found in the document' }
                },
                required: ['page_url', 'component_type', 'expected_text_content', 'guideline_reference']
              }
            }
          }
        }
      }
    });

    const structuredRules = typeof response.text === 'string' ? response.text : JSON.stringify(response.text);
    
    if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data');
    }
    
    fs.writeFileSync('./data/rules.json', structuredRules);
    logger.info('Successfully generated and saved tokens to ./data/rules.json');
  } catch (error) {
    logger.error(`Failed to execute PDF Parser phase: ${error.message}`);
  }
}

module.exports = parseGuidelines;