export default function InfinityLoader() {
  return (
    <div className="infinity-loader" aria-live="polite" role="status">
      <svg
        className="infinity-loader__svg"
        viewBox="0 0 220 120"
        width="200"
        height="110"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="infinityGradient" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#1376FF" />
            <stop offset="100%" stopColor="#7BE0FF" />
          </linearGradient>
        </defs>
        <path
          className="infinity-loader__base"
          d="M30 60c0-19.33 15.67-35 35-35 14.403 0 27.284 8.808 34.5 21.5 7.216-12.692 20.097-21.5 34.5-21.5 19.33 0 35 15.67 35 35s-15.67 35-35 35c-14.403 0-27.284-8.808-34.5-21.5C92.284 86.192 79.403 95 65 95 45.67 95 30 79.33 30 60Z"
        />
        <path
          className="infinity-loader__highlight"
          d="M30 60c0-19.33 15.67-35 35-35 14.403 0 27.284 8.808 34.5 21.5 7.216-12.692 20.097-21.5 34.5-21.5 19.33 0 35 15.67 35 35s-15.67 35-35 35c-14.403 0-27.284-8.808-34.5-21.5C92.284 86.192 79.403 95 65 95 45.67 95 30 79.33 30 60Z"
        />
      </svg>
      <span className="infinity-loader__label">LOADING</span>
    </div>
  );
}

