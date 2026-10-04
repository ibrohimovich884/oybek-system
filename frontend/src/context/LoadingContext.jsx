import React, { createContext, useContext, useState, useCallback } from "react";
import Loader from "../components/common/Loader.jsx";

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [loadingState, setLoadingState] = useState({
    active: false,
    variant: "fullscreen",
    size: "lg",
    text: "Yuklanmoqda...",
    subtext: "",
    blur: "5px",
    showProgress: false,
  });

  const showLoader = useCallback((options = {}) => {
    setLoadingState({
      active: true,
      variant: options.variant || "fullscreen",
      size: options.size || (options.variant === "fullscreen" ? "lg" : "md"),
      text: options.text !== undefined ? options.text : "Yuklanmoqda...",
      subtext: options.subtext || "",
      blur: options.blur || "5px",
      showProgress: Boolean(options.showProgress),
    });
  }, []);

  const hideLoader = useCallback(() => {
    setLoadingState((prev) => ({ ...prev, active: false }));
  }, []);

  const withLoader = useCallback(
    async (asyncFn, options = {}) => {
      showLoader(options);
      try {
        const result = await asyncFn();
        return result;
      } finally {
        hideLoader();
      }
    },
    [showLoader, hideLoader]
  );

  const value = {
    isLoading: loadingState.active,
    showLoader,
    hideLoader,
    withLoader,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {loadingState.active && (
        <Loader
          variant={loadingState.variant}
          size={loadingState.size}
          text={loadingState.text}
          subtext={loadingState.subtext}
          blur={loadingState.blur}
          showProgress={loadingState.showProgress}
        />
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return ctx;
}
