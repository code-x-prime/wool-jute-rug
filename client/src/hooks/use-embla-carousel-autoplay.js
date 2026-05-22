import {  useCallback, useEffect, useState } from "react";

const useEmblaCarouselAutoplay = (
  api,
  options = {
    delay: 3000,
    stopOnInteraction: true,
    stopOnMouseEnter: true,
    playOnInit: true,
  }
) => {
  const { delay, stopOnInteraction, stopOnMouseEnter, playOnInit } = options;
  const [isPlaying, setIsPlaying] = useState(playOnInit);
  const [autoplayTimer, setAutoplayTimer] = useState(null);

  const play = useCallback(() => {
    if (!api || autoplayTimer) return;

    setIsPlaying(true);
    const timer = setInterval(() => {
      if (!api.canScrollNext()) {
        api.scrollTo(0);
      } else {
        api.scrollNext();
      }
    }, delay);

    setAutoplayTimer(timer);
  }, [api, delay, autoplayTimer]);

  const stop = useCallback(() => {
    if (!autoplayTimer) return;

    setIsPlaying(false);
    clearInterval(autoplayTimer);
    setAutoplayTimer(null);
  }, [autoplayTimer]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      play();
    }
  }, [isPlaying, play, stop]);

  // Start autoplay when carousel is initialized and playOnInit is true
  useEffect(() => {
    if (!api || !playOnInit) return;
    play();
    return () => stop();
  }, [api, playOnInit, play, stop]);

  // Handle interaction events if stopOnInteraction is true
  useEffect(() => {
    if (!api || !stopOnInteraction) return;

    const handleInteraction = () => {
      stop();
    };

    api.on("pointerDown", handleInteraction);

    return () => {
      api.off("pointerDown", handleInteraction);
    };
  }, [api, stop, stopOnInteraction]);

  // Handle mouse enter/leave events if stopOnMouseEnter is true
  useEffect(() => {
    if (!api || !stopOnMouseEnter) return;

    const rootNode = api.rootNode();

    const handleMouseEnter = () => {
      stop();
    };

    const handleMouseLeave = () => {
      if (playOnInit) {
        play();
      }
    };

    rootNode.addEventListener("mouseenter", handleMouseEnter);
    rootNode.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      rootNode.removeEventListener("mouseenter", handleMouseEnter);
      rootNode.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [api, stop, play, stopOnMouseEnter, playOnInit]);

  return { isPlaying, play, stop, toggle };
};

export default useEmblaCarouselAutoplay;
