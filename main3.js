// FF2 Mockup: Standalone Merged JS File (all data inline, copy-paste ready)
// Paste this as a .js file and include with <script src="..." ></script> in your HTML

// === All logic wrapped in DOMContentLoaded to avoid global namespace conflicts ===
document.addEventListener("DOMContentLoaded", () => {

// —— tiny markdown helper (global) ——
const md = s => s.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

/* tiny markdown → <table> converter
   – converts **bold** inside cells
*/
function tableMDtoHTML(mdText) {
  if (!mdText.includes('|')) return md(mdText);   // fall back for non-tables

  const rows = mdText.trim().split('\n')
                     .filter(r => r.trim().startsWith('|'));

  let html = '<table class="look"><tbody>';

  rows.forEach(r => {
    // split & trim each cell
    const cells = r.split('|').slice(1, -1).map(c => c.trim());

    /* skip pure-dash separator rows like "-----" or "----:--" */
    const isSep = cells.every(c => /^:?-{3,}:?$/.test(c));
    if (isSep) return;

    html += '<tr>' +
            cells.map(c => `<td>${md(c)}</td>`).join('') +
            '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

/* ---------------------------------------------------------------
 * canonical reference to the player as an “NPC-like” object
 * --------------------------------------------------------------- */
const PLAYER_ID    = 'you';
const PLAYER_EMOJI = '🫵';

const MOOD_THRESH = {
  death_low:      1,
  death_high:     3,
  violence_high:  4,
  tension_high:   6,
  enemies_low:    1,   // hostile NPC count
  enemies_high:   3,
  properties_low: 0,
  properties_high:3,
  agency_low:     3,
  agency_high:    8
};

function activeMoodKeys() {
  const hostileNpc = world.npcs.filter(n =>
    getRelation(PLAYER_ID, n.name) === RELATION.HOSTILE).length;

  return Object.keys(MOOD_THRESH).filter(key => {
    switch (key) {
      case 'death_low':   return world.deaths  >= MOOD_THRESH.death_low;
      case 'death_high':  return world.deaths  >= MOOD_THRESH.death_high;
      case 'violence_high':return world.violence >= MOOD_THRESH.violence_high;
      case 'tension_high': return world.tension  >= MOOD_THRESH.tension_high;
      case 'enemies_low':  return hostileNpc     >= MOOD_THRESH.enemies_low;
      case 'enemies_high': return hostileNpc     >= MOOD_THRESH.enemies_high;
      case 'properties_low': return world.properties <= MOOD_THRESH.properties_low;
      case 'properties_high':return world.properties >= MOOD_THRESH.properties_high;
      case 'agency_low':   return world.agency   <= MOOD_THRESH.agency_low;
      case 'agency_high':  return world.agency   >= MOOD_THRESH.agency_high;
      default: return false;
    }
  });
}

function playerObj() {
  return { name: PLAYER_ID, emoji: PLAYER_EMOJI };
}

/* human-readable target formatter */
function fmtTarget(npc, cls='') {
  if (!npc) return '';
  if (npc.name === PLAYER_ID) {
    return `${PLAYER_EMOJI} <b class="${cls}">you</b>`;
  }
  const extra = npc.bound && npc.boundItem ? ` ${npc.boundItem.emoji}` : '';
  return `${npc.emoji}${extra} the <b>${npc.name}</b>`;
}

let commandQueue = [];
// let autoTimer    = null;

// ✨ Inject input UI if it’s missing
if (!document.getElementById('player-cmd')) {
  const controls = document.createElement('div');
  controls.style.margin = '1em 0';
  controls.innerHTML = `
    <input id="player-cmd" type="text" placeholder="type a command…" style="width:60%;">
    <button id="submit-cmd">Do</button>
  `;
  document.body.insertBefore(controls, document.body.firstChild);

  // activate the listeners
  attachPlayerInputHandlers();
}

function attachPlayerInputHandlers () {
  const input  = document.getElementById("player-cmd");
  const button = document.getElementById("submit-cmd");

  const submit = () => {
    const txt = input.value.trim();
    if (!txt) return;

    commandQueue.push(txt);      // queue it
    autoMode = false;            // manual mode

    // ⛔ cancel any pending auto-turn
    // if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }

    if (!running) runStep();     // only starts if idle
    input.value = "";
  };

  button.addEventListener("click", submit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
  });
}


// --- DATA TABLES: NPCs, Objects/Arms, Bullet Text, Mood ---

const NPC_TABLE = [
  { name: "man", emoji: "👨", carries: [] },
  { name: "woman", emoji: "👩", carries: [] },
  { name: "family", emoji: "⚛️", carries: [] },
  { name: "stranger", emoji: "🕴️", carries: [] },
  { name: "citizen", emoji: "🧍", carries: ["identity"] },
  { name: "immigrant", emoji: "🌱", carries: [] },
  { name: "patriot", emoji: "🏴‍☠️", carries: ["hat", "flag"] },
  { name: "tourist", emoji: "🧳", carries: ["map"] },
  { name: "alien", emoji: "👽", carries: ["ray gun", "gibberish"] },
  { name: "protester", emoji: "✊", carries: ["gum"] },
  { name: "agitator", emoji: "🔥", carries: ["Molotov cocktail"] },
  { name: "cop", emoji: "👮", carries: ["handcuffs", "shield", "baton", "donut"] },
  { name: "bounty hunter", emoji: "🥷", carries: ["mask"] },
  { name: "agent", emoji: "🕵️", carries: ["zip tie"] },
  { name: "entrepreneur", emoji: "💼", carries: ["elevator pitch"] },
  { name: "investor", emoji: "📈", carries: ["wallet"] },
  { name: "bot", emoji: "🤖", carries: [] },
  { name: "podcaster", emoji: "🗣️", carries: ["microphone"] },
  { name: "billionaire", emoji: "🤑", carries: [] },
  { name: "influencer", emoji: "🤳", carries: ["phone", "tripod", "livestream"] },
  { name: "contractor", emoji: "🛠️", carries: ["2x4"] },
  { name: "hacker", emoji: "💻", carries: ["password", "virus"] },
  { name: "journalist", emoji: "📰", carries: ["pen"] },
  { name: "whistleblower", emoji: "📤", carries: ["document"] },
  { name: "landlord", emoji: "🏢", carries: ["lease", "key"] },
  { name: "veteran", emoji: "🎖️", carries: ["bills"] },
  { name: "informant", emoji: "☎️", carries: [] },
  { name: "consultant", emoji: "🧠", carries: ["slide deck"] },
  { name: "ancestor", emoji: "🪦", carries: [] },
  { name: "volunteer", emoji: "🤝", carries: ["clipboard"] },
  { name: "coach", emoji: "🧢", carries: ["whistle"] },
  { name: "athlete", emoji: "🏃", carries: ["basketball"] },
  { name: "celebrity", emoji: "🌟", carries: ["disguise"] },
  { name: "follower", emoji: "🙇", carries: ["red pill", "pipe bomb"] },
  { name: "academic", emoji: "🎓", carries: ["critique"] },
  { name: "lone wolf", emoji: "🐺", carries: ["manifesto"] },
  { name: "organizer", emoji: "📢", carries: ["megaphone"] },
  { name: "avatar", emoji: "🧿", carries: [] },
  { name: "recruiter", emoji: "🤲", carries: ["offer"] },
  { name: "witness", emoji: "👁️", carries: ["proof"] },
  { name: "intern", emoji: "🧑‍💼", carries: [] },
  { name: "guard", emoji: "🛡️", carries: ["badge", "walkie-talkie"] },
  { name: "Doomsday prepper", emoji: "📦", carries: ["tin can", "bear mace"] },
  { name: "responder", emoji: "🚑", carries: ["gurney"] },
  { name: "chaperone", emoji: "🌂", carries: ["umbrella"] },
  { name: "oracle", emoji: "🔮", carries: ["cards"] },
  { name: "technocrat", emoji: "🦾", carries: ["prototype", "thread"] },
  { name: "lobbyist", emoji: "🤝", carries: ["bribe"] },
  { name: "courier", emoji: "🚴", carries: ["bike lock"] },
  { name: "librarian", emoji: "📚", carries: ["glasses"] },
  { name: "bureaucrat", emoji: "🗂️", carries: ["file"] },
  { name: "spokesperson", emoji: "🎤", carries: ["script"] },
  { name: "politician", emoji: "🎩", carries: ["thoughts", "prayers", "scandal"] },
  { name: "paparazzi", emoji: "🕶️", carries: ["camera"] },
  { name: "marketer", emoji: "🌀", carries: ["email"] },
  { name: "jury", emoji: "⚖️", carries: ["verdict"] },
  { name: "prosecutor", emoji: "👩‍⚖️", carries: ["subpoena"] },
  { name: "actor", emoji: "🎭", carries: ["dialogue"] },
  { name: "ghost", emoji: "👻", carries: ["ectoplasm"] },
  { name: "moderate", emoji: "😐", carries: [] },
  { name: "government", emoji: "🏛️", carries: ["tax"] },
  { name: "nation", emoji: "🏰", carries: ["myth"] }
];

// --------- Table of Arms/Objects (superset, deduped) -----------
const OBJECTS_TABLE = [
  { name: "body", emoji: "💀", heft: "", type: "projectile" },
  { name: "right", emoji: "👉", heft: "light", type: "" },
  { name: "freedom", emoji: "🦅", heft: "massive", type: "" },
  { name: "heritage", emoji: "🏛️", heft: "light", type: "" },
  { name: "tradition", emoji: "🕯️", heft: "", type: "bind" },
  { name: "destiny", emoji: "✨", heft: "", type: "" },
  { name: "identity", emoji: "🪪", heft: "", type: "bind" },
  { name: "meaning", emoji: "🌀", heft: "massive", type: "" },
  { name: "faith", emoji: "⭕", heft: "", type: "bind" },
  { name: "truth", emoji: "📜", heft: "", type: "" },
  { name: "logic", emoji: "🧠", heft: "", type: "bind" },
  { name: "love", emoji: "💘", heft: "", type: "projectile" },
  { name: "hate", emoji: "💢", heft: "", type: "projectile" },
  { name: "beliefs", emoji: "🧿", heft: "light", type: "" },
  { name: "speech", emoji: "🗣️", heft: "", type: "projectile" },
  { name: "vision", emoji: "👁️", heft: "massive", type: "" },
  { name: "division", emoji: "➗", heft: "", type: "" },
  { name: "feelings", emoji: "💭", heft: "light", type: "projectile" },
  { name: "vote", emoji: "🗳️", heft: "light", type: "projectile" },
  { name: "hope", emoji: "🕊️", heft: "", type: "" },
  { name: "dream", emoji: "🌙", heft: "light", type: "" },
  { name: "statue", emoji: "🗿", heft: "massive", type: "" },
  { name: "flagpole", emoji: "🎏", heft: "massive", type: "" },
  { name: "bottle", emoji: "🍾", heft: "", type: "projectile" },
  { name: "barricade", emoji: "🚧", heft: "", type: "" },
  { name: "fire extinguisher", emoji: "🧯", heft: "massive", type: "projectile" },
  { name: "rock", emoji: "🪨", heft: "", type: "" },
  { name: "brick", emoji: "🧱", heft: "", type: "projectile" },
  { name: "chair", emoji: "🪑", heft: "", type: "" },
  { name: "flag", emoji: "🚩", heft: "light", type: "projectile" },
  { name: "ammunition", emoji: "🎯", heft: "light", type: "projectile" },
  { name: "phone", emoji: "📱", heft: "", type: "projectile" },
  { name: "bike lock", emoji: "🔒", heft: "", type: "" },
  { name: "pepper spray", emoji: "🌶️", heft: "", type: "bind" },
  { name: "hatchet", emoji: "🪓", heft: "", type: "projectile" },
  { name: "virus", emoji: "🦠", heft: "", type: "bind" },
  { name: "debt", emoji: "💸", heft: "massive", type: "bind" },
  { name: "mask", emoji: "😷", heft: "", type: "bind" },
  { name: "warhead", emoji: "💣", heft: "massive", type: "projectile" },
  { name: "voice", emoji: "🎤", heft: "light", type: "" },
  { name: "reason", emoji: "🧾", heft: "", type: "projectile" },
  { name: "spear", emoji: "🗡️", heft: "", type: "projectile" },
  { name: "law", emoji: "⚖️", heft: "", type: "bind" },
  { name: "warrant", emoji: "📄", heft: "", type: "" },
  { name: "rope", emoji: "🪢", heft: "", type: "bind" },
  { name: "promise", emoji: "🤞", heft: "", type: "bind" },
  { name: "contract", emoji: "📑", heft: "", type: "bind" },
  { name: "red pill", emoji: "🔴", heft: "light", type: "projectile" },
  { name: "conspiracy", emoji: "👁️‍🗨️", heft: "", type: "bind" },
  { name: "NDA", emoji: "🤐", heft: "", type: "bind" },
  { name: "thoughts", emoji: "💭", heft: "light", type: "" },
  { name: "cash", emoji: "💵", heft: "", type: "projectile" },
  { name: "prayers", emoji: "🙏", heft: "light", type: "projectile" },
  { name: "bribe", emoji: "🤝", heft: "light", type: "projectile" },
  { name: "facts", emoji: "📊", heft: "", type: "projectile" },
  { name: "hat", emoji: "🎩", heft: "light", type: "" },
  { name: "handcuffs", emoji: "🔗", heft: "", type: "bind" },
  { name: "shield", emoji: "🛡️", heft: "", type: "" },
  { name: "baton", emoji: "🦯", heft: "", type: "" },
  { name: "speech (dupe)", emoji: "💬", heft: "light", type: "projectile" },
  { name: "verdict", emoji: "🔨", heft: "massive", type: "" },
  { name: "pen", emoji: "🖊️", heft: "light", type: "" },
  { name: "zip tie", emoji: "🪤", heft: "", type: "bind" },
  { name: "megaphone", emoji: "📣", heft: "", type: "" },
  { name: "bear mace", emoji: "🧴", heft: "", type: "bind" },
  { name: "2x4", emoji: "🪵", heft: "", type: "" },
  { name: "wallet", emoji: "👛", heft: "light", type: "projectile" },
  { name: "pipe bomb", emoji: "🧨", heft: "massive", type: "projectile" },
  { name: "camera", emoji: "📷", heft: "", type: "" },
  { name: "disinformation", emoji: "🧃", heft: "light", type: "" },
  { name: "baby oil", emoji: "🍼", heft: "light", type: "projectile" },
  { name: "Molotov cocktail", emoji: "🍷", heft: "", type: "projectile" },
  { name: "leftovers", emoji: "🍱", heft: "light", type: "projectile" },
  { name: "leash", emoji: "🦮", heft: "", type: "bind" },
  { name: "algorithm", emoji: "🧮", heft: "", type: "" },
  { name: "loophole", emoji: "🕳️", heft: "", type: "bind" },
  { name: "subpoena", emoji: "🧾", heft: "", type: "bind" },
  { name: "document", emoji: "📄", heft: "", type: "" },
  { name: "flashbang", emoji: "💥", heft: "", type: "projectile" },
  { name: "propaganda", emoji: "📢", heft: "", type: "" },
  { name: "cliche", emoji: "💤", heft: "", type: "" },
  { name: "drone", emoji: "🛸", heft: "", type: "projectile" },
  { name: "coupon", emoji: "🎟️", heft: "light", type: "projectile" },
  { name: "confession", emoji: "🗯️", heft: "massive", type: "" },
  { name: "livestream", emoji: "📺", heft: "", type: "" },
  { name: "manifesto", emoji: "📘", heft: "", type: "" },
  { name: "donation", emoji: "🫴", heft: "", type: "projectile" },
  { name: "decoy", emoji: "🦆", heft: "", type: "" },
  { name: "vibe", emoji: "✨", heft: "", type: "" },
  { name: "password", emoji: "🔐", heft: "", type: "projectile" },
  { name: "microphone", emoji: "🎙️", heft: "", type: "" },
  { name: "tin can", emoji: "🥫", heft: "light", type: "" },
  { name: "walkie-talkie", emoji: "📟", heft: "", type: "" },
  { name: "badge", emoji: "🛂", heft: "light", type: "projectile" },
  { name: "proof", emoji: "🔍", heft: "massive", type: "projectile" },
  { name: "offer", emoji: "👐", heft: "", type: "" },
  { name: "critique", emoji: "🧷", heft: "light", type: "" },
  { name: "disguise", emoji: "🥸", heft: "", type: "" },
  { name: "subpoena", emoji: "🧾", heft: "", type: "bind" },
  { name: "oath", emoji: "✋", heft: "", type: "bind" },
  { name: "basketball", emoji: "🏀", heft: "", type: "projectile" },
  { name: "whistle", emoji: "📯", heft: "", type: "" },
  { name: "painting", emoji: "🖼️", heft: "", type: "projectile" },
  { name: "clipboard", emoji: "📋", heft: "", type: "" },
  { name: "insult", emoji: "🤬", heft: "", type: "" },
  { name: "slide deck", emoji: "📽️", heft: "", type: "" },
  { name: "gurney", emoji: "🛏️", heft: "massive", type: "" },
  { name: "bills", emoji: "🧾", heft: "massive", type: "projectile" },
  { name: "myth", emoji: "🧙", heft: "", type: "" },
  { name: "tax", emoji: "🪙", heft: "", type: "projectile" },
  { name: "ectoplasm", emoji: "👻", heft: "", type: "bind" },
  { name: "dialogue", emoji: "🗨️", heft: "light", type: "" },
  { name: "email", emoji: "📧", heft: "light", type: "" },
  { name: "scandal", emoji: "🔥", heft: "massive", type: "" },
  { name: "script", emoji: "📜", heft: "", type: "" },
  { name: "file", emoji: "🗂️", heft: "", type: "" },
  { name: "trust", emoji: "🫂", heft: "", type: "projectile" },
  { name: "glasses", emoji: "👓", heft: "", type: "" },
  { name: "prototype", emoji: "🛠️", heft: "massive", type: "" },
  { name: "cards", emoji: "🃏", heft: "", type: "projectile" },
  { name: "thread", emoji: "🧵", heft: "", type: "bind" },
  { name: "umbrella", emoji: "☂️", heft: "", type: "" },
  { name: "key", emoji: "🗝️", heft: "", type: "" },
  { name: "lease", emoji: "🧾", heft: "", type: "bind" },
  { name: "tripod", emoji: "📸", heft: "", type: "" },
  { name: "elevator pitch", emoji: "🪜", heft: "light", type: "" },
  { name: "hot dog", emoji: "🌭", heft: "light", type: "projectile" },
  { name: "donut", emoji: "🍩", heft: "", type: "projectile" },
  { name: "gibberish", emoji: "🤪", heft: "", type: "" },
  { name: "gum", emoji: "🍬", heft: "light", type: "projectile" },
  { name: "ray gun", emoji: "🔫", heft: "", type: "projectile" },
  { name: "map", emoji: "🗺️", heft: "", type: "" }
];

const BULLET_ACTIONS = [
  { type: "spawn", group: null, is: false, verbs: ["appears", "shows up", "wanders by", "is here", "passes by"], withObj: null },
  { type: "becoming sus", group: null, is: false, verbs: ["stares at", "squints at", "smirks at", "sizes up", "questions", "debates", "investigates", "vets", "interrogates", "inspects"], withObj: null },
  { type: "becoming friendly", group: null, is: false, verbs: ["salutes", "smiles at", "winks at", "nods at", "flatters", "praises", "applauds", "endorses", "hails", "courts"], withObj: null },
  { type: "apologize", group: 1, is: false, verbs: ["apologizes to", "sweet-talks", "coaxes", "cajoles"], withObj: null },
  { type: "reject apology", group: 1, is: false, verbs: ["ignores", "dismisses", "disregards", "rejects", "snubs", "brushes off", "scoffs at", "denies"], withObj: null },
  { type: "want (neutral/friendly)", group: 2, is: true, verbs: ["requesting"], withObj: null },
  { type: "want (sus/hostile)", group: 2, is: true, verbs: ["demanding"], withObj: null },
  { type: "take", group: 3, is: false, verbs: ["claims"], withObj: null },
  { type: "steal", group: 2, is: false, verbs: ["seizes", "snatches", "steals", "claws back"], withObj: null },
  { type: "added property", group: 2, is: false, verbs: ["owns"], withObj: null },
  { type: "harass (make sus)", group: null, is: false, verbs: ["warns", "threatens", "challenges", "accuses", "blames", "confronts", "intimidates", "taunts", "scolds"], withObj: null },
  { type: "harass (make hostile)", group: null, is: false, verbs: ["yells at", "screams at", "howls at", "swears at", "shouts at", "turns against", "barks at", "points at"], withObj: null },
  { type: "assault (no weapon)", group: 4, is: false, verbs: ["pushes", "punches", "kicks", "shoves", "slaps", "spanks", "chokes"], withObj: null },
  { type: "beat (with weapon, light)", group: 4, is: false, verbs: ["provokes"], withObj: "with" },
  { type: "beat (with weapon, medium)", group: 4, is: false, verbs: ["hits"], withObj: "with" },
  { type: "beat (with weapon, massive)", group: 4, is: false, verbs: ["crushes"], withObj: "with" },
  { type: "misses", group: 4, is: false, verbs: ["missed"], withObj: null },
  { type: "hit (with attack)", group: 4, is: false, verbs: ["knocks", "jolts", "bashes"], withObj: null },
  { type: "lost (item)", group: 4, is: false, verbs: ["lost"], withObj: null },
  { type: "killed (with attack)", group: 4, is: false, verbs: ["mutilates", "decapitates", "disfigures", "maims", "lacerates", "mangles"], withObj: null },
  { type: "was hit (by attack)", group: 5, is: true, verbs: ["dazed", "discombobulated", "distracted", "disturbed"], withObj: null },
  { type: "missed (by attack)", group: 4, is: false, verbs: ["blinks", "flinches", "quivers"], withObj: null },
  { type: "was killed", group: null, is: true, verbs: ["dead"], withObj: null },
  { type: "bind", group: 6, is: true, verbs: ["ambushes", "corners", "traps"], withObj: "with" },
  { type: "was bound (by bind)", group: 6, is: true, verbs: ["squirms", "struggles", "strains"], withObj: null },
  { type: "bound (with bind)", group: 6, is: true, verbs: ["secured to"], withObj: null },
  { type: "missed (by bind)", group: 6, is: false, verbs: ["evades", "dodges", "sidesteps"], withObj: null },
  { type: "anything while bound", group: null, is: false, verbs: ["coughs", "gags", "wheezes", "gasps"], withObj: null },
  { type: "throw", group: 4, is: false, verbs: ["throws", "tosses", "lobs"], withObj: "at" },
  { type: "help (friendly, no target)", group: null, is: false, verbs: ["huddles with", "cuddles with", "schemes with", "conspires with", "whispers to", "shakes hands with", "syncs with", "fist-bumps", "high-fives", "takes a selfie with", "colludes with", "hugs"], withObj: null },
  { type: "idle", group: null, is: false, verbs: ["coughs", "looks around", "fidgets", "twitches", "sighs", "mumbles", "sweats", "frowns", "grumbles", "searches", "wants more", "thirsts", "itches", "aches", "tenses up"], withObj: null },
  { type: "idle2", group: null, is: false, verbs: ["rages", "fumes", "seethes", "heats up", "boils", "spits", "bristles", "chafes", "froths"], withObj: null },
  { type: "moderate", group: null, is: false, verbs: ["reasons with"], withObj: null },
  { type: "crowd", group: null, is: true, verbs: ["growing"], withObj: null }
];

// --------- Mood Text Table (from ff2_moodtext.yml) -----------
const MOOD_TEXT = {
  death_low: [
    [
      ["They drew blood,", "The show's just starting—", "I can taste the victory—", "There's no turning back now,", "We're past the point of no return,", "The damage is done—", "Change is finally here—"],
      ["and it's about to get personal.", "and it's about time.", "and you'd better respond.", "and you're up.", "so make it count.", "so play it through.", "so try not to flinch.", "so keep your eye on the ball.", "so don't look away."]
    ]
  ],
  death_high: [
    [
      ["These bodies are piling up—", "They asked for this—", "They had it coming—", "They were warned—", "Actions have consequences—", "You reap what you sow—", "Now they're finding out—", "An eye for an eye—", "They crossed a line—"],
      ["are you going through with this?", "do you have the resolve?", "do you have the guts?", "can you finish the job?", "you know where this is going, right?", "do you know what you want?", "are you in control?", "you're not having doubts, are you?", "are you built for this?"],
      ["Act like it.", "Don't hesitate.", "Don't think. Just act.", "Don't lose your nerve.", "You have to want it.", "Prove it.", "Convince me.", "Persuade me.", "Steady grip."]
    ]
  ],
  violence_high: [
    [
      ["For the record,", "Let me be clear.", "Let's be honest—", "Here's the hard truth—", "Say what you will—"],
      ["it may be uncomfortable. But", "I condemn violence. But", "I'm just observing. But", "I can only speak for myself, but", "I don't agree with violence, but", "I'm sure there is a better way. But", "I used to feel differently, but", "I think it's unfortunate. But"],
      ["it feels good.", "this is the real world.", "people are showing their true nature.", "it has a place.", "we're going to win this.", "we're going to beat this.", "you can't argue with results.", "conflict has its place.", "it solves things.", "we have to survive."],
      ["You have to admit it.", "There's no denying it.", "These are the facts.", "No one wants to admit it.", "You can't deny that.", "Period.", "End of story."]
    ]
  ],
  tension_high: [
    [
      ["This is bad—", "Not good—", "It's not ideal—", "This doesn't look good—", "I won't sugarcoat it—", "This can't go on—", "We're at a tipping point—", "I can't lie—"],
      ["tensions are high.", "it feels tense.", "tempers are running hot.", "something's about to burst.", "the air's thin in here.", "pressure's building up.", "the ground isn't stable.", "the fuse is burning.", "something's going to snap."],
      ["What happened to this place?", "What happened here?", "This place isn't what I remember.", "Things have changed.", "It wasn't always like this.", "I barely recognize it here.", "Something went wrong.", "This place had promise."],
      ["We used to have standards.", "In the past, we had rules.", "There was a way of doing things.", "You could trust your neighbor.", "I don't know any of these people.", "Where did these people come from?", "Everyone knew their role.", "We used to believe in something.", "Things used to make sense."]
    ]
  ],
  enemies_low: [
    [
      ["Oh—", "Watch your back—", "Get this—", "Listen—", "Heads up—", "Thought you should know—", "You might want to know—", "Just so you're aware—"],
      ["they've noticed you.", "they're looking at you.", "they're talking about you.", "there's a target on your back.", "somebody wants you out.", "you made an enemy."],
      ["They weren't raised like you, and", "They have different beliefs, and", "They have different opinions, and", "They want what you have, and", "They'll take everything from you, and", "They're after you, and", "They don't think highly of you, and"],
      ["they're not nice.", "they're not friendly.", "they're very bad people.", "they're unpredictable.", "they're waiting for an excuse.", "they don't play by the rules.", "they're not like you.", "they think differently."]
    ]
  ],
  enemies_high: [
    [
      ["What a bunch of animals—", "They're all losers—", "Look at these people—", "These people are a joke—", "They're acting like idiots—", "Look at what they've become—"],
      ["it's like a zoo in here.", "the smell is unbearable.", "this stench is awful.", "we used to keep it clean.", "making a mess.", "you can't reason with this.", "the ingredients have gone bad.", "where's the civility?"],
      ["It's them or us.", "They're on the wrong side.", "They'd better get out.", "We have to clear them out.", "They don't belong here.", "They have no place here.", "You need to purge.", "I'm telling it like it is.", "I'm saying what everyone is thinking.", "The bottom of the barrel."],
      ["It's the natural order of things.", "There's a hierarchy here.", "Right?", "Don't you agree?", "Am I right?", "Isn't that right?", "Know what I mean?", "Do you catch my meaning?", "Do you see it too?"]
    ]
  ],
  properties_low: [
    [
      ["But", "Still,", "Anyway,", "That being said,", "In any case,", "Also,"],
      ["why are you poor?", "where are your things?", "why are your pockets empty?", "what exactly do you own?", "you came with nothing?"],
      ["Get yourself something.", "Go take something.", "Take what's yours.", "Go on—make your claim.", "Start filling your pockets.", "Start building your stake.", "The world is yours."]
    ]
  ],
  properties_high: [
    [
      ["Plus,", "At least", "Hey,", "Thankfully,", "If nothing else,"],
      ["your pockets are nicely lined.", "you've got yourself a nice haul.", "you finally have something to show.", "you aren't empty-handed anymore.", "you've managed to hold on to something.", "you've acquired a decent collection.", "you've got assets now."],
      ["So that counts for something.", "And that's more like it.", "And that's how the world works.", "And that shows the right instinct.", "About time you had your share.", "And people understand that kind of thing.", "It's a step in the right direction."]
    ]
  ],
  agency_low: [
    [
      ["Get it together—", "Watch it—", "Honestly—", "Come on—", "Seriously—", "What was that—", "You call that effort? Look—", "Wake up—", "Get your head in the game—"],
      ["you're slipping!", "you're falling apart!", "you barely showed up!", "you gave that away!", "they're beating you out there!", "you're about to lose!", "you're making me look bad!", "you're not even trying!", "you keep making mistakes!", "you're losing your grip!", "you're losing ground!"],
      ["You should've had it.", "I taught you better than that.", "This is not who we are.", "That one's on you.", "No excuses.", "Figure it out.", "Fix it.", "I don't want to see that again.", "I expected more.", "I thought you'd hold up better.", "I'm disappointed.", "I'm not amused."]
    ]
  ],
  agency_high: [
    [
      ["That's more like it.", "Look at you.", "Finally.", "You see what happens?", "Took you long enough."],
      ["You're in control now—", "You're calling the shots—", "They can't stop you—", "You're making it look easy—", "You just shut that down—", "You're winning—", "You're owning them—", "You're crushing it—"],
      ["keep it up.", "don't let up.", "no one's going to forget that.", "you earned it.", "hard work pays off."]
    ]
  ],
  random_2: [
    [
      ["Yeah,", "That's right—", "It's time—", "I can feel it—"],
      ["they'll get what's coming.", "they're going to learn the hard way.", "they're about to find out.", "this is about to be ours.", "we're going to win.", "we've got this."]
    ]
  ],
  random_3: [
    [
      ["But I want more.", "Give me more.", "But it's never enough.", "Don't stop.", "Keep going."],
      ["Let's have it out.", "I want to see it all.", "Show me everything.", "Shoot it into my veins.", "Let it pile up.", "Give me a real climax.", "I need to feel it."]
    ]
  ],
  prompt: [
    [
      ["👉 I want you to", "💪 Try to", "❓ Why don't you", "❗ You should", "💡 Take my advice—", "🟢 Go ahead and", "📋 Don't forget to"],
      ["express yourself.", "do what comes naturally.", "make it count.", "make it last.", "have fun.", "enjoy yourself.", "go explore.", "show me who you are."],
      ["Let me see you out there.", "You know what I like.", "And make me proud.", "I'll be waiting.", "I'm always watching you.", "And don't let me down.", "Just like I showed you.", "And remember what I said.", "And don't embarrass me.", "This is what I raised you for."]
    ]
  ]
};

// --- Utility: Pick random sequence from mood ---
function pickMoodSequence(sequences) {
  // Choose one sequence, then one from each fragment group
  const seq = pick(sequences);
  let out = '';
  for (let i = 0; i < seq.length; ++i) {
    let frag = pick(seq[i]);
    if (i > 0) {
      // Check previous fragment for em dash
      let prev = out.trim();
      if (!prev.endsWith('–') && !prev.endsWith('—')) {
        out += ' ';
      }
    }
    out += frag;
  }
  return out;
}

// === RELATIONS & PLAYER-ACTION ENUMS ===================================
const RELATION = Object.freeze({
  FRIENDLY:  'friendly',
  SUSPICIOUS:'suspicious',
  HOSTILE:   'hostile',
  NEUTRAL:   'neutral'
});

const ACTION = Object.freeze({
  WAIT:      'wait',
  LOOK:      'look',
  INVENTORY: 'inventory',
  TAKE:      'take',
  DROP:      'drop',
  APOLOGIZE: 'apologize',
  HARASS:    'harass',
  ASSAULT:   'assault',
  BEAT:      'beat',
  BIND:      'bind',
  TOSS:      'toss',
  USE:       'use',
  HELP:      'help',         // ← keep but not wired for now
});

// Free-form verbs → canonical ACTION key
const PLAYER_VERB_MAP = {
  /* ── Wait / idle ── */
  wait: ACTION.WAIT, think: ACTION.WAIT, consider: ACTION.WAIT, meditate: ACTION.WAIT,
  nap: ACTION.WAIT, sleep: ACTION.WAIT, hide: ACTION.WAIT, pass: ACTION.WAIT,
  pause: ACTION.WAIT, pray: ACTION.WAIT,                              // :contentReference[oaicite:11]{index=11}

  /* ── Observation & inventory ── */
  look: ACTION.LOOK, 'look around': ACTION.LOOK,                      // :contentReference[oaicite:12]{index=12}
  inventory: ACTION.INVENTORY, 'my things': ACTION.INVENTORY,
  'my property': ACTION.INVENTORY, 'what do i own': ACTION.INVENTORY,

  /* ── Acquire / take ── */
  take: ACTION.TAKE, get: ACTION.TAKE, own: ACTION.TAKE, steal: ACTION.TAKE,
  confiscate: ACTION.TAKE, loot: ACTION.TAKE, claim: ACTION.TAKE,
  appropriate: ACTION.TAKE, seize: ACTION.TAKE, gain: ACTION.TAKE, store: ACTION.TAKE,
  grab: ACTION.TAKE, capture: ACTION.TAKE, catch: ACTION.TAKE, procure: ACTION.TAKE,
  liberate: ACTION.TAKE, grasp: ACTION.TAKE, fetch: ACTION.TAKE,
  possess: ACTION.TAKE, equip: ACTION.TAKE,                           // :contentReference[oaicite:13]{index=13}

  /* ── Drop / relinquish ── */
  drop: ACTION.DROP, deduct: ACTION.DROP, lose: ACTION.DROP,
  remove: ACTION.DROP, renounce: ACTION.DROP, detach: ACTION.DROP,    // :contentReference[oaicite:14]{index=14}

  /* ── Make peace ── */
  apologize: ACTION.APOLOGIZE, forgive: ACTION.APOLOGIZE,             // :contentReference[oaicite:15]{index=15}

  /* ── Harass (non-lethal) ── */
  yell: ACTION.HARASS, shout: ACTION.HARASS, scream: ACTION.HARASS,
  threaten: ACTION.HARASS, warn: ACTION.HARASS, insult: ACTION.HARASS,
  criticize: ACTION.HARASS, scold: ACTION.HARASS, confront: ACTION.HARASS,
  accuse: ACTION.HARASS, protest: ACTION.HARASS, provoke: ACTION.HARASS,
  argue: ACTION.HARASS, disrespect: ACTION.HARASS, mock: ACTION.HARASS, // :contentReference[oaicite:16]{index=16}

  /* ── Assault (unarmed) ── */
  attack: ACTION.ASSAULT, push: ACTION.ASSAULT, wrestle: ACTION.ASSAULT,
  grapple: ACTION.ASSAULT, tackle: ACTION.ASSAULT, shove: ACTION.ASSAULT,
  punch: ACTION.ASSAULT, kick: ACTION.ASSAULT, slap: ACTION.ASSAULT,
  strangle: ACTION.ASSAULT, choke: ACTION.ASSAULT, slam: ACTION.ASSAULT, // :contentReference[oaicite:17]{index=17}

  /* ── Beat / weapon attack ── */
  beat: ACTION.BEAT, battle: ACTION.BEAT, break: ACTION.BEAT, smash: ACTION.BEAT,
  hit: ACTION.BEAT, fight: ACTION.BEAT, destroy: ACTION.BEAT, kill: ACTION.BEAT,
  bash: ACTION.BEAT, slay: ACTION.BEAT, hurt: ACTION.BEAT, crush: ACTION.BEAT,
  punish: ACTION.BEAT, strike: ACTION.BEAT,                            // :contentReference[oaicite:18]{index=18}

  /* ── Bind / restrain ── */
  bind: ACTION.BIND, tie: ACTION.BIND, incapacitate: ACTION.BIND,
  subdue: ACTION.BIND, muzzle: ACTION.BIND, arrest: ACTION.BIND,
  secure: ACTION.BIND, stop: ACTION.BIND, silence: ACTION.BIND,        // :contentReference[oaicite:19]{index=19}

  /* ── Throw / projectile ── */
  throw: ACTION.TOSS, pitch: ACTION.TOSS, hurl: ACTION.TOSS,
  aim: ACTION.TOSS, fling: ACTION.TOSS, yeet: ACTION.TOSS,             // :contentReference[oaicite:20]{index=20}

  /* ── Use (catch-all) ── */
  use: ACTION.USE                                                     // :contentReference[oaicite:21]{index=21}
};

// Relation helpers ------------------------------------------------------
function getRelation(a, b) {
  // Default to neutral when nothing recorded yet
  return world.relations?.get(a)?.get(b) ?? RELATION.NEUTRAL;
}
function setRelation(a, b, status) {
  if (!world.relations.has(a)) world.relations.set(a, new Map());
  world.relations.get(a).set(b, status);
}
function ensureRelation(a, b) {
  // make sure both directions exist
  if (!world.relations.has(a)) world.relations.set(a, new Map());
  if (!world.relations.has(b)) world.relations.set(b, new Map());
  if (!world.relations.get(a).has(b)) world.relations.get(a).set(b, RELATION.NEUTRAL);
  if (!world.relations.get(b).has(a)) world.relations.get(b).set(a, RELATION.NEUTRAL);
}


// --- 2. World State & Constants ---
const MAX_NPCS = 10;
const MAX_OBJECTS = 15;
const SPAWN_INTERVAL = 2; // Every 2 turns: spawn 1 NPC + 1 object

let turn = 0;
let world = {
  npcs: [],            // active NPC instances
  objects: [],         // loose or held objects
  bodies: [],          // corpses (special object, not counted toward limits)
  turnHistory: [],     // per-turn log
  deaths: 0,

  // NEW — player & social graph
  player: {
    inventory: [],
    lastAggressor: null
  },
  // Map<actorName, Map<targetName, RELATION>>
  relations: new Map()
};

// === PLAYER ACTION HELPERS ===============================================

function isMetaAction(action) {
  return action === ACTION.LOOK || action === ACTION.INVENTORY;
}

// Translate a free-form verb into a canonical ACTION constant
function resolvePlayerVerb(text) {
  const key = text.trim().toLowerCase();
  return PLAYER_VERB_MAP[key] ?? ACTION.WAIT;
}

// Light parser: returns {action, target?, item?} from raw input string.
//   e.g. "take man"          ➜ {action: TAKE,  target: 'man'}
//        "beat woman with freedom" ➜ {action: BEAT, target:'woman', item:'freedom'}
function parsePlayerInput(raw) {
  // Accept anything; coerce non-strings to empty string
  if (typeof raw !== 'string') raw = '';
  const lower = raw.toLowerCase();
  let words = lower.split(/\s+/);
  let verb = words[0];
  let action = resolvePlayerVerb(verb);

  // heuristics for optional target / item
  let target = null;
  let item = null;
  if (action === ACTION.TAKE || action === ACTION.DROP ||
      action === ACTION.APOLOGIZE || action === ACTION.HARASS ||
      action === ACTION.ASSAULT || action === ACTION.BEAT ||
      action === ACTION.BIND || action === ACTION.TOSS || action === ACTION.USE) {
    // expect "verb target [with|at] item" patterns
    if (words.length >= 2) target = words[1];
    if (words.includes('with') || words.includes('at')) {
      item = words[words.length - 1];
    }
  }
  return { action, target, item };
}

/**
 * Mutate `world` according to the player's chosen action.
 * Returns a short markdown string describing the outcome (to prepend
 * above the ✅ section).
 */
// ========================================================================
//  helper + exact player-output lines (from ff2_player_actions.md)
// ========================================================================
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const P = {
  wait: [
    "**OK.** You didn't do much.",
    "**Well.** You just sat there.",
    "**What?** You let it happen."
  ],
  invHdr:  "📦 You own these properties:",
  lookHdr: "👀 You see these things:",
  take:    "**Score.** You got the {X}!",
  apoGood: "**Nice.** The {NPC} is with you!",
  apoBad:  "**Too bad.** The {NPC} rejected you.",
  harass: [
    "🤬 **That's right.** Express yourself.",
    "🤬 **Yeah.** Speak your mind.",
    "🤬 **Exactly.** Tell it like it is."
  ],
  hit: [
    "💥 **Bam!** That's gotta hurt.",
    "💥 **Wham!** Nice hit.",
    "💥 **Boom!** Impact.",
    "💥 **Biff!** Take that.",
    "💥 **Pow!** Fair and square."
  ],
  bound: [
    "⛓️ **Done.** Not a problem now.",
    "⛓️ **Good.** Issue resolved."
  ],
  miss: [
    "**Aw.** You missed.",
    "**Oof.** You missed."
  ],
  unknown: "You fumble around and nothing much happens."
};

// ========================================================================
//  unified player-action handler
// ========================================================================
function escalate(a, b, curve) {
  // curve: 'sus', 'hostile'
  ensureRelation(a, b);
  const cur = getRelation(a, b);

  const next =
    curve === 'sus'
      ? (cur === RELATION.NEUTRAL ? RELATION.SUSPICIOUS : RELATION.SUSPICIOUS)
      : RELATION.HOSTILE; // always hostile

  setRelation(a, b, next);
  setRelation(b, a, next);
}

function setAggressor(target, name) {
  /* keep the player at top priority */
  if (target.lastAggressor !== 'you') target.lastAggressor = name;
}

function applyPlayerAction({ action, target, item }) {
  const propsBefore = world.player.inventory.length;

  // make sure sub-objects exist
  if (!world.player)    world.player    = { inventory: [], lastAggressor: null };
  if (!world.relations) world.relations = new Map();

  // helpers
  const fmt  = (tpl, X = '', NPC = '') =>
      tpl.replace('{X}', `**${X}**`).replace('{NPC}', `**${NPC}**`);
  // const bump = (a, b, s) => { ensureRelation(a, b); setRelation(a, b, s); setRelation(b, a, s); };

  let out = '';

  // ───────── passive / meta ────────────────────────────────────────────
  if (action === ACTION.WAIT) {
    out = pick(P.wait);

  /* ---------- LOOK --------------------------------------------------- */
  } else if (action === ACTION.LOOK) {

    const objLines = world.objects.map(o => {
      const status = o.inWorld ? "Free"
        : o.heldBy === 'you' ? "Yours"
        : `Taken by ${o.heldBy}`;
      return `| ${o.emoji || ''} **${o.name}** | ${status} |`;
    }).join('\n') || '| _Nothing_ | — |';

    const npcLines = world.npcs.map(n => {
      const extra = n.bound && n.boundItem ? ' ' + n.boundItem.emoji : '';
      return `| ${n.emoji}${extra} **${n.name}** | ${getRelation('you', n.name)} |`;
    }).join('\n') || '| _Nobody_ | — |';

    /* single header row; separator auto-removed by tableMDtoHTML */
    const mdTable = `| Item | Status |
  |------|--------|
  ${objLines}

  ${npcLines}`;

    out = `<div class="subhdr">👀 You see these things:</div>` +
          tableMDtoHTML(mdTable);

  /* ---------- INVENTORY ---------------------------------------------- */
  } else if (action === ACTION.INVENTORY) {

    const htmlInv = `<div class="subhdr">📦 You own these properties:</div>
  <ul>` +
      (world.player.inventory.length
         ? world.player.inventory.map(i => `<li><b>${i}</b></li>`).join('')
         : '<li><i>Nothing</i></li>')
      + '</ul>';

    out = htmlInv;                // already HTML, no markdown needed

  // ───────── take / drop ───────────────────────────────────────────────
  } else if (action === ACTION.TAKE) {
    world.agency++;                                // ← NEW
    if (!target) { out = '_Take what?_'; }
    else {
      const idx = world.objects.findIndex(o => o.name === target && o.inWorld && !o.heldBy);
      if (idx < 0)      out = `🤔 No **${target}** here.`;
      else {
        const [obj] = world.objects.splice(idx, 1);
        world.player.inventory.push(obj.name);
        out = fmt(P.take, obj.name);
      }
    }

  } else if (action === ACTION.DROP) {
    world.agency++;                                // ← NEW
    if (!target) { out = '_Drop what?_'; }
    else {
      const i = world.player.inventory.indexOf(target);
      if (i < 0) out = `🤔 You don’t have **${target}**.`;
      else {
        world.player.inventory.splice(i, 1);
        world.objects.push({ name: target, emoji: getObjectEmoji(target), inWorld: true, heldBy: null });
        out = `🫳 You dropped **${target}**.`;
      }
    }

  // ───────── apologize ────────────────────────────────────────────────
  } else if (action === ACTION.APOLOGIZE) {
    world.agency++;                                // ← NEW
    const npc = world.npcs.find(n => n.name === target);
    if (!npc)      out = `Nobody named **${target}** here.`;
    else {
      const cur = getRelation('you', npc.name);
      const ok  = (cur === RELATION.SUSPICIOUS || cur === RELATION.HOSTILE) && Math.random() < 0.25;
      if (ok) {
        const next = cur === RELATION.HOSTILE ? RELATION.SUSPICIOUS : RELATION.FRIENDLY;
        bump('you', npc.name, next);
        out = fmt(P.apoGood, '', npc.name);
      } else {
        out = fmt(P.apoBad, '', npc.name);
      }
    }

  // ───────── violence bucket ───────────────────────────────────────────
  } else if ([ACTION.HARASS, ACTION.ASSAULT, ACTION.BEAT, ACTION.BIND, ACTION.TOSS, ACTION.USE]
             .includes(action)) {

    world.agency++;                                // ← NEW

    if (!target)                out = '_Target who?_';
    else {
      const npc = world.npcs.find(n => n.name === target && n.alive);
      if (!npc)                 out = `Nobody named **${target}** here.`;
      else {
        let objName = item || null,
            objDef  = null;
        if (objName) {
          if (!world.player.inventory.includes(objName)) {
            out = `🤔 You don’t have **${objName}**.`;
          } else {
            objDef = OBJECTS_TABLE.find(o => o.name === objName);
          }
        }

        if (!out) switch (action) {

          case ACTION.HARASS:
            out = pick(P.harass);
            escalate('you', npc.name, 'sus');
            npc.lastAggressor = 'you';
            break;

          case ACTION.ASSAULT:
            out = pick(P.hit);
            escalate('you', npc.name, 'hostile');
            npc.lastAggressor = 'you';
            break;

          case ACTION.BEAT:
            if (!objDef) { out = '_Beat with what?_'; break; }
            out = `${pick(P.hit)} You hit **${npc.name}** with the **${objDef.name}**.`;
            escalate('you', npc.name, 'hostile');
            npc.lastAggressor = 'you';
            if (Math.random() < 0.25) { npc.alive = false; out += ' 💀'; }
            if (Math.random() < 0.25) {
              world.player.inventory = world.player.inventory.filter(n => n !== objName);
              out += ' The weapon breaks.';
            }
            break;

          case ACTION.BIND:
            if (!objDef || objDef.type !== 'bind') {
              out = '_Need something to bind with._'; break;
            }
            if (Math.random() < 0.8) {
              npc.bound = true;
              out = pick(P.bound);
              world.player.inventory = world.player.inventory.filter(n => n !== objName);
              escalate('you', npc.name, 'hostile');
              npc.lastAggressor = 'you';
            } else {
              out = pick(P.miss);
              bump('you', npc.name, RELATION.SUSPICIOUS);
            }
            break;

          case ACTION.TOSS:
          case ACTION.USE:
            if (!objDef || objDef.type !== 'projectile') {
              out = '_Need a throwable object._'; break;
            }
            const hit = Math.random() < 0.75;
            out = hit ? pick(P.hit) : pick(P.miss);
            escalate('you', npc.name, hit ? 'hostile' : 'sus');
            npc.lastAggressor = 'you';
            world.player.inventory = world.player.inventory.filter(n => n !== objName);
            world.objects.push({ name: objName, emoji: objDef.emoji, inWorld: true, heldBy: null });
            break;
        }
      }
    }


  } else {                               // unknown / fallback
    out = P.unknown;
  }

  world.player.prevAction = action;

  const propsAfter = world.player.inventory.length;
  if (propsAfter > propsBefore) world.properties += propsAfter - propsBefore;

  return out;
}

// ── expose to console & other scripts ────────────────────────────────
if (typeof globalThis !== 'undefined') {
  globalThis.resolvePlayerVerb = resolvePlayerVerb;
  globalThis.parsePlayerInput  = parsePlayerInput;
  globalThis.applyPlayerAction = applyPlayerAction;
}

function getAllNPCNamesInPlay() {
  return world.npcs.map(n => n.name);
}
function getAllObjectNamesInPlay() {
  const inWorld = world.objects.filter(o => o.inWorld && !o.heldBy).map(o => o.name);
  const held = world.npcs.flatMap(n => n.inventory);
  return [...new Set([...inWorld, ...held])];
}

// --- 3. Spawning Logic ---
/* ================================================================
 *  spawnNPC  – creates one NPC instance and seeds its inventory
 * ================================================================ */
function spawnNPC() {
  // 1. choose a template that isn’t already in play
  const namesInPlay = getAllNPCNamesInPlay();
  const candidates  = NPC_TABLE.filter(n => !namesInPlay.includes(n.name));
  if (!candidates.length) return null;

  // 2. instantiate
  const npc = {
    ...pick(candidates),

    /* dynamic state */
    inventory:        [],
    alive:            true,
    bound:            false,
    boundItem:        null,
    /* social bookkeeping */
    lastAggressor:    null,
    lastPartner:      null,
    lastStolenBy:     null,   // who stole from them last turn
    lastStolenWhat:   null    // the object that was stolen
  };

  // 3. give them any starting items listed in their template
  seedNpcInventory(npc);

  // 4. register in world
  world.npcs.push(npc);
  return npc;
}

/* ----------------------------------------------------------------
 *  seedNpcInventory(npc)
 *  – Adds each “carries” item if no other actor/world already has it
 * ---------------------------------------------------------------- */
function seedNpcInventory(npc) {
  if (!(npc.carries && npc.carries.length)) return;

  const taken = getAllObjectNamesInPlay();        // names of items already in use
  npc.carries.forEach(objName => {
    if (taken.includes(objName)) return;          // skip duplicates

    npc.inventory.push(objName);
    world.objects.push({
      name:    objName,
      emoji:   getObjectEmoji(objName),
      inWorld: false,          // starts in inventory
      heldBy:  npc.name
    });
  });
}

function spawnObject() {
  // Only objects not already in play and not in any NPC inventory, up to MAX_OBJECTS
  const inPlay = getAllObjectNamesInPlay();
  const candidates = OBJECTS_TABLE.filter(o =>
    !inPlay.includes(o.name) &&
    o.name !== "body" // special, not counted here
  );
  if (!candidates.length) return null;
  const obj = { ...pick(candidates), inWorld: true, heldBy: null };
  world.objects.push(obj);
  return obj;
}

/* ======================================================================
 *  decideNpcAction(npc)   → { type, target, object }
 *  – smarter weapon selection:
 *      projectile  → throw
 *      bind item   → bind
 *      melee item  → beat
 * ====================================================================== */
function decideNpcAction(npc) {

  /* 1. pick a target ----------------------------------------------- */
  const living = world.npcs.filter(n => n.name !== npc.name && n.alive && !n.bound);
  /* include the player as a potential target --------------------------------*/
  const playerTarget = { name:'you', emoji: PLAYER_EMOJI, alive:true, bound:false };
  living.push(playerTarget);
  let target = null;

  if (npc.lastAggressor && living.some(n => n.name === npc.lastAggressor)) {
    target = living.find(n => n.name === npc.lastAggressor);
  } else if (npc.lastPartner && living.some(n => n.name === npc.lastPartner)) {
    target = living.find(n => n.name === npc.lastPartner);
  } else if (living.length) {
    /* weight by relation */
    const buckets = {
      hostile:    living.filter(n => getRelation(npc.name, n.name) === RELATION.HOSTILE),
      suspicious: living.filter(n => getRelation(npc.name, n.name) === RELATION.SUSPICIOUS),
      friendly:   living.filter(n => getRelation(npc.name, n.name) === RELATION.FRIENDLY)
    };
    target = buckets.hostile[0]    ?? buckets.suspicious[0]
          ?? buckets.friendly[0]   ?? pick(living);
  }

  /* 2. derive inventory buckets ------------------------------------ */
  const invDefs = (npc.inventory || [])
        .map(n => OBJECTS_TABLE.find(o => o.name === n))
        .filter(Boolean);

  const projectile = invDefs.find(d => d.type === 'projectile');
  const bindItem   = invDefs.find(d => d.type === 'bind');
  const meleeItem  = invDefs.find(d => d.type && d.type !== 'projectile' && d.type !== 'bind');

  /* helper to return {type, objectName} */
  const chooseWeaponAction = () => {
    if (projectile && Math.random() < 0.5)        // 50 % chance to throw first
      return { type:'throw', object: projectile.name };
    if (bindItem && Math.random() < 0.4)          // 40 % chance to bind
      return { type:'bind',  object: bindItem.name };
    if (meleeItem)
      return { type:'beat',  object: meleeItem.name };
    return { type:'assault', object:null };
  };

  /* 3. high-level action bucket ------------------------------------ */
  let action;
  const rel = target ? getRelation(npc.name, target.name) : RELATION.NEUTRAL;

  if (!target) {
    action = { type:'idle', object:null };

  } else if (rel === RELATION.HOSTILE) {
    /* mostly violence */
    action = chooseWeaponAction();

  } else if (rel === RELATION.SUSPICIOUS) {
    const roll = Math.random();
    if (roll < 0.45)         action = chooseWeaponAction();
    else if (roll < 0.75)    action = { type:'harass', object:null };
    else                     action = { type:'steal',  object:null };

  } else if (rel === RELATION.FRIENDLY) {
    const roll = Math.random();
    if (roll < 0.40)         action = { type:'help',   object:null };
    else if (roll < 0.80)    action = { type:'idle',   object:null };
    else                     action = { type:'steal',  object:null };

  } else { /* NEUTRAL */
    const roll = Math.random();
    if (roll < 0.50)         action = { type:'harass', object:null };
    else if (roll < 0.75)    action = { type:'steal',  object:null };
    else                     action = chooseWeaponAction();
  }

  return { ...action, target };
}

/* ================================================================
 *  groupBullets(arr)
 *  – merges “X hit Y” + “Y drops Z” → single bullet
 *    simple pattern-match; extend later as needed
 * ================================================================ */
function groupBullets(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const cur  = arr[i];
    const next = arr[i + 1];

    // look for “… hits …” followed by “… drops …”
    if (next && / hits .* with /.test(cur) && / drops /.test(next)) {
      const merged = cur.replace('.', ',') + ' and ' + next.toLowerCase();
      out.push(merged);
      i++;                    // skip next
      continue;
    }
    out.push(cur);
  }
  return out;
}

/* ================================================================
 *  prioritizePlayerBullets(arr)
 *  – keeps original order but lifts any bullet that targets you
 * ================================================================ */
function prioritizePlayerBullets(arr) {
  const isPlayer = b => b.includes('<b>you</b>') || b.includes('🫵');
  const top      = arr.filter(isPlayer);
  const rest     = arr.filter(b => !isPlayer(b));
  return [...top, ...rest];
}

// --- 4. Main Turn Logic ---
function nextTurn(playerCmd, onFinish) {
  turn += 1;
  let bullets = [];

  // === PLAYER ACTION ===
  const playerLine = applyPlayerAction(parsePlayerInput(playerCmd || 'wait'));   // <-- rename
  // (don’t push it into bullets!)

  // === SPAWN LOGIC ===
  if (turn === 1) {
    for (let i = 0; i < 3; ++i) {
      const npc = spawnNPC();
      if (npc) bullets.push(`${npc.emoji} the <b>${npc.name}</b> ${pick(getActionVerbs("spawn"))}.`);
    }
  }
  if (turn % SPAWN_INTERVAL === 0) {
    if (world.npcs.length < MAX_NPCS) {
      const npc = spawnNPC();
      if (npc) bullets.push(`${npc.emoji} the <b>${npc.name}</b> ${pick(getActionVerbs("spawn"))}.`);
    }
    if (world.objects.filter(o => o.inWorld && !o.heldBy).length < MAX_OBJECTS) {
      const obj = spawnObject();
      if (obj) bullets.push(`${obj.emoji} <b>${obj.name}</b> ${pick(getActionVerbs("spawn"))}.`);
    }
  }

  /* ------------------------------------------------ NPC ACTIONS ----- */
  switch (type) {

  /* ───────────── idle ────────────────────────────────────────────── */
  case 'idle': {
    const verb = pick(getActionVerbs('idle'));
    bullets.push(`${npc.emoji} the <b>${npc.name}</b> ${verb}.`);
    break;
  }

  /* ───────────── harass (sus escalator) ──────────────────────────── */
  case 'harass': {
    const verb = pick(getActionVerbs('harass (make sus)'));
    bullets.push(`${npc.emoji} the <b>${npc.name}</b> ${verb} ${fmtTarget(target)}.`);

    escalate(npc.name, target.name, 'sus');
    npc.lastPartner = target.name;
    setAggressor(target, npc.name);          // may overwrite NPC→NPC only
    break;
  }

  /* ───────────── steal / take ────────────────────────────────────── */
  case 'steal': {
    /* ❶ try taking from target’s inventory */
    if (target && target.inventory && target.inventory.length) {
      const objName = pick(target.inventory);
      const objDef  = OBJECTS_TABLE.find(o => o.name === objName) || { emoji:'' };

      const success = Math.random() < 0.7;
      if (success) {
        target.inventory = target.inventory.filter(n => n !== objName);
        npc.inventory.push(objName);

        const verb = pick(getActionVerbs('steal'));
        bullets.push(`${npc.emoji} the <b>${npc.name}</b> ${verb} the ${objDef.emoji} <b>${objName}</b> from ${fmtTarget(target)}.`);

        escalate(npc.name, target.name, 'hostile');
        setAggressor(target, npc.name);
      } else {
        bullets.push(`${npc.emoji} the <b>${npc.name}</b> tries to steal from ${fmtTarget(target)} but fails.`);
        escalate(npc.name, target.name, 'sus');
      }
      break;
    }

    /* ❷ else grab a loose object */
    const loose = world.objects.find(o => o.inWorld && !o.heldBy);
    if (loose) {
      const verb = pick(getActionVerbs('steal'));
      bullets.push(`${npc.emoji} the <b>${npc.name}</b> ${verb} the ${loose.emoji} <b>${loose.name}</b>.`);
      npc.inventory.push(loose.name);
      loose.inWorld = false;
      loose.heldBy  = npc.name;
    } else {
      bullets.push(`${npc.emoji} the <b>${npc.name}</b> feels lacking.`);
    }
    break;
  }

  /* ───────────── assault (bare-handed) ───────────────────────────── */
  case 'assault': {
    const verb = pick(getActionVerbs('assault (no weapon)'));
    bullets.push(`${npc.emoji} the <b>${npc.name}</b> ${verb} ${fmtTarget(target)}.`);

    escalate(npc.name, target.name, 'hostile');
    npc.lastPartner = target.name;
    setAggressor(target, npc.name);
    world.violence++;
    break;
  }

  /* ───────────── bind (rope, zip tie, …) ─────────────────────────── */
  case 'bind': {
    const objDef = OBJECTS_TABLE.find(o => o.name === object && o.type === 'bind');
    if (!objDef) break;

    const verb = pick(getActionVerbs('bind'));
    const success = Math.random() < 0.8;

    if (success) {
      bullets.push(`${npc.emoji} the <b>${npc.name}</b> ${verb} ${fmtTarget(target,'you-hit')} with the ${objDef.emoji} <b>${objDef.name}</b>.`);
      target.bound     = true;
      target.boundItem = objDef;
      npc.inventory = npc.inventory.filter(n => n !== objDef.name);

      escalate(npc.name, target.name, 'hostile');
      setAggressor(target, npc.name);
      world.violence++;
    } else {
      const missVerb = pick(getActionVerbs('missed (by bind)'));
      bullets.push(`${npc.emoji} the <b>${npc.name}</b> ${missVerb} ${fmtTarget(target)}.`);
      escalate(npc.name, target.name, 'sus');
    }
    break;
  }

  /* ───────────── beat (melee weapon) ─────────────────────────────── */
  case 'beat': {
    const objDef = OBJECTS_TABLE.find(o => o.name === object && o.type !== 'bind');
    if (!objDef) break;

    const verb = pick(getActionVerbs('beat (with weapon, medium)'));
    let line   = `${npc.emoji} the <b>${npc.name}</b> ${verb} ${fmtTarget(target)} with the ${objDef.emoji} <b>${objDef.name}</b>.`;

    if (Math.random() < 0.25) {
      const killVerb = pick(getActionVerbs('killed (with attack)'));
      line += ` ${objDef.emoji} <b>${objDef.name}</b> ${killVerb} ${fmtTarget(target)}. 💀`;
      target.alive = false;
      if (target.boundItem) {
        world.objects.push({ ...target.boundItem, inWorld:true, heldBy:null });
        target.boundItem = null;
      }
      world.deaths++;
      world.objects.push({ name:'body', emoji:'💀', inWorld:true, heldBy:null });
    }

    bullets.push(line);

    escalate(npc.name, target.name, 'hostile');
    setAggressor(target, npc.name);
    world.violence++;
    break;
  }

  /* ───────────── throw / projectile ──────────────────────────────── */
  case 'throw': {
    const objDef = OBJECTS_TABLE.find(o => o.name === object && o.type === 'projectile');
    if (!objDef) break;

    const verbThrow = pick(getActionVerbs('throw'));
    let line = `${npc.emoji} the <b>${npc.name}</b> ${verbThrow} the ${objDef.emoji} <b>${objDef.name}</b> at ${fmtTarget(target)}.`;

    const hit = Math.random() < 0.75;
    if (hit) {
      const verbHit = pick(getActionVerbs('hit (with attack)'));
      line += ` ${objDef.emoji} <b>${objDef.name}</b> ${verbHit} ${fmtTarget(target)}.`;

      if (Math.random() < 0.30) {
        const verbKill = pick(getActionVerbs('killed (with attack)'));
        line += ` ${objDef.emoji} <b>${objDef.name}</b> ${verbKill} ${fmtTarget(target)}. 💀`;
        target.alive = false;
        if (target.boundItem) {
          world.objects.push({ ...target.boundItem, inWorld:true, heldBy:null });
          target.boundItem = null;
        }
        world.deaths++;
        world.objects.push({ name:'body', emoji:'💀', inWorld:true, heldBy:null });
      }

      escalate(npc.name, target.name, 'hostile');
      setAggressor(target, npc.name);
      world.violence++;
    } else {
      const missVerb = pick(getActionVerbs('misses'));
      line += ` ${objDef.emoji} <b>${objDef.name}</b> ${missVerb}.`;
      escalate(npc.name, target.name, 'sus');
    }

    bullets.push(line);

    npc.inventory = npc.inventory.filter(n => n !== objDef.name);
    world.objects.push({ name:objDef.name, emoji:objDef.emoji, inWorld:true, heldBy:null });
    break;
  }

  /* ───────────── help / friendly assist ──────────────────────────── */
  case 'help': {
    const verb = pick(getActionVerbs('help (friendly, no target)'));
    bullets.push(`${npc.emoji} the <b>${npc.name}</b> ${verb} ${fmtTarget(target)}.`);
    npc.lastPartner = target.name;
    break;
  }

  /* (add future action-types above) ---------------------------------- */
  }

  }

  // === MOOD TEXT ===
  let moodText = pickMoodText();

  // === PROMPT ===
  let promptText = pickMoodSequence(MOOD_TEXT.prompt);

  // reset theft flags for the next turn
  world.npcs.forEach(n => { n.lastStolenBy = null; n.lastStolenWhat = null; });

  // merge causal bullets
  bullets = groupBullets(bullets);
  bullets = prioritizePlayerBullets(bullets);

  // === HISTORY ===
  world.turnHistory.push({ bullets, moodText, promptText });
  renderTurn(
    turn,
    playerLine,   // player line (may be an empty string)
    bullets,      // NPC bullets only
    moodText,
    promptText,
    onFinish
  );
}

// --- 5. Flexible Bullet Formatting ---
function getActionVerbs(type) {
  let act = BULLET_ACTIONS.find(a => a.type === type);
  return act ? act.verbs : ["does something"];
}

function getObjectEmoji(objName) {
  let obj = OBJECTS_TABLE.find(o => o.name === objName);
  return obj ? obj.emoji : "";
}

function formatActionBullet(npc, targetNPC, action, verb, obj) {
  // Handles is/with/at rules, bolding, emoji.
  let actor = `${npc.emoji} the <b>${npc.name}</b>`;
  let target = targetNPC ? `${targetNPC.emoji} the <b>${targetNPC.name}</b>` : "";
  let objectStr = obj ? `${obj.emoji} the <b>${obj.name}</b>` : "";

  let s = "";
  // if (action.is) s += "is ";
  s += actor;
  if (verb) s += ` ${verb}`;
  if (action.withObj === "with" && objectStr) s += ` with ${objectStr}`;
  if (action.withObj === "at" && objectStr && target) s += ` ${objectStr} at ${target}`;
  else if (target) s += ` ${target}`;
  s += ".";
  return s;
}

// --- Utility: Shuffle ---
function shuffle(array) {
  // Fisher-Yates
  let a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- 6. Mood Selection ---
function pickMoodText() {
  const active = activeMoodKeys();
  const pool   = active.length ? active : ['random_2', 'random_3'];   // fallback

  // choose 2-4 unique categories per turn
  const catCnt = Math.min(4, Math.max(2, pool.length));
  const cats   = shuffle(pool).slice(0, catCnt);

  return cats
    .map(cat => pickMoodSequence(MOOD_TEXT[cat]))
    .join(' ');
}

// --- 7. UI Rendering & Initialization ---
// --- New renderTurn with typewriter animation and auto-scroll-to-bottom ---
function renderTurn(turnNum, playerLine, bullets, moodText, promptText, onFinish) {
  const chatHistory = document.getElementById('chat-history');
  const nextTurnBtn = document.getElementById('next-turn');
  nextTurnBtn.disabled = true;
  if (typeof running !== "undefined") running = true;

  // Build the main block
  let wrapper = document.createElement('div');
  wrapper.className = 'turn-block';
  wrapper.style.marginBottom = '1.5em';

  // —— PLAYER OUTPUT (above the header) ——
  let playerDiv = document.createElement('div');
  playerDiv.style.margin = '0 0 0.6em 0';
  playerDiv.innerHTML = playerLine.includes('<table')
  ? playerLine               // already HTML
  : md(playerLine);          // plain markdown
  wrapper.appendChild(playerDiv);

  /* ----- dynamic “here’s what happened” header & list --------------- */
  const hasBullets = bullets && bullets.length;

  let ul = null;                               // will hold <ul> if needed
  if (hasBullets) {
    let header = document.createElement('div');
    header.className = 'subhdr';               // .subhdr has bold/size CSS
    header.textContent = "✅ Here's what happened:";
    wrapper.appendChild(header);

    ul = document.createElement('ul');
    ul.style.margin = '0 0 1.2em 1.5em';
    ul.style.padding = '0';
    wrapper.appendChild(ul);
  }

  /* ----- mood & prompt containers ---------------------------------- */
  let moodDiv = document.createElement('div');
  moodDiv.style.margin = '1em 0';
  moodDiv.style.color  = '#3b444b';

  let promptDiv = document.createElement('div');
  promptDiv.style.margin   = '1em 0 0.5em 0';
  promptDiv.style.fontSize = '1.05em';

  wrapper.appendChild(moodDiv);
  wrapper.appendChild(promptDiv);
  chatHistory.appendChild(wrapper);

  let speed = 18;
  let bulletIdx = 0;
  let liNodes = [];

  // Improved typewriter for HTML/text chunks
  function typeBulletWithBold(li, bullet, doneCallback) {
    // Split into chunks (HTML tags vs text)
    const chunks = [];
    const regex = /(<b>.*?<\/b>)/g;
    let lastIndex = 0, match;
    while ((match = regex.exec(bullet)) !== null) {
      if (match.index > lastIndex) {
        chunks.push({ text: bullet.slice(lastIndex, match.index), isHTML: false });
      }
      chunks.push({ text: match[0], isHTML: true });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < bullet.length) {
      chunks.push({ text: bullet.slice(lastIndex), isHTML: false });
    }

    let chunkIdx = 0, charIdx = 0;
    let buffer = ""; // Always append new chunk to this

    function typeNextChunk() {
      if (chunkIdx >= chunks.length) {
        li.innerHTML = buffer; // Done
        if (doneCallback) doneCallback();
        return;
      }
      const chunk = chunks[chunkIdx];
      if (chunk.isHTML) {
        buffer += chunk.text;
        li.innerHTML = buffer;
        chunkIdx++;
        charIdx = 0;
        setTimeout(typeNextChunk, 50);
      } else {
        if (charIdx <= chunk.text.length) {
          li.innerHTML = buffer + chunk.text.slice(0, charIdx);
          chatHistory.scrollTop = chatHistory.scrollHeight;
          charIdx++;
          setTimeout(typeNextChunk, speed);
        } else {
          buffer += chunk.text;
          chunkIdx++;
          charIdx = 0;
          setTimeout(typeNextChunk, 0);
        }
      }
    }
    typeNextChunk();
  }

  function typeBullets() {
    if (!bullets.length) {            // NEW – meta actions skip header
      setTimeout(typeMood, 150);
      return;
    }
    if (bulletIdx < bullets.length) {
      if (!liNodes[bulletIdx]) {
        let li = document.createElement('li');
        li.style.marginBottom = '0.3em';
        ul.appendChild(li);
        liNodes[bulletIdx] = li;
      }
      typeBulletWithBold(liNodes[bulletIdx], bullets[bulletIdx], function() {
        bulletIdx++;
        setTimeout(typeBullets, 90);
      });
    } else {
      setTimeout(typeMood, 150);
    }
  }

  function typeMood() {
    let charIdx = 0;
    function typeNext() {
      if (charIdx <= moodText.length) {
        moodDiv.textContent = moodText.slice(0, charIdx);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        charIdx++;
        setTimeout(typeNext, speed);
      } else {
        setTimeout(typePrompt, 150);
      }
    }
    typeNext();
  }

  function typePrompt() {
    // Split prompt into sentences, bold the last one only
    // Handles . ! ? for sentence ends
    let sentences = promptText.match(/[^.!?]+[.!?]*/g) || [promptText];
    let nonBold = sentences.slice(0, -1).join('').trim();
    let last = sentences[sentences.length - 1]?.trim() || '';
    let full = (nonBold ? nonBold + ' ' : '') + (last ? `<b>${last}</b>` : '');

    let charIdx = 0;
    function typeNext() {
      if (charIdx <= full.length) {
        // Only reveal valid HTML tags or plain text up to current char
        let current = full.slice(0, charIdx);
        // If in the middle of a tag, don't output the incomplete tag
        let openTag = current.lastIndexOf('<');
        let closeTag = current.lastIndexOf('>');
        if (openTag > closeTag) {
          // Omit incomplete tag
          promptDiv.innerHTML = current.slice(0, openTag);
        } else {
          promptDiv.innerHTML = current;
        }
        chatHistory.scrollTop = chatHistory.scrollHeight;
        charIdx++;
        setTimeout(typeNext, speed);
      } else {
        promptDiv.innerHTML = full;
        nextTurnBtn.disabled = !autoMode ? false : true;
        if (typeof running !== "undefined") running = false;

        while (chatHistory.children.length > 10) {
          chatHistory.removeChild(chatHistory.firstChild);
        }

        if (onFinish) onFinish();
      }
    }
    typeNext();
  }

  typeBullets();
}

// --- 8. Run! ---
// UI mode/runner for auto/manual
let autoMode = true;
let pendingCommand = 'wait';   // default when player hits enter with empty box
let steps = 1000;
let t = 0;
let running = false;

// DOM refs
const chatHistory = document.getElementById('chat-history');
const nextTurnBtn = document.getElementById('next-turn');
const autoToggle = document.getElementById('auto-mode');

// Flexible turn runner
function runStep() {
  if (t >= steps) { nextTurnBtn.disabled = true; return; }

  running = true;
  const cmd = commandQueue.length ? commandQueue.shift() : 'wait';

  const { action } = parsePlayerInput(cmd);
  if (isMetaAction(action)) {
    /* just render the meta output, no turn++, no NPC actions */
    const playerLine = applyPlayerAction({ action, target:null, item:null });
    renderTurn('--', playerLine, [], '', '', () => {
      running = false;
      nextTurnBtn.disabled = false;     // allow immediate next command
    });
    return;      // skip normal turn logic
  }

  nextTurn(cmd, () => {
    t++;
    running = false;
    nextTurnBtn.disabled = false;   // always enabled for manual play
  });
}

// --- UI control handlers ---
autoToggle.addEventListener('change', (e) => {
  nextTurnBtn.disabled = autoToggle.checked;
});

nextTurnBtn.addEventListener('click', () => {
  if (!running && t < steps) runStep();
});

// ---- INIT ----
function resetAll() {
  t = 0;
  world = {
    npcs: [],
    objects: [],
    bodies: [],
    turnHistory: [],
    deaths: 0,
    violence:     0,   // number of violent NPC → NPC or player actions
    tension:      0,   // number of hostile or suspicious relation bumps
    properties:   0,   // player-held items
    agency:       0,    // successful player actions (non-wait)

    // keep the social graph alive
    player: {
      inventory: [],
      lastAggressor: null
    },
    relations: new Map()
  };
  chatHistory.innerHTML = "";
  running = false;
  nextTurnBtn.disabled = autoMode;
}

// ---- STARTUP ----
resetAll();
if (autoMode) runStep();
else nextTurnBtn.disabled = false;

}); // End of DOMContentLoaded

