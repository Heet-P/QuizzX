"use client";

import { useState, type ComponentType } from "react";
import {
  Upload,
  Clock,
  Eye,
  Navigation2,
  Lock,
  AlertTriangle,
  Hash,
  AlertCircle,
  Shuffle,
  Copy,
  Settings,
  Users,
  Calendar,
  Key,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Loader,
  FileText,
  Zap,
  Target,
  BookOpen,
  Mic,
  Ban,
  AlignJustify,
  ArrowLeftRight,
  ArrowRight,
  Pencil,
  SkipForward,
  Siren,
  Check,
  FileSearch,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { apiFetch, errorMessage } from "@/lib/api-client";
import {
  questionType,
  type QuizSettings,
  type QuizQuestion,
  type McqSingleQuestion,
  type McqMultiQuestion,
  type FillBlankQuestion,
  type MatchColumnsQuestion,
} from "@/types/quiz";

type ModularSettings = Pick<
  QuizSettings,
  | "timer"
  | "duration"
  | "secondsPerQuestion"
  | "visibility"
  | "navigation"
  | "answerLock"
  | "shuffleQuestions"
  | "shuffleOptions"
  | "pointsPerCorrect"
  | "negativeMarking"
  | "tabSwitch"
  | "copyProtection"
> & { quiz_mode?: QuizSettings["quiz_mode"]; max_team_size?: number };

interface Preset {
  name: string;
  Icon: ComponentType<{ size?: number }>;
  desc: string;
  settings: ModularSettings;
}

const PRESETS: Preset[] = [
  {
    name: "Exam Mode",
    Icon: FileText,
    desc: "Global timer, single question view, free navigation",
    settings: { timer: "global", duration: 60, secondsPerQuestion: 30, visibility: "single", navigation: "free", answerLock: "changeable", shuffleQuestions: false, shuffleOptions: false, pointsPerCorrect: 1, negativeMarking: 0, tabSwitch: "auto_submit", copyProtection: true },
  },
  {
    name: "Speed Round",
    Icon: Zap,
    desc: "Per-question timer, forward only, locked answers",
    settings: { timer: "per_question", duration: 60, secondsPerQuestion: 15, visibility: "single", navigation: "forward_only", answerLock: "lock_on_next", shuffleQuestions: true, shuffleOptions: true, pointsPerCorrect: 1, negativeMarking: 0, tabSwitch: "auto_submit", copyProtection: true },
  },
  {
    name: "Lockdown",
    Icon: Target,
    desc: "Strict exam with shuffle, negative marking, no going back",
    settings: { timer: "global", duration: 45, secondsPerQuestion: 30, visibility: "single", navigation: "sequential_locked", answerLock: "lock_on_next", shuffleQuestions: true, shuffleOptions: true, pointsPerCorrect: 2, negativeMarking: -0.5, tabSwitch: "auto_submit", copyProtection: true },
  },
  {
    name: "Practice",
    Icon: BookOpen,
    desc: "No timer, all questions visible, free navigation",
    settings: { timer: "none", duration: 60, secondsPerQuestion: 30, visibility: "all", navigation: "free", answerLock: "changeable", shuffleQuestions: false, shuffleOptions: false, pointsPerCorrect: 1, negativeMarking: 0, tabSwitch: "disabled", copyProtection: false },
  },
  {
    name: "Interview Prep",
    Icon: Mic,
    desc: "Relaxed timed, all visible, explainer-friendly",
    settings: { timer: "global", duration: 90, secondsPerQuestion: 60, visibility: "all", navigation: "free", answerLock: "changeable", shuffleQuestions: false, shuffleOptions: false, pointsPerCorrect: 1, negativeMarking: 0, tabSwitch: "disabled", copyProtection: false },
  },
];

const DEFAULT_SETTINGS = PRESETS[0].settings;

function SettingSelect<T extends string>({
  label,
  icon: Icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon?: ComponentType<{ size?: number }>;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; Icon?: ComponentType<{ size?: number }> }[];
}) {
  return (
    <div>
      <label className="flex items-center gap-1 font-accent font-bold text-xs uppercase mb-1">
        {Icon && <Icon size={14} />} {label}
      </label>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-accent font-bold rounded-[var(--radius-btn)] border-2 border-ink/10 transition-all ${
              value === opt.value ? "bg-ink text-white" : "bg-white hover:bg-cream-alt"
            }`}
          >
            {opt.Icon && <opt.Icon size={12} />}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  icon?: ComponentType<{ size?: number }>;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${value ? "bg-green" : "bg-ink/15"}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? "left-5" : "left-0.5"}`} />
      </div>
      {Icon && <Icon size={14} />}
      <span className="font-accent font-bold text-xs uppercase">{label}</span>
    </label>
  );
}

interface SharedSettingsProps {
  settings: ModularSettings;
  updateSetting: <K extends keyof ModularSettings>(key: K, value: ModularSettings[K]) => void;
  activePreset: string | null;
  applyPreset: (preset: Preset) => void;
  startAt: string;
  setStartAt: (v: string) => void;
  endAt: string;
  setEndAt: (v: string) => void;
  accessCode: string;
  setAccessCode: (v: string) => void;
  poolSize: string;
  setPoolSize: (v: string) => void;
  showCount: string;
  setShowCount: (v: string) => void;
}

function SharedSettings({
  settings,
  updateSetting,
  activePreset,
  applyPreset,
  startAt,
  setStartAt,
  endAt,
  setEndAt,
  accessCode,
  setAccessCode,
  poolSize,
  setPoolSize,
  showCount,
  setShowCount,
}: SharedSettingsProps) {
  return (
    <>
      <div>
        <label className="flex items-center gap-1 font-accent font-bold text-white uppercase text-sm mb-2">
          <Settings size={14} /> Quick Presets
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`p-3 rounded-[var(--radius-btn)] border-2 border-ink/10 text-left transition-all ${
                activePreset === preset.name ? "bg-ink text-white" : "bg-white hover:bg-cream-alt text-ink"
              }`}
            >
              <span className="font-accent font-bold text-sm flex items-center gap-1.5">
                <preset.Icon size={14} /> {preset.name}
              </span>
              <span className="text-xs opacity-70 block mt-0.5">{preset.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[var(--radius-card-sm)] p-4 space-y-4">
        <h3 className="font-accent font-bold uppercase text-sm border-b border-ink/10 pb-2 flex items-center gap-1.5">
          <Calendar size={14} /> Schedule &amp; Access
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="flex items-center gap-1 font-accent font-bold text-xs uppercase mb-1">
              <Calendar size={14} /> Start At (optional)
            </label>
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="input-tactile" />
          </div>
          <div>
            <label className="flex items-center gap-1 font-accent font-bold text-xs uppercase mb-1">
              <Calendar size={14} /> End At (optional)
            </label>
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="input-tactile" />
          </div>
        </div>
        <div>
          <label className="flex items-center gap-1 font-accent font-bold text-xs uppercase mb-1">
            <Key size={14} /> Access Code / PIN (optional)
          </label>
          <input
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            className="input-tactile"
            placeholder="Leave blank for open access"
            maxLength={20}
          />
        </div>
      </div>

      <div className="bg-white rounded-[var(--radius-card-sm)] p-4 space-y-4">
        <h3 className="font-accent font-bold uppercase text-sm border-b border-ink/10 pb-2 flex items-center gap-1.5">
          <Layers size={14} /> Question Pool (optional)
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="font-accent font-bold text-xs uppercase mb-1 block">Pool Size (total questions)</label>
            <input type="number" value={poolSize} onChange={(e) => setPoolSize(e.target.value)} className="input-tactile" placeholder="e.g. 50" min="1" />
            <p className="text-xs text-ink/40 mt-1">Leave blank to use all questions.</p>
          </div>
          <div>
            <label className="font-accent font-bold text-xs uppercase mb-1 block">Show Count (shown per user)</label>
            <input type="number" value={showCount} onChange={(e) => setShowCount(e.target.value)} className="input-tactile" placeholder="e.g. 20" min="1" />
            <p className="text-xs text-ink/40 mt-1">Randomly picks this many from pool.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[var(--radius-card-sm)] p-4 space-y-5">
        <h3 className="font-accent font-bold uppercase text-sm border-b border-ink/10 pb-2 flex items-center gap-1.5">
          <Settings size={14} /> Quiz Configuration
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <SettingSelect
            label="Timer"
            icon={Clock}
            value={settings.timer}
            onChange={(v) => updateSetting("timer", v)}
            options={[
              { value: "global", label: "Global", Icon: Clock },
              { value: "per_question", label: "Per-Question", Icon: Zap },
              { value: "none", label: "None", Icon: Ban },
            ]}
          />
          {settings.timer === "global" && (
            <div>
              <label className="font-accent font-bold text-xs uppercase mb-1 block">Duration (min)</label>
              <input
                type="number"
                value={settings.duration}
                min={1}
                max={180}
                onChange={(e) => updateSetting("duration", parseInt(e.target.value) || 60)}
                className="input-tactile"
              />
            </div>
          )}
          {settings.timer === "per_question" && (
            <div>
              <label className="font-accent font-bold text-xs uppercase mb-1 block">Seconds / Question</label>
              <input
                type="number"
                value={settings.secondsPerQuestion}
                min={5}
                max={300}
                onChange={(e) => updateSetting("secondsPerQuestion", parseInt(e.target.value) || 30)}
                className="input-tactile"
              />
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SettingSelect
            label="Question Display"
            icon={Eye}
            value={settings.visibility}
            onChange={(v) => updateSetting("visibility", v)}
            options={[
              { value: "single", label: "Single", Icon: AlignJustify },
              { value: "all", label: "All Visible", Icon: Layers },
            ]}
          />
          <SettingSelect
            label="Navigation"
            icon={Navigation2}
            value={settings.navigation}
            onChange={(v) => updateSetting("navigation", v)}
            options={[
              { value: "free", label: "Free", Icon: ArrowLeftRight },
              { value: "forward_only", label: "Forward Only", Icon: ArrowRight },
              { value: "sequential_locked", label: "Seq. Locked", Icon: Lock },
            ]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SettingSelect
            label="Answer Lock"
            icon={Lock}
            value={settings.answerLock}
            onChange={(v) => updateSetting("answerLock", v)}
            options={[
              { value: "changeable", label: "Changeable", Icon: Pencil },
              { value: "lock_on_select", label: "Lock on Select", Icon: Lock },
              { value: "lock_on_next", label: "Lock on Next", Icon: SkipForward },
            ]}
          />
          <SettingSelect
            label="Tab Switch"
            icon={AlertTriangle}
            value={settings.tabSwitch}
            onChange={(v) => updateSetting("tabSwitch", v)}
            options={[
              { value: "auto_submit", label: "Auto-Submit", Icon: Siren },
              { value: "three_strikes", label: "3 Strikes", Icon: AlertTriangle },
              { value: "disabled", label: "Allowed", Icon: Check },
            ]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="flex items-center gap-1 font-accent font-bold text-xs uppercase mb-1">
              <Hash size={14} /> Points / Correct
            </label>
            <input
              type="number"
              value={settings.pointsPerCorrect}
              min={1}
              max={100}
              onChange={(e) => updateSetting("pointsPerCorrect", parseInt(e.target.value) || 1)}
              className="input-tactile"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 font-accent font-bold text-xs uppercase mb-1">
              <AlertCircle size={14} /> Negative Marking (per wrong)
            </label>
            <input
              type="number"
              value={settings.negativeMarking}
              max={0}
              step={0.25}
              onChange={(e) => updateSetting("negativeMarking", parseFloat(e.target.value) || 0)}
              className="input-tactile"
              placeholder="0 = off, -1 = lose 1 pt"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-ink/10">
          <SettingSelect
            label="Quiz Mode"
            icon={Users}
            value={settings.quiz_mode || "individual"}
            onChange={(v) => updateSetting("quiz_mode", v)}
            options={[
              { value: "individual", label: "Individual", Icon: Users },
              { value: "team", label: "Team", Icon: Users },
            ]}
          />
          {settings.quiz_mode === "team" && (
            <div>
              <label className="flex items-center gap-1 font-accent font-bold text-xs uppercase mb-1">
                <Users size={14} /> Max Team Size
              </label>
              <input
                type="number"
                value={settings.max_team_size || 4}
                min={2}
                max={20}
                onChange={(e) => updateSetting("max_team_size", parseInt(e.target.value) || 4)}
                className="input-tactile"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-6 pt-2 border-t border-ink/10">
          <SettingToggle label="Shuffle Questions" icon={Shuffle} value={settings.shuffleQuestions} onChange={(v) => updateSetting("shuffleQuestions", v)} />
          <SettingToggle label="Shuffle Options" icon={Shuffle} value={settings.shuffleOptions} onChange={(v) => updateSetting("shuffleOptions", v)} />
          <SettingToggle label="Copy Protection" icon={Copy} value={settings.copyProtection} onChange={(v) => updateSetting("copyProtection", v)} />
        </div>
      </div>
    </>
  );
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq_single: "Single Correct",
  mcq_multi: "Multi Correct",
  fill_blank: "Fill in the Blank",
  match_columns: "Match the Columns",
};

/** Type-aware answer-key preview for one question — added 2026-07-23 alongside AI multi-type parsing. */
function QuestionPreviewBody({ question }: { question: QuizQuestion }) {
  switch (questionType(question)) {
    case "mcq_single": {
      const q = question as McqSingleQuestion;
      return (
        <>
          {q.options.map((opt, j) => (
            <div
              key={j}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-[var(--radius-chip)] font-accent font-bold ${opt === q.answer ? "bg-green" : "bg-white border border-ink/10"}`}
            >
              {opt === q.answer && <Check size={12} />} {opt}
            </div>
          ))}
        </>
      );
    }
    case "mcq_multi": {
      const q = question as McqMultiQuestion;
      return (
        <>
          {q.options.map((opt, j) => (
            <div
              key={j}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-[var(--radius-chip)] font-accent font-bold ${q.answers.includes(opt) ? "bg-green" : "bg-white border border-ink/10"}`}
            >
              {q.answers.includes(opt) && <Check size={12} />} {opt}
            </div>
          ))}
        </>
      );
    }
    case "fill_blank": {
      const q = question as FillBlankQuestion;
      return (
        <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-[var(--radius-chip)] font-accent font-bold bg-green">
          <Check size={12} /> {q.answer}
        </div>
      );
    }
    case "match_columns": {
      const q = question as MatchColumnsQuestion;
      return (
        <div className="space-y-1">
          {q.pairs.map((pair, j) => (
            <div key={j} className="flex items-center gap-2 text-xs font-accent font-bold">
              <span className="px-2 py-1 rounded-[var(--radius-chip)] bg-white border border-ink/10">{pair.left}</span>
              <ArrowLeftRight size={12} className="text-ink/40 shrink-0" />
              <span className="px-2 py-1 rounded-[var(--radius-chip)] bg-green">{pair.right}</span>
            </div>
          ))}
        </div>
      );
    }
  }
}

function QuestionPreview({ questions, onClear }: { questions: QuizQuestion[]; onClear: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="bg-white rounded-[var(--radius-card-sm)] p-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="font-accent font-bold text-sm uppercase text-ink flex items-center gap-1">
          <CheckCircle size={14} className="text-green" />
          {questions.length} questions generated
        </p>
        <button type="button" onClick={onClear} className="text-xs font-accent font-bold text-coral underline">
          Clear &amp; regenerate
        </button>
      </div>
      {questions.map((q, i) => (
        <div key={i} className="rounded-[var(--radius-btn)] border-2 border-ink/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full flex items-center justify-between gap-2 p-2 text-left text-ink bg-cream hover:bg-cream-alt transition-colors"
          >
            <span className="font-accent font-bold text-xs truncate flex-1">
              Q{i + 1}: {q.text}
            </span>
            <span className="shrink-0 text-[10px] font-accent font-bold uppercase px-2 py-0.5 rounded-[var(--radius-chip)] bg-purple text-white">
              {QUESTION_TYPE_LABELS[questionType(q)]}
            </span>
            {expanded === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded === i && (
            <div className="p-3 space-y-1">
              <QuestionPreviewBody question={q} />
              {q.explanation && <p className="text-xs text-ink/50 mt-1 italic">{q.explanation}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Ported from client/src/components/admin/QuizUploader.jsx. Shared between
// /admin and /teacher. Both tabs post to Phase 3 routes not built yet
// (`/api/admin/quizzes/upload`, `/api/ai/generate-quiz`, `/api/admin/quizzes/create`)
// — the AI tab is implemented in full now per explicit instruction, even
// though GROQ_API_KEY isn't configured yet (added later, at which point this
// activates with zero code changes needed).
export function QuizUploader({ fetchQuizzes }: { fetchQuizzes: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<"upload" | "ai" | "ai-parse">("upload");

  const [aiTopic, setAiTopic] = useState("");
  const [aiSyllabus, setAiSyllabus] = useState("");
  const [aiCount, setAiCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[] | null>(null);

  const [parseFile, setParseFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<QuizQuestion[] | null>(null);

  const [quizFile, setQuizFile] = useState<File | null>(null);

  const [quizTitle, setQuizTitle] = useState("");
  const [settings, setSettings] = useState<ModularSettings>({ ...DEFAULT_SETTINGS });
  const [activePreset, setActivePreset] = useState<string | null>("Exam Mode");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [poolSize, setPoolSize] = useState("");
  const [showCount, setShowCount] = useState("");

  const updateSetting = <K extends keyof ModularSettings>(key: K, value: ModularSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setActivePreset(null);
  };

  const applyPreset = (preset: Preset) => {
    setSettings({ ...preset.settings });
    setActivePreset(preset.name);
  };

  const resetShared = () => {
    setQuizTitle("");
    setSettings({ ...DEFAULT_SETTINGS });
    setActivePreset("Exam Mode");
    setStartAt("");
    setEndAt("");
    setAccessCode("");
    setPoolSize("");
    setShowCount("");
  };

  const sharedSettingsProps: SharedSettingsProps = {
    settings,
    updateSetting,
    activePreset,
    applyPreset,
    startAt,
    setStartAt,
    endAt,
    setEndAt,
    accessCode,
    setAccessCode,
    poolSize,
    setPoolSize,
    showCount,
    setShowCount,
  };

  const handleUploadQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizFile) return;
    const formData = new FormData();
    formData.append("quizFile", quizFile);
    formData.append("title", quizTitle);
    Object.entries(settings).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    if (startAt) formData.append("startAt", startAt);
    if (endAt) formData.append("endAt", endAt);
    if (accessCode) formData.append("accessCode", accessCode);
    if (poolSize) formData.append("poolSize", poolSize);
    if (showCount) formData.append("showCount", showCount);
    try {
      const data = await apiFetch<{ questionCount: number }>("/api/admin/quizzes/upload", { method: "POST", body: formData });
      toast.success(`Quiz created! ${data.questionCount} questions parsed.`);
      setQuizFile(null);
      resetShared();
      fetchQuizzes();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to upload quiz"));
    }
  };

  const handleGenerate = async () => {
    if (!aiTopic.trim()) return;
    setGenerating(true);
    setGeneratedQuestions(null);
    try {
      const data = await apiFetch<{ questions: QuizQuestion[] }>("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic.trim(), syllabus: aiSyllabus.trim() || undefined, count: aiCount }),
      });
      setGeneratedQuestions(data.questions);
      if (!quizTitle) setQuizTitle(aiTopic.trim());
      toast.success(`${data.questions.length} questions generated!`);
    } catch (err) {
      toast.error(errorMessage(err, "AI generation failed"));
    } finally {
      setGenerating(false);
    }
  };

  const createQuizFromQuestions = async (questions: QuizQuestion[], onSuccess: () => void) => {
    if (!questions.length || !quizTitle) return;
    const finalSettings = {
      ...settings,
      startAt: startAt || null,
      endAt: endAt || null,
      accessCode: accessCode || null,
      poolSize: parseInt(poolSize) || null,
      showCount: parseInt(showCount) || null,
    };
    try {
      const data = await apiFetch<{ questionCount: number }>("/api/admin/quizzes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: quizTitle, questions, settings: finalSettings }),
      });
      toast.success(`Quiz created! ${data.questionCount} questions.`);
      onSuccess();
      resetShared();
      fetchQuizzes();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to create quiz"));
    }
  };

  const handleCreateFromAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatedQuestions?.length) return;
    await createQuizFromQuestions(generatedQuestions, () => {
      setGeneratedQuestions(null);
      setAiTopic("");
      setAiSyllabus("");
      setAiCount(10);
    });
  };

  const handleParseDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parseFile) return;
    setParsing(true);
    setParsedQuestions(null);
    try {
      const formData = new FormData();
      formData.append("quizFile", parseFile);
      const data = await apiFetch<{ questions: QuizQuestion[] }>("/api/ai/parse-quiz-doc", { method: "POST", body: formData });
      setParsedQuestions(data.questions);
      toast.success(`${data.questions.length} questions parsed!`);
    } catch (err) {
      toast.error(errorMessage(err, "AI document parsing failed"));
    } finally {
      setParsing(false);
    }
  };

  const handleCreateFromParsed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedQuestions?.length) return;
    await createQuizFromQuestions(parsedQuestions, () => {
      setParsedQuestions(null);
      setParseFile(null);
    });
  };

  return (
    <section className="card-tactile bg-purple text-white p-6 sm:p-8">
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`flex items-center gap-2 px-4 py-2 font-accent font-bold text-sm rounded-[var(--radius-btn)] border-2 border-white/40 transition-all ${
            tab === "upload" ? "bg-white text-purple" : "bg-transparent text-white hover:bg-white/20"
          }`}
        >
          <Upload size={16} /> Upload File
        </button>
        <button
          type="button"
          onClick={() => setTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 font-accent font-bold text-sm rounded-[var(--radius-btn)] border-2 border-white/40 transition-all ${
            tab === "ai" ? "bg-white text-purple" : "bg-transparent text-white hover:bg-white/20"
          }`}
        >
          <Sparkles size={16} /> AI Generate
        </button>
        <button
          type="button"
          onClick={() => setTab("ai-parse")}
          className={`flex items-center gap-2 px-4 py-2 font-accent font-bold text-sm rounded-[var(--radius-btn)] border-2 border-white/40 transition-all ${
            tab === "ai-parse" ? "bg-white text-purple" : "bg-transparent text-white hover:bg-white/20"
          }`}
        >
          <FileSearch size={16} /> AI Parse Document
        </button>
      </div>

      <h2 className="mb-6 flex items-center gap-2 text-xl font-display">
        {tab === "ai" ? (
          <>
            <Sparkles /> AI Quiz Generator
          </>
        ) : tab === "ai-parse" ? (
          <>
            <FileSearch /> AI Document Parser
          </>
        ) : (
          <>
            <Upload /> Upload Quiz
          </>
        )}
      </h2>

      {tab === "upload" && (
        <form onSubmit={handleUploadQuiz} className="space-y-6 text-ink">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-accent font-bold text-white uppercase text-sm mb-1">Quiz Title</label>
              <input type="text" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} className="input-tactile" placeholder="e.g. C Programming Final" required />
            </div>
            <div>
              <label className="block font-accent font-bold text-white uppercase text-sm mb-1">Quiz File (.md, .txt, .docx)</label>
              <input
                type="file"
                accept=".md,.markdown,.txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setQuizFile(e.target.files?.[0] ?? null)}
                className="w-full cursor-pointer bg-white rounded-[var(--radius-btn)] p-2 file:mr-4 file:border-0 file:rounded-[var(--radius-btn)] file:bg-ink file:px-4 file:py-2 file:text-white file:font-accent file:font-bold"
                required
              />
            </div>
          </div>

          <SharedSettings {...sharedSettingsProps} />

          <button className="btn-tactile w-full justify-center bg-green text-ink text-lg py-3">Upload &amp; Create Quiz</button>
        </form>
      )}

      {tab === "ai" && (
        <div className="space-y-5 text-ink">
          <div className="bg-white rounded-[var(--radius-card-sm)] p-4 space-y-4">
            <h3 className="font-accent font-bold uppercase text-sm border-b border-ink/10 pb-2">Quiz Topic</h3>
            <div>
              <label className="block font-accent font-bold text-xs uppercase mb-1">Topic *</label>
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="input-tactile"
                placeholder="e.g. Python Data Structures, World War II, Calculus Derivatives"
              />
            </div>
            <div>
              <label className="block font-accent font-bold text-xs uppercase mb-1">Syllabus / Context (optional)</label>
              <textarea
                value={aiSyllabus}
                onChange={(e) => setAiSyllabus(e.target.value)}
                className="input-tactile h-28 resize-y text-sm"
                placeholder="Paste your syllabus, chapter notes, or specific areas to focus on…"
              />
            </div>
            <div>
              <label className="block font-accent font-bold text-xs uppercase mb-2">Number of Questions</label>
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 15, 20, 25].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAiCount(n)}
                    className={`px-4 py-2 text-sm font-accent font-bold rounded-[var(--radius-btn)] border-2 border-ink/10 transition-all ${
                      aiCount === n ? "bg-ink text-white" : "bg-white hover:bg-cream-alt"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !aiTopic.trim()}
              className="btn-tactile bg-blue text-white w-full justify-center py-3 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader size={18} className="animate-spin" /> Generating {aiCount} questions…
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Generate Questions
                </>
              )}
            </button>
          </div>

          {generatedQuestions && (
            <QuestionPreview
              questions={generatedQuestions}
              onClear={() => {
                setGeneratedQuestions(null);
                setQuizTitle("");
              }}
            />
          )}

          {generatedQuestions && (
            <form onSubmit={handleCreateFromAI} className="space-y-5">
              <div className="bg-white rounded-[var(--radius-card-sm)] p-4">
                <label className="block font-accent font-bold text-white uppercase text-sm mb-1">Quiz Title *</label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="input-tactile"
                  placeholder="e.g. Python Data Structures Quiz"
                  required
                />
              </div>

              <SharedSettings {...sharedSettingsProps} />

              <button type="submit" className="btn-tactile w-full justify-center bg-green text-ink text-lg py-3">
                <Sparkles size={20} /> Create AI Quiz ({generatedQuestions.length} questions)
              </button>
            </form>
          )}
        </div>
      )}

      {tab === "ai-parse" && (
        <div className="space-y-5 text-ink">
          <div className="bg-white rounded-[var(--radius-card-sm)] p-4 space-y-4">
            <h3 className="font-accent font-bold uppercase text-sm border-b border-ink/10 pb-2">Upload Quiz Document</h3>
            <p className="text-xs text-ink/60">
              AI reads your document and automatically detects each question&apos;s type — single-correct MCQ, multi-correct MCQ,
              fill-in-the-blank, or match-the-columns — and extracts the matching answer key. Review the results below before creating the quiz.
            </p>
            <div>
              <label className="block font-accent font-bold text-xs uppercase mb-1">Quiz File (.md, .txt, .docx)</label>
              <input
                type="file"
                accept=".md,.markdown,.txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setParseFile(e.target.files?.[0] ?? null)}
                className="w-full cursor-pointer bg-cream rounded-[var(--radius-btn)] p-2 file:mr-4 file:border-0 file:rounded-[var(--radius-btn)] file:bg-ink file:px-4 file:py-2 file:text-white file:font-accent file:font-bold"
              />
            </div>
            <button
              type="button"
              onClick={handleParseDocument}
              disabled={parsing || !parseFile}
              className="btn-tactile bg-blue text-white w-full justify-center py-3 disabled:opacity-50"
            >
              {parsing ? (
                <>
                  <Loader size={18} className="animate-spin" /> Parsing document…
                </>
              ) : (
                <>
                  <FileSearch size={18} /> Parse with AI
                </>
              )}
            </button>
          </div>

          {parsedQuestions && (
            <QuestionPreview
              questions={parsedQuestions}
              onClear={() => {
                setParsedQuestions(null);
                setParseFile(null);
              }}
            />
          )}

          {parsedQuestions && (
            <form onSubmit={handleCreateFromParsed} className="space-y-5">
              <div className="bg-white rounded-[var(--radius-card-sm)] p-4">
                <label className="block font-accent font-bold text-white uppercase text-sm mb-1">Quiz Title *</label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="input-tactile"
                  placeholder="e.g. C Programming Final"
                  required
                />
              </div>

              <SharedSettings {...sharedSettingsProps} />

              <button type="submit" className="btn-tactile w-full justify-center bg-green text-ink text-lg py-3">
                <FileSearch size={20} /> Create Quiz ({parsedQuestions.length} questions)
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
