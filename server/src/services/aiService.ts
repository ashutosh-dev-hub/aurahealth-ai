import { ENV } from '../config/env.js';

export interface PreVisitAnalysis {
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  chiefComplaint: string;
  suggestedQuestions: string[];
  rawResponse?: string;
  source: 'GEMINI' | 'OPENAI' | 'HEURISTIC_FALLBACK';
}

export interface PostVisitAnalysis {
  patientFriendlySummary: string;
  source: 'GEMINI' | 'OPENAI' | 'HEURISTIC_FALLBACK';
}

/**
 * Intelligent deterministic clinical rule engine for fallback when external LLM API is unavailable.
 */
function heuristicPreVisitAnalysis(symptoms: string, duration?: string): PreVisitAnalysis {
  const text = symptoms.toLowerCase();

  // High urgency indicators
  const highUrgencyKeywords = [
    'chest pain', 'shortness of breath', 'difficulty breathing', 'severe bleeding',
    'loss of consciousness', 'fainting', 'stroke', 'paralysis', 'sudden weakness',
    'severe head injury', 'heart attack', 'unbearable pain', 'suicidal', 'anaphylaxis',
    'coughing blood', 'vomiting blood', 'severe burns'
  ];

  // Medium urgency indicators
  const mediumUrgencyKeywords = [
    'fever', 'persistent cough', 'vomiting', 'diarrhea', 'moderate pain', 'abdominal pain',
    'infection', 'swelling', 'dizziness', 'migraine', 'blurred vision', 'rash',
    'earache', 'urinary pain', 'sprain', 'palpitations'
  ];

  let urgency: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (highUrgencyKeywords.some(k => text.includes(k))) {
    urgency = 'HIGH';
  } else if (mediumUrgencyKeywords.some(k => text.includes(k))) {
    urgency = 'MEDIUM';
  }

  // Extract Chief Complaint
  const sentences = symptoms.split(/[.\n;]+/).map(s => s.trim()).filter(Boolean);
  let chiefComplaint = sentences[0] || symptoms.slice(0, 100);
  if (chiefComplaint.length > 120) {
    chiefComplaint = chiefComplaint.slice(0, 117) + '...';
  }
  if (duration) {
    chiefComplaint += ` (Duration: ${duration})`;
  }

  // Dynamic suggested doctor questions based on symptoms
  const questions: string[] = [];
  if (text.includes('pain') || text.includes('ache')) {
    questions.push('Can you describe the pain on a scale of 1-10 and what makes it better or worse?');
    questions.push('Does the pain radiate to other parts of your body?');
  } else {
    questions.push('When exactly did you first notice these symptoms and have they worsened?');
    questions.push('Have you noticed any associated triggers or relieving factors?');
  }

  if (text.includes('fever') || text.includes('temperature') || text.includes('chills')) {
    questions.push('Have you measured your body temperature, and are you experiencing chills or night sweats?');
  } else if (text.includes('cough') || text.includes('breath') || text.includes('throat')) {
    questions.push('Are you producing any phlegm or experiencing difficulty taking deep breaths?');
  } else if (text.includes('stomach') || text.includes('nausea') || text.includes('digest')) {
    questions.push('Are you able to keep fluids and food down without nausea?');
  } else {
    questions.push('Are you currently taking any prescription medications or over-the-counter supplements?');
  }

  if (questions.length < 3) {
    questions.push('Have you experienced similar episodes in the past or have a relevant family history?');
  }

  return {
    urgencyLevel: urgency,
    chiefComplaint,
    suggestedQuestions: questions.slice(0, 3),
    rawResponse: 'Deterministic clinical heuristic triage analysis applied.',
    source: 'HEURISTIC_FALLBACK',
  };
}

/**
 * Intelligent deterministic clinical summary generator for fallback.
 */
function heuristicPostVisitSummary(
  clinicalNotes: string,
  diagnosis: string,
  prescriptions: Array<{ medicineName: string; dosage: string; frequency: string; days: number; instructions?: string }>,
  followUpDate?: string
): PostVisitAnalysis {
  let summary = `### Consultation Summary & Care Plan\n\n`;
  summary += `**Diagnosis:** ${diagnosis || 'Clinical evaluation completed'}\n\n`;
  summary += `**Doctor's Assessment:**\n${clinicalNotes}\n\n`;

  if (prescriptions && prescriptions.length > 0) {
    summary += `**Medication Schedule:**\n`;
    prescriptions.forEach((rx, idx) => {
      summary += `${idx + 1}. **${rx.medicineName}** (${rx.dosage}) - Take **${rx.frequency}** for **${rx.days} days**${rx.instructions ? ` (${rx.instructions})` : ''}.\n`;
    });
    summary += `\n*Tip: Set reminders on your patient dashboard to stay consistent with your schedule.*\n\n`;
  }

  summary += `**Next Steps & Precautions:**\n`;
  summary += `- Rest adequately and maintain proper hydration.\n`;
  if (followUpDate) {
    summary += `- Schedule your follow-up visit on or before **${new Date(followUpDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**.\n`;
  } else {
    summary += `- If symptoms persist or worsen over the next 48-72 hours, please book a follow-up consultation.\n`;
  }
  summary += `- Seek emergency medical care immediately if you experience shortness of breath, severe chest pressure, or high persistent fever.\n`;

  return {
    patientFriendlySummary: summary,
    source: 'HEURISTIC_FALLBACK',
  };
}

/**
 * Generates Pre-Visit AI Summary with Urgency Triage and Doctor Questions.
 */
export async function generatePreVisitSummary(symptoms: string, duration?: string): Promise<PreVisitAnalysis> {
  const prompt = `You are an expert AI clinical triage assistant.
Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor.
Symptoms: ${symptoms}
Duration: ${duration || 'Not specified'}

Respond ONLY with valid JSON in this exact structure without markdown or backticks:
{
  "urgencyLevel": "LOW" | "MEDIUM" | "HIGH",
  "chiefComplaint": "Concise 1-sentence summary of the main issue",
  "suggestedQuestions": [
    "Diagnostic question 1",
    "Diagnostic question 2",
    "Diagnostic question 3"
  ]
}`;

  // Try Gemini API if configured
  if (ENV.GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (response.ok) {
        const data: any = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            urgencyLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.urgencyLevel?.toUpperCase())
              ? parsed.urgencyLevel.toUpperCase()
              : 'MEDIUM',
            chiefComplaint: parsed.chiefComplaint || symptoms.slice(0, 100),
            suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
              ? parsed.suggestedQuestions.slice(0, 3)
              : [],
            rawResponse: content,
            source: 'GEMINI',
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to next provider / heuristic:', err);
    }
  }

  // Try OpenAI API if configured
  if (ENV.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            urgencyLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.urgencyLevel?.toUpperCase())
              ? parsed.urgencyLevel.toUpperCase()
              : 'MEDIUM',
            chiefComplaint: parsed.chiefComplaint || symptoms.slice(0, 100),
            suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
              ? parsed.suggestedQuestions.slice(0, 3)
              : [],
            rawResponse: content,
            source: 'OPENAI',
          };
        }
      }
    } catch (err) {
      console.warn('OpenAI API call failed, falling back to heuristic engine:', err);
    }
  }

  // Safe fallback
  return heuristicPreVisitAnalysis(symptoms, duration);
}

/**
 * Generates Post-Visit Patient-Friendly Summary from Clinical Notes.
 */
export async function generatePostVisitSummary(
  clinicalNotes: string,
  diagnosis: string,
  prescriptions: Array<{ medicineName: string; dosage: string; frequency: string; days: number; instructions?: string }>,
  followUpDate?: string
): Promise<PostVisitAnalysis> {
  const prompt = `You are an empathetic medical communicator.
Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps:
Diagnosis: ${diagnosis}
Clinical Notes: ${clinicalNotes}
Prescriptions: ${JSON.stringify(prescriptions)}
Follow-up Date: ${followUpDate || 'As needed'}

Write in clear, compassionate, easy-to-understand language. Format with clear Markdown headings for Summary, Medications, and Follow-up Precautions.`;

  if (ENV.GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (response.ok) {
        const data: any = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          return { patientFriendlySummary: content, source: 'GEMINI' };
        }
      }
    } catch (err) {
      console.warn('Gemini post-visit summary failed, falling back to heuristic:', err);
    }
  }

  if (ENV.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return { patientFriendlySummary: content, source: 'OPENAI' };
        }
      }
    } catch (err) {
      console.warn('OpenAI post-visit summary failed, falling back to heuristic:', err);
    }
  }

  return heuristicPostVisitSummary(clinicalNotes, diagnosis, prescriptions, followUpDate);
}
