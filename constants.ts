/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { IntroStyle, VoiceSettings, EmotionSettings } from './types';

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  pitch: 0,
  speed: 1.0,
  intensity: 50,
  style: 'natural',
  tone: 'warm',
  dialect: 'General',
  purpose: 'storytelling',
};

export const DEFAULT_EMOTION_SETTINGS: EmotionSettings = {
  autoAnalyze: false,
  emotionalStyle: 'natural',
};

export const PRESET_STYLES = [
  { value: 'cinematic', label: 'CINEMATIC (سينمائي فخم)' },
  { value: 'dramatic', label: 'DRAMATIC (درامي مشوق)' },
  { value: 'intense', label: 'INTENSE (حماسي قوي)' },
  { value: 'calm', label: 'CALM (هادئ وواثق)' },
  { value: 'epic trailer', label: 'EPIC TRAILER (إعلان ملحمي)' },
  { value: 'documentary', label: 'DOCUMENTARY (وثائقي رصين)' },
  { value: 'storytelling', label: 'STORYTELLING (روائي قصصي)' },
  { value: 'natural', label: 'NATURAL (طبيعي واقعي)' },
];

export const PRESET_TONES = [
  { value: 'deep', label: 'DEEP (جهوري عميق)' },
  { value: 'authoritative', label: 'AUTHORITATIVE (صارم وموثوق)' },
  { value: 'warm', label: 'WARM (دافئ وقريب)' },
  { value: 'gravelly', label: 'GRAVELLY (أجش مميز)' },
  { value: 'sharp', label: 'SHARP (حاد ومؤثر)' },
  { value: 'mysterious', label: 'MYSTERIOUS (غامض ومثير)' },
  { value: 'mature', label: 'MATURE (ناضج ووقور)' },
  { value: 'youthful', label: 'YOUTHFUL (شبابي منطلق)' },
];

export const PRESET_INTENSITIES = [
  { value: 95, label: '95% (ذروة الحماس والمجد)' },
  { value: 90, label: '90% (قوي جداً ومؤثر)' },
  { value: 85, label: '85% (أداء سينمائي متوازن)' },
  { value: 75, label: '75% (متوسط مشحون)' },
  { value: 65, label: '65% (معتدل هادئ)' },
  { value: 50, label: '50% (طبيعي اعتيادي)' },
];

export const PRESET_CADENCES = [
  { value: 0.85, label: '0.85x (تأني ملحمي بطيء)' },
  { value: 0.90, label: '0.90x (تأني درامي ثقيل)' },
  { value: 0.95, label: '0.95x (إيقاع سينمائي متزن)' },
  { value: 1.00, label: '1.00x (سرعة قياسية طبيعية)' },
  { value: 1.10, label: '1.10x (حماسي سريع)' },
  { value: 1.20, label: '1.20x (إعلان ترويجي خاطف)' },
];


export const INTRO_STYLES: IntroStyle[] = [
  {
    id: 'arabic_trailer',
    name: 'إعلان سينمائي عربي',
    description: `# الأداء الصوتي: إعلان سينمائي عربي فخم
إلقاء درامي واثق بنبرة سينمائية عميقة ومؤثرة. مخارج حروف فصيحة ومتقنة مع وقفات تنفس طبيعية تبني التشويق والإثارة بأداء بشري فخم ودافئ.`,
    defaultVoice: 'Charon',
    color: 'red',
    icon: 'circle',
    templateText: `في عالم تتسارع فيه الأحداث وتتبدل فيه المقاييس...
فريق واحد تجرأ على خوض التحدي ومواجهة المستحيل.
واجهوا الصعاب، حطموا العقبات، وصنعوا الفارق.
والآن... حان وقت الحقيقة.
قريباً في شاشات العرض.`,
    customVoiceSettings: {
      pitch: 0,
      speed: 1.0,
      intensity: 85,
      style: 'cinematic',
      tone: 'deep',
      dialect: 'Modern Standard Arabic',
      purpose: 'cinematic narration',
    },
    customEmotionSettings: {
      autoAnalyze: false,
      manualEmotion: 'فخر وعزيمة ملحمية',
      emotionalStyle: 'cinematic',
    },
  },
  {
    id: 'trailer',
    name: 'Movie Trailer',
    description: `# AUDIO PROFILE: Cinematic Movie Trailer Narrator
Deliver with compelling cinematic gravitas, commanding presence, and authentic human warmth.
Confident, deliberate pacing with natural breath pauses between phrases to build dramatic tension.
Clear resonant chest articulation, avoiding robotic stiffness or forced vocal fry.`,
    defaultVoice: 'Charon',
    color: 'black',
    icon: 'circle',
    templateText: `In a world where quarterly goals were thought to be impossible...
One team dared to defy the odds.
They faced bugs... they faced scope creep... they faced... THE DEADLINE.
And they prevailed.
Coming to a screen near you.`,
    customVoiceSettings: {
      pitch: 0,
      speed: 1.0,
      intensity: 85,
      style: 'cinematic',
      tone: 'deep',
      dialect: 'General American',
      purpose: 'cinematic narration',
    },
    customEmotionSettings: {
      autoAnalyze: false,
      manualEmotion: 'Epic Gravity & Thrill',
      emotionalStyle: 'cinematic',
    },
  },
  {
    id: 'radio',
    name: 'Radio DJ',
    description: `# AUDIO PROFILE: Dynamic Radio Host
Bright, upbeat, and charismatic broadcast delivery with infectious energy and natural smiling cadence.
Fluid conversational pacing with punchy articulation and natural airflow.`,
    defaultVoice: 'Fenrir',
    color: 'yellow',
    icon: 'square',
    templateText: "Yes, massive vibes in the studio! You are locked in and it is absolutely popping off in London right now. If you're stuck on the tube, or just sat there pretending to work... stop it. Seriously, I see you. Turn this up! We’ve got the project roadmap landing in three, two... let's go!",
    customVoiceSettings: {
      pitch: 0,
      speed: 1.05,
      intensity: 90,
      style: 'intense',
      tone: 'youthful',
      dialect: 'British Estuary',
      purpose: 'advertisement',
    },
    customEmotionSettings: {
      autoAnalyze: false,
      manualEmotion: 'High Energy Hype',
      emotionalStyle: 'intense',
    },
  },
  {
    id: 'influencer',
    name: 'Beauty Influencer',
    description: `# AUDIO PROFILE: Lifestyle Creator
Natural, conversational, and relatable creator delivery.
Engaging friendly inflection with spontaneous micro-pauses and warm personal tone.`,
    defaultVoice: 'Leda',
    color: 'blue',
    icon: 'circle',
    templateText: "Okay, wait, ignore the hair. I literally just woke up. So, everyone has been asking about the lip combo, and I honestly wasn't gonna share it. Because I am a gatekeeper. Just kidding. But seriously, look at this gloss. It is giving... glazed donut. Wait, do I look orange in this lighting? Whatever. You guys get the vibe.",
    customVoiceSettings: {
      pitch: 0,
      speed: 1.02,
      intensity: 80,
      style: 'natural',
      tone: 'youthful',
      dialect: 'Southern California GenZ',
      purpose: 'social media',
    },
    customEmotionSettings: {
      autoAnalyze: false,
      manualEmotion: 'Sassy & Excited',
      emotionalStyle: 'natural',
    },
  },
  {
    id: 'podcaster',
    name: 'Podcaster',
    description: `# AUDIO PROFILE: Long-form Podcaster
Warm, intimate, and thoughtful conversational storytelling.
Relaxed natural cadence with organic thinking pauses, grounded presence, and genuine human warmth.`,
    defaultVoice: 'Puck',
    color: 'green',
    icon: 'circle',
    templateText: "Hey everyone, welcome back. I was actually debating what to talk about today, but then I had this conversation this morning that I just... I have to share it with you. We get so obsessed with the end goal that we forget the process is literally ninety percent of our lives. We got a great one lined up for today, so let's get into it.",
    customVoiceSettings: {
      pitch: 0,
      speed: 1.0,
      intensity: 75,
      style: 'documentary',
      tone: 'warm',
      dialect: 'Clean American General',
      purpose: 'podcast',
    },
    customEmotionSettings: {
      autoAnalyze: false,
      manualEmotion: 'Thoughtful Contemplation',
      emotionalStyle: 'natural',
    },
  },
  {
    id: 'asmr',
    name: 'ASMR Pro',
    description: `# AUDIO PROFILE: Soothing ASMR
Soft, intimate, whispered vocal delivery with gentle breath support and relaxed, peaceful pacing.
Calming and organic presence with subtle near-mic intimacy.`,
    defaultVoice: 'Enceladus',
    color: 'blue',
    icon: 'circle',
    templateText: "Hey... I literally just got out of the ocean, so if I sound a bit salty... that’s why. Can you hear the waves behind me? The energy out here today is just... naur, it’s actually insane. It’s so light. Wait, stay still. You have a little bit of technical debt right there. There.. All gone.",
    customVoiceSettings: {
      pitch: 0,
      speed: 0.95,
      intensity: 40,
      style: 'calm',
      tone: 'mysterious',
      dialect: 'Australian Gold Coast',
      purpose: 'storytelling',
    },
    customEmotionSettings: {
      autoAnalyze: false,
      manualEmotion: 'Tranquil Whispered Calm',
      emotionalStyle: 'calm',
    },
  },
  {
    id: 'corporate_santa',
    name: 'CEO Santa',
    description: `# AUDIO PROFILE: Jovial Storyteller
Warm, rich, hearty grandfatherly narration filled with genuine cheer and resonant chest warmth.
Deliberate rhythmic pacing with lively festive spirit and warm smiles in the voice.`,
    defaultVoice: 'Charon',
    color: 'red',
    icon: 'square',
    templateText: `Ho, ho, ho! and happy holidays to all! Steady on the reins, old friends! We have a special surprise to deploy! Before the dolls and trains, let's give the world a smarter kind of joy. On Dasher! on dancer! lets get these early gifts for everyone: the power of Gemini!`,
    customVoiceSettings: {
      pitch: 0,
      speed: 1.0,
      intensity: 85,
      style: 'dramatic',
      tone: 'mature',
      dialect: 'Warm Jovial Grandfather',
      purpose: 'storytelling',
    },
    customEmotionSettings: {
      autoAnalyze: false,
      manualEmotion: 'Warm Jovial Mirth',
      emotionalStyle: 'dramatic',
    },
  }
];

export const CUSTOM_STYLE: IntroStyle = {
  id: 'custom',
  name: 'Make Your Own',
  description: 'Configure your own custom introducer.',
  defaultVoice: 'Puck',
  color: 'white',
  icon: 'plus',
  templateText: "Enter your voice-over script here. Your exact words will be preserved 100%, delivered with cinematic dramatic emotion, realistic human breathing, and natural cadence.",
};

export const SUPPORTED_LANGUAGES = [
  { name: 'Afrikaans (South Africa)', code: 'af-ZA' },
  { name: 'Albanian (Albania)', code: 'sq-AL' },
  { name: 'Amharic (Ethiopia)', code: 'am-ET' },
  { name: 'Arabic (Egypt)', code: 'ar-EG' },
  { name: 'Arabic (World)', code: 'ar-001' },
  { name: 'Armenian (Armenia)', code: 'hy-AM' },
  { name: 'Azerbaijani (Azerbaijan)', code: 'az-AZ' },
  { name: 'Bangla (Bangladesh)', code: 'bn-BD' },
  { name: 'Basque (Spain)', code: 'eu-ES' },
  { name: 'Belarusian (Belarus)', code: 'be-BY' },
  { name: 'Bulgarian (Bulgaria)', code: 'bg-BG' },
  { name: 'Burmese (Myanmar)', code: 'my-MM' },
  { name: 'Catalan (Spain)', code: 'ca-ES' },
  { name: 'Cebuano (Philippines)', code: 'ceb-PH' },
  { name: 'Chinese, Mandarin (China)', code: 'cmn-CN' },
  { name: 'Chinese, Mandarin (Taiwan)', code: 'cmn-tw' },
  { name: 'Croatian (Croatia)', code: 'hr-HR' },
  { name: 'Czech (Czech Republic)', code: 'cs-CZ' },
  { name: 'Danish (Denmark)', code: 'da-DK' },
  { name: 'Dutch (Netherlands)', code: 'nl-NL' },
  { name: 'English (Australia)', code: 'en-AU' },
  { name: 'English (India)', code: 'en-IN' },
  { name: 'English (United Kingdom)', code: 'en-GB' },
  { name: 'English (United States)', code: 'en-US' },
  { name: 'Estonian (Estonia)', code: 'et-EE' },
  { name: 'Filipino (Philippines)', code: 'fil-PH' },
  { name: 'Finnish (Finland)', code: 'fi-FI' },
  { name: 'French (Canada)', code: 'fr-CA' },
  { name: 'French (France)', code: 'fr-FR' },
  { name: 'Galician (Spain)', code: 'gl-ES' },
  { name: 'Georgian (Georgia)', code: 'ka-GE' },
  { name: 'German (Germany)', code: 'de-DE' },
  { name: 'Greek (Greece)', code: 'el-GR' },
  { name: 'Gujarati (India)', code: 'gu-IN' },
  { name: 'Haitian Creole (Haiti)', code: 'ht-HT' },
  { name: 'Hebrew (Israel)', code: 'he-IL' },
  { name: 'Hindi (India)', code: 'hi-IN' },
  { name: 'Hungarian (Hungary)', code: 'hu-HU' },
  { name: 'Icelandic (Iceland)', code: 'is-IS' },
  { name: 'Indonesian (Indonesia)', code: 'id-ID' },
  { name: 'Italian (Italy)', code: 'it-IT' },
  { name: 'Japanese (Japan)', code: 'ja-JP' },
  { name: 'Javanese (Java)', code: 'jv-ID' },
  { name: 'Kannada (India)', code: 'kn-IN' },
  { name: 'Konkani (India)', code: 'kok-IN' },
  { name: 'Korean (South Korea)', code: 'ko-KR' },
  { name: 'Lao (Laos)', code: 'lo-LA' },
  { name: 'Latin (Vatican City)', code: 'la-VA' },
  { name: 'Latvian (Latvia)', code: 'lv-LV' },
  { name: 'Lithuanian (Lithuania)', code: 'lt-LT' },
  { name: 'Luxembourgish (Luxembourg)', code: 'lb-LU' },
  { name: 'Macedonian (North Macedonia)', code: 'mk-MK' },
  { name: 'Maithili (India)', code: 'mai-IN' },
  { name: 'Malagasy (Madagascar)', code: 'mg-MG' },
  { name: 'Malay (Malaysia)', code: 'ms-MY' },
  { name: 'Malayalam (India)', code: 'ml-IN' },
  { name: 'Marathi (India)', code: 'mr-IN' },
  { name: 'Mongolian (Mongolia)', code: 'mn-MN' },
  { name: 'Nepali (Nepal)', code: 'ne-NP' },
  { name: 'Norwegian, Bokmål (Norway)', code: 'nb-NO' },
  { name: 'Norwegian, Nynorsk (Norway)', code: 'nn-NO' },
  { name: 'Odia (India)', code: 'or-IN' },
  { name: 'Pashto (Afghanistan)', code: 'ps-AF' },
  { name: 'Persian (Iran)', code: 'fa-IR' },
  { name: 'Polish (Poland)', code: 'pl-PL' },
  { name: 'Portuguese (Brazil)', code: 'pt-BR' },
  { name: 'Portuguese (Portugal)', code: 'pt-PT' },
  { name: 'Punjabi (India)', code: 'pa-IN' },
  { name: 'Romanian (Romania)', code: 'ro-RO' },
  { name: 'Russian (Russia)', code: 'ru-RU' },
  { name: 'Serbian (Serbia)', code: 'sr-RS' },
  { name: 'Sindhi (India)', code: 'sd-IN' },
  { name: 'Sinhala (Sri Lanka)', code: 'si-LK' },
  { name: 'Slovak (Slovakia)', code: 'sk-SK' },
  { name: 'Slovenian (Slovenia)', code: 'sl-SI' },
  { name: 'Spanish (Latin America)', code: 'es-419' },
  { name: 'Spanish (Mexico)', code: 'es-MX' },
  { name: 'Spanish (Spain)', code: 'es-ES' },
  { name: 'Swahili (Kenya)', code: 'sw-KE' },
  { name: 'Swedish (Sweden)', code: 'sv-SE' },
  { name: 'Tamil (India)', code: 'ta-IN' },
  { name: 'Telugu (India)', code: 'te-IN' },
  { name: 'Thai (Thailand)', code: 'th-TH' },
  { name: 'Turkish (Turkey)', code: 'tr-TR' },
  { name: 'Ukrainian (Ukraine)', code: 'uk-UA' },
  { name: 'Urdu (Pakistan)', code: 'ur-PK' },
  { name: 'Vietnamese (Vietnam)', code: 'vi-VN' },
];

export const DEMO_TAGS_PRESET: IntroStyle = {
  id: 'demo_tags_master',
  name: '🎬 نموذج وسوم الإلقاء السريع',
  description: 'نموذج عملي سينمائي يوضح استخدام الوقفات الدرامية، الهمس، الحماس، التوكيد، والنبرة الختامية',
  defaultVoice: 'Charon',
  templateText: `[بغموض وتشويق] في عالمٍ تلاشت فيه كل الآمال... [وقفة: ثانية]
حيث لم يعد هناك متسعٌ للتردد. [تنفس عميق]
[بهمس] هل تسمع هذا الصوت في الأفق؟ [وقفة: نصف ثانية]
[بحماس] إنه ليس مجرد صدى... [توكيد قوي] بل بداية فجر جديد!
[بجدية ورصانة] عندما تقرر خوض التحدي، فلا مجال للتراجع.
[نبرة ختامية] قريباً في دور العرض... سينيرجي للإنتاج السينمائي.`,
  color: 'yellow',
  icon: 'triangle',
  isCustom: true,
  customVoiceSettings: {
    pitch: 0,
    speed: 1.0,
    intensity: 75,
    style: 'cinematic',
    tone: 'deep',
    dialect: 'Modern Standard Arabic',
    purpose: 'cinematic narration'
  },
  customEmotionSettings: {
    autoAnalyze: false,
    manualEmotion: 'dramatic',
    emotionalStyle: 'cinematic'
  }
};

export const DEMO_PODCAST_PRESET: IntroStyle = {
  id: 'demo_podcast_dialogue',
  name: '🎙️ نموذج بودكاست ثنائي تفاعلي',
  description: 'نموذج تفاعلي لبودكاست حواري يوضح تبادل الأدوار بين المقدم والضيف مع الضحك والتفاعل والوقفات الطبيعية',
  defaultVoice: 'Fenrir',
  templateText: `[المقدم: سعد] [بابتسامة وترحاب] مرحباً بكم جميعاً في حلقة جديدة من بودكاست "حديث الأفكار"... [وقفة: نصف ثانية] ضيفنا اليوم خبير في الذكاء الاصطناعي وصناعة المستقبل. أهلاً بك يا منى!

[الضيف: منى] [بفرح وعفوية] أهلاً بك يا سعد، وسعيدة جداً بوجودي معكم ومع المتابعين اليوم! [ضحكة خفيفة]

[المقدم: سعد] [بجدية واهتمام] السؤال الأبرز الذي يشغل الجميع مؤخراً: [وقفة: ثانية] هل سيغير الذكاء الاصطناعي قواعد اللعبة بالكامل؟

[الضيف: منى] [بثقة وتأنٍ] بلا أدنى شك، التغيير لم يعد قادماً... [توكيد قوي] بل نحن نعيش في قلبه الآن!

[المقدم: سعد] [نبرة ختامية] ترقبوا الحلقة كاملة عبر منصات البودكاست المفضلة لديكم.`,
  color: 'blue',
  icon: 'half-circle',
  isCustom: true,
  customVoiceSettings: {
    pitch: 0,
    speed: 1.0,
    intensity: 50,
    style: 'natural',
    tone: 'youthful',
    dialect: 'Modern Standard Arabic',
    purpose: 'podcast'
  },
  customEmotionSettings: {
    autoAnalyze: false,
    manualEmotion: 'cheerful',
    emotionalStyle: 'natural'
  }
};

export const DEFAULT_MODEL_PRESETS: IntroStyle[] = [DEMO_TAGS_PRESET, DEMO_PODCAST_PRESET];
