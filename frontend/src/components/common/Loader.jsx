import React from "react";

/**
 * Universal va Moslashuvchan Yashil (Green) Loader Komponenti.
 * 
 * Talablar bo'yicha:
 * - Yashil rang (#10b981, #34d399, #059669)
 * - Orqa fon 5px blur (backdrop-filter: blur(5px))
 * - Har qanday sahifa, qism, karta yoki tugmaga to'liq moslashuvchan.
 *
 * @param {Object} props
 * @param {'fullscreen'|'overlay'|'block'|'inline'} [props.variant='overlay']
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @param {string} [props.text='Yuklanmoqda...']
 * @param {string} [props.subtext]
 * @param {string} [props.blur='5px']
 * @param {boolean} [props.showDots=true]
 * @param {boolean} [props.showProgress=false]
 * @param {boolean} [props.showInnerRing=true]
 * @param {boolean} [props.showHalo=true]
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 */
export default function Loader({
  variant = "overlay",
  size = "md",
  text = "Yuklanmoqda...",
  subtext,
  blur = "5px",
  showDots = true,
  showProgress = false,
  showInnerRing = true,
  showHalo = true,
  children,
  className = "",
  style = {},
}) {
  const isInline = variant === "inline";
  const isXsOrSm = size === "xs" || size === "sm";

  // Orqa fon 5px blur uslubi
  const containerStyle = {
    ...style,
  };

  if (!isInline && blur) {
    containerStyle.backdropFilter = `blur(${blur})`;
    containerStyle.WebkitBackdropFilter = `blur(${blur})`;
  }

  // SVG halqa o'lchamlari
  const viewBoxSize = 50;
  const strokeWidth = size === "xs" ? 5 : size === "sm" ? 4.5 : 4;
  const radius = (viewBoxSize - strokeWidth) / 2;
  const center = viewBoxSize / 2;

  return (
    <div
      className={`app-loader app-loader--${variant} app-loader--size-${size} ${className}`}
      style={containerStyle}
      role="status"
      aria-live="polite"
      aria-label={typeof text === "string" ? text : "Yuklanmoqda"}
    >
      <div className="app-loader__box">
        {/* Yashil Aylanuvchi Spinner Halqasi */}
        <div className="app-loader__spinner-wrapper">
          {/* Yashil nurli aura (faqat kattaroq o'lchamlarda) */}
          {showHalo && !isXsOrSm && <div className="app-loader__halo" />}

          {/* SVG aylanuvchi yashil indikator */}
          <svg
            className="app-loader__svg"
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="app-loader__track"
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
            />
            <circle
              className="app-loader__indicator"
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
            />
          </svg>

          {/* Qarama-qarshi aylanuvchi ichki yashil mikro-halqa */}
          {showInnerRing && !isXsOrSm && <div className="app-loader__inner-ring" />}

          {/* Markazdagi yorqin yashil yadro */}
          {!isXsOrSm && <div className="app-loader__core" />}
        </div>

        {/* Matnlar qismi */}
        {(text || subtext) && (
          <div className="app-loader__content">
            {text && (
              <p className="app-loader__title">
                <span>{text}</span>
                {showDots && !isInline && (
                  <span className="app-loader__dots" aria-hidden="true">
                    <span className="app-loader__dot" />
                    <span className="app-loader__dot" />
                    <span className="app-loader__dot" />
                  </span>
                )}
              </p>
            )}

            {subtext && !isInline && (
              <p className="app-loader__subtext">{subtext}</p>
            )}

            {/* Ixtiyoriy yashil progress bar */}
            {showProgress && !isInline && (
              <div className="app-loader__progress-bar">
                <div className="app-loader__progress-fill" />
              </div>
            )}
          </div>
        )}

        {/* Maxsus bolalar komponentlari (masalan bekor qilish tugmasi) */}
        {children && <div className="app-loader__extra">{children}</div>}
      </div>
    </div>
  );
}

/**
 * Sahifa / Butun Ekranni 5px blur bilan qoplovchi yashil loader
 */
export function PageLoader({ text = "Yuklanmoqda...", subtext, blur = "5px", ...rest }) {
  return (
    <Loader
      variant="fullscreen"
      size="lg"
      text={text}
      subtext={subtext}
      blur={blur}
      {...rest}
    />
  );
}

/**
 * Kartochka, Jadval yoki Panel ichidagi 5px blur overlay loader
 */
export function CardLoader({ text = "Yangilanmoqda...", subtext, blur = "5px", ...rest }) {
  return (
    <Loader
      variant="overlay"
      size="md"
      text={text}
      subtext={subtext}
      blur={blur}
      {...rest}
    />
  );
}

/**
 * Sahifa tarkibidagi mustaqil blok loader (5px blur fonli card)
 */
export function BlockLoader({ text = "Ma'lumotlar yuklanmoqda...", subtext, blur = "5px", ...rest }) {
  return (
    <Loader
      variant="block"
      size="md"
      text={text}
      subtext={subtext}
      blur={blur}
      {...rest}
    />
  );
}

/**
 * Tugma ichidagi ixcham yashil spinner
 */
export function ButtonLoader({ text, size = "xs", ...rest }) {
  return (
    <Loader
      variant="inline"
      size={size}
      text={text}
      showDots={false}
      showInnerRing={false}
      showHalo={false}
      {...rest}
    />
  );
}

/**
 * Inline matn yoni spinner
 */
export function InlineLoader({ text, size = "xs", ...rest }) {
  return (
    <Loader
      variant="inline"
      size={size}
      text={text}
      showDots={false}
      showInnerRing={false}
      showHalo={false}
      {...rest}
    />
  );
}
