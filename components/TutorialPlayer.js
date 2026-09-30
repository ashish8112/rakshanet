// The tutorial video with a voice-over in English or Hindi (public/tutorial.mp4, public/tutorial-hi.mp4).
// Used in the "Watch video" window and on the public /tutorial page.
"use client";

import { useRef, useState } from "react";

const VIDEO_LANGS = [
  ["en", "English", "/tutorial.mp4"],
  ["hi", "हिंदी", "/tutorial-hi.mp4"],
];

function savedVideoLang() {
  try {
    return localStorage.getItem("rn-video-lang") === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

export default function TutorialPlayer({ autoPlay = true }) {
  const [lang, setLang] = useState(savedVideoLang);
  const resumeAt = useRef(0);
  const videoRef = useRef(null);

  function switchLang(next) {
    if (next === lang) return;
    // Carry on from the same moment in the other language.
    resumeAt.current = videoRef.current ? videoRef.current.currentTime : 0;
    setLang(next);
    try {
      localStorage.setItem("rn-video-lang", next);
    } catch {}
  }

  const src = VIDEO_LANGS.find(([code]) => code === lang)[2];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-2.5">
        <span className="text-sm font-medium text-slate-600">🔊 Voice / आवाज़:</span>
        {VIDEO_LANGS.map(([code, label]) => (
          <button
            key={code}
            onClick={() => switchLang(code)}
            aria-pressed={lang === code}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              lang === code
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <video
        key={lang}
        ref={videoRef}
        src={src}
        poster="/tutorial.jpg"
        controls
        autoPlay={autoPlay}
        playsInline
        onLoadedMetadata={(e) => {
          if (resumeAt.current) e.currentTarget.currentTime = resumeAt.current;
        }}
        className="aspect-video w-full bg-black"
      >
        Your browser cannot play this video.
      </video>
    </div>
  );
}
