import { gameRequest, type GameState } from "../game";
import { currentState, enqueue, providers } from "../jobs";
import { speechStatus, transcribe } from "../providers/speech";
import { store } from "../store";
import type { AmbientDecisionRecord, JobRecord, TranscriptRecord } from "../schema";
import type { components } from "../../../../packages/contracts/src/game";
import { classifyWindow, confirmWindow, usableInput, type MomentContext, type MomentEvaluation } from "./classifier";

type Audio = components["schemas"]["VoiceSegment"];
let runId = "";
let audio: Audio[] = [];
let transcribing = false;
let deciding = false;
let polling = false;
let lastInputId = "";
let lastDecisionAt = 0;
let cooldownUntil = 0;

function activeState() {
  const { snapshot, error } = currentState();
  return !error && snapshot?.runId && snapshot.host && snapshot.phase !== "ended" && snapshot.settings.enabled ? snapshot : undefined;
}
function eligibleCards(state: GameState) {
  const pending = store.all<JobRecord>("jobs", state.runId).filter(job =>
    job.kind === "card" && ["queued", "running", "ready"].includes(job.status));
  return state.cards.filter(card => card.pile === "Deck" && !(card.wildcard && card.resolved) &&
    ["Basic", "Common", "Uncommon", "Rare"].includes(card.rarity) &&
    (state.settings.mode === "living-deck" || card.wildcard) && !pending.some(job => job.instanceId === card.id));
}
export function conversationContext(state: GameState, records: TranscriptRecord[], canCreateCard: boolean, now = Date.now()): MomentContext {
  const focusStart = now - 15000;
  const start = now - 120000;
  const words = records.filter(record => record.runId === state.runId && !record.error &&
    Date.parse(record.endedAt ?? record.createdAt) >= start && Date.parse(record.endedAt ?? record.createdAt) <= now &&
    (record.noiseProbability ?? 0) < 0.5 && (record.accidentalProbability ?? 0) < 0.5)
    .map(record => ({ id: record.id, playerId: record.playerId ?? "", playerName: record.playerName ?? record.source,
      text: record.text, startedAt: record.startedAt ?? record.createdAt, endedAt: record.endedAt ?? record.createdAt }))
    .sort((a, b) => Date.parse(a.endedAt) - Date.parse(b.endedAt) || a.id.localeCompare(b.id));
  return {
    conversation: { startedAt: new Date(start).toISOString(), endedAt: new Date(focusStart).toISOString(),
      transcript: words.filter(segment => Date.parse(segment.endedAt) < focusStart) },
    focus: { startedAt: new Date(focusStart).toISOString(), endedAt: new Date(now).toISOString(),
      transcript: words.filter(segment => Date.parse(segment.endedAt) >= focusStart) },
    game: { phase: state.phase, turn: state.turn, creatures: state.creatures,
      deck: state.cards.filter(card => card.pile === "Deck").map(({ name, rarity, type, cost, description, playerId, playerName }) =>
        ({ name, rarity, type, cost, description, playerId, playerName })),
      hand: state.cards.filter(card => card.pile === "Hand").map(({ name, rarity, type, cost, description, playerId, playerName }) =>
        ({ name, rarity, type, cost, description, playerId, playerName })) },
    canCreateCard,
  };
}
function saveInputProbabilities(evaluation: MomentEvaluation, expectedRun: string) {
  for (const input of evaluation.inputs) {
    const record = store.get<TranscriptRecord>("transcripts", input.id);
    if (record?.runId === expectedRun) store.put("transcripts", { ...record,
      noiseProbability: input.answers.noise.noul, accidentalProbability: input.answers.accidental.noul }, expectedRun);
  }
}
async function decodeNext() {
  if (transcribing || !audio.length || !speechStatus().ready) return;
  const segment = audio.shift()!;
  if (segment.runId !== runId || Date.parse(segment.endedAt) < Date.now() - 15000) return;
  transcribing = true;
  try {
    const pcm = Buffer.from(segment.pcmBase64, "base64");
    if (pcm.length % 2 || pcm.length > 16000 * 2 * 8) throw new Error("Invalid microphone audio length.");
    const samples = new Float32Array(pcm.length / 2);
    for (let n = 0; n < samples.length; n++) samples[n] = pcm.readInt16LE(n * 2) / 32768;
    const text = (await transcribe(samples)).trim();
    if (!text || activeState()?.runId !== segment.runId) return;
    store.put("transcripts", { id: segment.id, runId: segment.runId, playerId: segment.playerId, playerName: segment.playerName,
      text, startedAt: segment.startedAt, endedAt: segment.endedAt, source: "microphone", mood: "", createdAt: segment.endedAt }, segment.runId);
  } catch (error) {
    store.put("transcripts", { id: segment.id, runId: segment.runId, playerId: segment.playerId, playerName: segment.playerName,
      text: "", error: String(error), startedAt: segment.startedAt, endedAt: segment.endedAt,
      source: "microphone", mood: "", createdAt: segment.endedAt }, segment.runId);
  } finally { transcribing = false; }
}
async function decide(input: MomentContext, expectedRun: string) {
  deciding = true;
  lastDecisionAt = Date.now();
  const record: AmbientDecisionRecord = {
    id: crypto.randomUUID(), runId: expectedRun, at: new Date().toISOString(), action: "ignore", reason: "",
    anchorId: input.focus.transcript.at(-1)!.id, transcriptIds: input.focus.transcript.map(segment => segment.id),
    contextIds: input.conversation.transcript.map(segment => segment.id),
    windowStartedAt: input.focus.startedAt, windowEndedAt: input.focus.endedAt, classifier: null, confirmation: null,
  };
  try {
    record.classifier = (await classifyWindow(input, `ambient/${record.id}/classify`)).evaluation;
    saveInputProbabilities(record.classifier, expectedRun);
    const usableIds = new Set(record.classifier.inputs.filter(usableInput).map(segment => segment.id));
    if (!usableIds.size) record.reason = "Skipped noise or accidental audio.";
    else if (!input.canCreateCard) record.reason = "No card is available to transform.";
    else if (record.classifier.answers.create_card.noul < 0.95) record.reason = "Below the 95% trigger threshold.";
    else if (Date.now() < cooldownUntil) record.reason = "Waiting between card changes.";
    else if (activeState()?.runId !== expectedRun) record.reason = "The run ended before evaluation finished.";
    else {
      // Astra receives original kept words, without Luna scores, interpretations, or prior decisions.
      const focus = input.focus.transcript.filter(segment => usableIds.has(segment.id));
      const cleanInput = { ...input, focus: { ...input.focus, transcript: focus } };
      record.confirmation = (await confirmWindow(cleanInput, eligibleCards(activeState()!), `ambient/${record.id}/confirm`)).decision;
      if (record.confirmation.answers.create_card.noul < 0.90) record.reason = "Below the 90% confirmation threshold.";
      else {
        const state = activeState();
        const available = state && state.runId === expectedRun ? eligibleCards(state) : [];
        const target = available.find(card => card.id === record.confirmation!.instanceId);
        if (!state || !target || Date.now() - Date.parse(input.focus.endedAt) > 45000)
          record.reason = "The run, available cards, or conversation changed.";
        else {
          const job = enqueue(target.id);
          store.put("card-inspirations", { id: job.id, source: "ambient",
            conversation: input.conversation, focus: { ...input.focus, transcript: focus } }, expectedRun);
          cooldownUntil = Date.now() + 45000;
          record.action = "create_card";
          record.reason = "Card queued.";
        }
      }
    }
  } catch (error) { record.reason = String(error); }
  finally {
    record.at = new Date().toISOString();
    store.put("moment-evaluations", record, expectedRun);
    deciding = false;
  }
}
export async function ambientTick() {
  if (polling) return;
  polling = true;
  try {
    const state = activeState();
    if (state?.runId !== runId) {
      runId = state?.runId ?? "";
      audio = []; lastInputId = ""; cooldownUntil = 0;
    }
    if (!state) return;
    const segments = await gameRequest<Audio[]>("/voice/segments", "POST");
    audio.push(...segments.filter(segment => segment.runId === runId));
    audio = audio.slice(-16);
    void decodeNext();
    if (!providers().autoPrepare || deciding || Date.now() - lastDecisionAt < 4000) return;
    // The same stream contains local speech, peer speech, chat, TTS, and dashboard input.
    const records = store.all<TranscriptRecord>("transcripts", state.runId);
    const input = conversationContext(state, records, eligibleCards(state).length > 0);
    const newest = records.filter(record => !record.error).sort((a, b) =>
      Date.parse(b.endedAt ?? b.createdAt) - Date.parse(a.endedAt ?? a.createdAt))[0]?.id;
    if (!newest || newest === lastInputId) return;
    lastInputId = newest;
    if (!input.focus.transcript.length) return;
    void decide(input, state.runId);
  } catch { /* The game may close between state polling and audio collection. */ }
  finally { polling = false; }
}
