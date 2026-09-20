const paths = {
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="4" /></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  warning: <><path d="m12 3 10 18H2zM12 9v5" /><path d="M12 17h.01" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  plus: <path d="M12 4v16M4 12h16" />,
  volume: <><path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  play: <path d="m7 4 14 8-14 8z" />,
  stop: <rect x="5" y="5" width="14" height="14" rx="1" />,
  history: <><path d="M3 5v5h5M3 10a9 9 0 1 1 0 5M12 7v5l3 2" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
  scan: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M6 9h12M6 13h8M6 17h5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  minus: <path d="M5 12h14" />,
  question: <><path d="M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 3M12 18h.01" /></>,
  offline: <><path d="m3 3 18 18M2 8a16 16 0 0 1 3-2m4-2a16 16 0 0 1 13 4M5 12a11 11 0 0 1 3-2m6-1a11 11 0 0 1 5 3M8 16a6 6 0 0 1 7-1M12 20h.01" /></>,
  pin: <><path d="M9 3h6l-1 5 3 3v2H7v-2l3-3zM12 13v8" /></>,
  edit: <><path d="M4 20h4l11-11-4-4L4 16zM13.5 6.5l4 4" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  eye: <><path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.25" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 7.1A10.7 10.7 0 0 1 12 7c6.1 0 9.5 5 9.5 5a15.9 15.9 0 0 1-3 3.4M14.2 14.2A3 3 0 0 1 9.8 9.8M6.1 6.1C3.7 7.7 2.5 12 2.5 12s3.4 5 9.5 5c1.5 0 2.8-.3 4-.8" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  sidebarOpen: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M13 9l3 3-3 3" /></>,
  logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></>
};
export default function Icon({
  name,
  size = 20,
  className = ''
}) {
  return <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.info}</svg>;
}
