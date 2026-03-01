import { appStorage } from './storage'
import { AI_LIMITS } from '@shared/lib/constants'

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  const result = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!result) throw new Error('No response returned from Gemini')
  return result
}

export async function summarizeText(text: string): Promise<string> {
  return callGemini(`Summarize the following note concisely in a few sentences:\n\n${text}`)
}

export async function fixGrammar(text: string): Promise<string> {
  return callGemini(
    `Fix the grammar, spelling, and punctuation of the following text. Return ONLY the corrected text, no explanations or extra commentary:\n\n${text}`
  )
}

export async function fixCode(code: string, language: string): Promise<string> {
  return callGemini(
    `Fix bugs, errors, and issues in the following ${language} code. Return ONLY the corrected code, no explanations, no markdown fences, no commentary:\n\n${code}`
  )
}

export async function transcribeAudioBase64(base64: string, mimeType: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: 'Transcribe this audio recording accurately. Return ONLY the transcribed text, no explanations or extra commentary.' },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  const result = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!result) throw new Error('No transcription returned from Gemini')
  return result
}

export async function transcribeWithSpeakersBase64(base64: string, mimeType: string): Promise<{
  transcript: string
  segments: { speaker: string; text: string }[]
}> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: `Transcribe this audio recording with speaker identification.
Return a JSON object with this exact structure:
{"transcript": "Full transcription as plain text", "segments": [{"speaker": "Speaker 1", "text": "What they said"}, {"speaker": "Speaker 2", "text": "What they said"}]}
If only one speaker, use "Speaker 1". Return ONLY the JSON, no markdown fences.` },
        ],
      }],
    }),
  })
  if (!res.ok) { const err = await res.text(); throw new Error(`Gemini API error: ${res.status} ${err}`) }
  const data = await res.json()
  const result = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!result) throw new Error('No transcription returned from Gemini')
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { transcript: result, segments: [{ speaker: 'Speaker 1', text: result }] }
  }
}

export async function generateTranscriptSummary(text: string, tone = 'professional', length = 'medium'): Promise<string> {
  const count = length === 'short' ? '3-5' : length === 'long' ? '10-15' : '5-8'
  return callGemini(`Summarize the following transcript as ${count} concise bullet points in a ${tone} tone. Use markdown bullet format (- ).\n\nTranscript:\n${text}`)
}

export async function extractActionItems(text: string): Promise<string> {
  return callGemini(`Extract all action items, tasks, decisions, and follow-ups from this transcript. Format each as a markdown checkbox:\n- [ ] Action item description (assigned to: Person, if mentioned)\n\nIf no clear action items exist, respond with "No action items identified."\n\nTranscript:\n${text}`)
}

export async function generateMeetingNotes(text: string, agenda: string[] = []): Promise<string> {
  const agendaSection = agenda.length > 0 ? `\nAgenda items: ${agenda.join(', ')}\n` : ''
  return callGemini(`Generate structured meeting notes from this transcript.${agendaSection}\n\nFormat:\n## Key Discussion Points\n- Point 1\n\n## Decisions Made\n- Decision 1\n\n## Action Items\n- [ ] Action 1\n\n## Next Steps\n- Step 1\n\nTranscript:\n${text}`)
}

export async function generateEmail(subject: string, context: string, tone: string): Promise<string> {
  return callGemini(`Write a ${tone} email about the following subject.\n\nSubject: ${subject}\nContext/Details: ${context}\n\nInclude a subject line, greeting, body, and sign-off. Return only the email text.`)
}

export async function generateMessage(context: string, tone: string): Promise<string> {
  return callGemini(`Write a ${tone} message based on the following context.\n\nContext: ${context}\n\nKeep it appropriate for the tone. Return only the message text.`)
}

export async function generateFollowUp(title: string, participants: string[], notes: string, tone = 'professional'): Promise<string> {
  return callGemini(`Generate a ${tone} follow-up email for a meeting.\n\nMeeting: ${title}\nParticipants: ${participants.join(', ')}\n\nContent:\n${notes}\n\nFormat as a complete email with subject line, greeting, meeting recap, key decisions, action items with owners, next steps, and sign-off. Return ONLY the email text.`)
}

// Daily usage tracking (async version of web's localStorage)
function todayKey(feature: string, userId: string): string {
  return `criptnote-${feature}-${userId}-${new Date().toISOString().slice(0, 10)}`
}

export async function getDailyUsage(feature: string, userId: string, limit: number): Promise<{ used: number; remaining: number }> {
  const stored = await appStorage.get(todayKey(feature, userId))
  const used = stored ? parseInt(stored, 10) : 0
  return { used, remaining: Math.max(0, limit - used) }
}

export async function addDailyUsage(feature: string, userId: string, amount: number): Promise<void> {
  const stored = await appStorage.get(todayKey(feature, userId))
  const used = stored ? parseInt(stored, 10) : 0
  await appStorage.set(todayKey(feature, userId), String(used + amount))
}

export async function getCodeFixUsage(userId: string) { return getDailyUsage('codefix', userId, AI_LIMITS.codefix.daily) }
export async function addCodeFixUsage(userId: string, lines: number) { return addDailyUsage('codefix', userId, lines) }

export { AI_LIMITS }
