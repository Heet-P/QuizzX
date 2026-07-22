"use client";

import { useState, useEffect, useCallback } from "react";
import type { QuizSettings } from "@/types/quiz";

interface UseQuizCheatingArgs {
  quiz: unknown;
  settings: QuizSettings;
  submitted: boolean;
  showRules: boolean;
  id: string;
  handleAutoSubmit: () => void;
}

// Ported from client/src/hooks/useQuizCheating.js. Calls POST /api/submissions/events,
// which doesn't exist yet (Phase 3) — logging calls will 404 silently (caught) until
// then; the tab-switch/fullscreen detection logic itself works independently of that.
export function useQuizCheating({ quiz, settings, submitted, showRules, id, handleAutoSubmit }: UseQuizCheatingArgs) {
  const [tabSwitched, setTabSwitched] = useState(false);
  const [tabStrikes, setTabStrikes] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const logEvent = useCallback(
    (eventType: string, eventData: Record<string, unknown> = {}) => {
      if (!id || !quiz) return;
      fetch("/api/submissions/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: id, eventType, eventData }),
      }).catch(() => {});
    },
    [id, quiz]
  );

  useEffect(() => {
    if (!quiz || !settings.copyProtection || submitted || showRules) return;
    const handleCopy = () => logEvent("copy_attempt");
    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, [quiz, settings.copyProtection, submitted, showRules, logEvent]);

  useEffect(() => {
    if (!quiz || settings.tabSwitch === "disabled" || submitted || showRules) return;

    const handleVisibilityChange = () => {
      if (!document.hidden || submitted) return;

      logEvent("tab_switch");

      if (settings.tabSwitch === "auto_submit") {
        setTabSwitched(true);
        handleAutoSubmit();
      } else if (settings.tabSwitch === "three_strikes") {
        setTabStrikes((prev) => {
          const newStrikes = prev + 1;
          if (newStrikes >= 3) {
            setTabSwitched(true);
            handleAutoSubmit();
          }
          return newStrikes;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [quiz, settings.tabSwitch, submitted, showRules, handleAutoSubmit, logEvent]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!(document.fullscreenElement || (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement);
      setIsFullscreen(inFullscreen);
      if (!inFullscreen && !submitted && !showRules && quiz && settings.tabSwitch !== "disabled") {
        logEvent("fullscreen_exit");
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [submitted, showRules, quiz, settings.tabSwitch, logEvent]);

  useEffect(() => {
    if (!submitted) return;
    document.body.style.overflow = "";
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if ((document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement) {
      (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
    }
  }, [submitted]);

  const fullscreenSupported =
    typeof document !== "undefined" &&
    !!(document.fullscreenEnabled || (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled);

  const requestFs = (el: HTMLElement) => {
    if (el.requestFullscreen) return el.requestFullscreen();
    const webkitEl = el as unknown as { webkitRequestFullscreen?: () => Promise<void> };
    if (webkitEl.webkitRequestFullscreen) return webkitEl.webkitRequestFullscreen();
    return Promise.reject(new Error("not_supported"));
  };

  const startQuiz = async (): Promise<boolean> => {
    if (!fullscreenSupported) {
      document.body.style.overflow = "hidden";
      setIsFullscreen(true);
      return true;
    }
    try {
      await requestFs(document.documentElement);
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === "not_supported") {
        document.body.style.overflow = "hidden";
        setIsFullscreen(true);
        return true;
      }
      return false;
    }
  };

  const reEnterFullscreen = async () => {
    if (!fullscreenSupported) return;
    try {
      await requestFs(document.documentElement);
    } catch {
      // Denied — user stays on the "return to fullscreen" prompt.
    }
  };

  return { tabSwitched, tabStrikes, isFullscreen, startQuiz, reEnterFullscreen, logEvent };
}
