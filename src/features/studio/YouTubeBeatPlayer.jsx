import { useEffect, useRef } from 'react';

let youtubeApiPromise;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        resolve(window.YT);
        previousCallback?.();
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        youtubeApiPromise = null;
        reject(new Error('YouTube player could not be loaded.'));
      };
      document.head.appendChild(script);
    });
  }
  return youtubeApiPromise;
}

export function YouTubeBeatPlayer({ videoId, onReady, onEnded, onPaused, onError }) {
  const container = useRef(null);
  const player = useRef(null);
  const callbacks = useRef({ onReady, onEnded, onError });
  callbacks.current = { onReady, onEnded, onPaused, onError };

  useEffect(() => {
    let active = true;
    loadYouTubeApi()
      .then((youtube) => {
        if (!active || !container.current) return;
        player.current = new youtube.Player(container.current, {
          width: '100%',
          height: '100%',
          videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
          events: {
            onReady: (event) => callbacks.current.onReady(event.target),
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) callbacks.current.onEnded();
              if (event.data === window.YT.PlayerState.PAUSED) callbacks.current.onPaused();
            },
            onError: (event) => callbacks.current.onError(event.data),
          },
        });
      })
      .catch(() => { if (active) callbacks.current.onError(null); });

    return () => {
      active = false;
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId]);

  return <div className="youtube-beat-player" ref={container} />;
}
